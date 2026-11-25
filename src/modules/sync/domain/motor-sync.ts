import { err, ok, type Resultado } from '@/shared/domain/resultado';
import type {
  ArchivosPort,
  ClienteActasRemoto,
  ConectividadPort,
  OperacionSync,
  RelojPort,
  RepositorioOutbox,
  ResultadoRemoto,
} from './sync';
import {
  calcularBackoffMs,
  esAceptado,
  esConflictoResultado,
  esEstadoTerminal,
  esRechazadoPorReemplazo,
} from './sync';

export interface DependenciasMotorSync {
  outbox: RepositorioOutbox;
  remoto: ClienteActasRemoto;
  archivos?: ArchivosPort;
  conectividad?: ConectividadPort;
  reloj?: RelojPort;
  baseBackoffMs?: number;
  topeBackoffMs?: number;
  maxIntentos?: number;
  onEstadoCambiado?: (op: OperacionSync) => void;
}

export interface ResultadoCicloSync {
  procesadas: number;
  errores: number;
  omitidas: number;
}

export class MotorSync {
  private ejecutando = false;

  constructor(private readonly deps: DependenciasMotorSync) {}

  private ahora(): Date {
    return this.deps.reloj?.ahora() ?? new Date();
  }

  private base(): number {
    return this.deps.baseBackoffMs ?? 2000;
  }

  private tope(): number {
    return this.deps.topeBackoffMs ?? 60000;
  }

  async reanudarPendientes(): Promise<void> {
    const ops = await this.deps.outbox.listarPendientes();
    for (const op of ops) {
      if (op.estado === 'SINCRONIZANDO') {
        await this.deps.outbox.actualizar(op.operationId, {
          estado: 'GUARDADA_LOCAL',
          proximoIntentoEn: null,
          actualizadoEn: this.ahora().toISOString(),
        });
      }
    }
  }

  async sincronizarTodo(): Promise<Resultado<ResultadoCicloSync, string>> {
    if (this.ejecutando) {
      return ok({ procesadas: 0, errores: 0, omitidas: 0 });
    }
    if (this.deps.conectividad && !this.deps.conectividad.estaConectado()) {
      return ok({ procesadas: 0, errores: 0, omitidas: 0 });
    }
    this.ejecutando = true;
    try {
      const ops = await this.deps.outbox.listarPendientes();
      let procesadas = 0;
      let errores = 0;
      let omitidas = 0;
      for (const op of ops) {
        if (esEstadoTerminal(op.estado)) {
          omitidas++;
          continue;
        }
        if (op.proximoIntentoEn) {
          const proximo = new Date(op.proximoIntentoEn);
          if (proximo.getTime() > this.ahora().getTime()) {
            omitidas++;
            continue;
          }
        }
        const res = await this.sincronizarOperacion(op.operationId);
        if (res.ok) procesadas++;
        else errores++;
      }
      return ok({ procesadas, errores, omitidas });
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Error al sincronizar.');
    } finally {
      this.ejecutando = false;
    }
  }

  async sincronizarOperacion(operationId: string): Promise<Resultado<OperacionSync, string>> {
    const op = await this.deps.outbox.obtener(operationId);
    if (!op) return err('Operación no encontrada en el outbox.');
    if (esEstadoTerminal(op.estado)) {
      return ok(op);
    }

    await this.deps.outbox.actualizar(operationId, {
      estado: 'SINCRONIZANDO',
      actualizadoEn: this.ahora().toISOString(),
    });
    op.estado = 'SINCRONIZANDO';

    try {
      if (op.tipo === 'REGISTRAR_ACTA') {
        await this.flujoRegistrar(op);
      } else if (op.tipo === 'CORREGIR_ACTA') {
        await this.flujoCorregir(op);
      } else {
        await this.flujoEvidencia(op);
      }
    } catch (e) {
      await this.marcarError(op, e);
    }

    const actualizado = await this.deps.outbox.obtener(operationId);
    if (!actualizado) return err('Operación desapareció del outbox.');
    if (actualizado.estado === 'ERROR') {
      return err(actualizado.ultimoError ?? 'Error de sincronización.');
    }
    return ok(actualizado);
  }

  private async flujoRegistrar(op: OperacionSync): Promise<void> {
    const res = await this.deps.remoto.registrarActa(op.payload);
    if (!res.ok) throw new Error(res.error);
    const r: ResultadoRemoto = res.valor;

    if (esRechazadoPorReemplazo(r)) {
      await this.deps.outbox.actualizar(op.operationId, {
        estado: 'PERMISO_REVOCADO',
        intentos: op.intentos + 1,
        ultimoError: r.detalle ?? 'No aceptado — revisión',
        resultado: r,
        actualizadoEn: this.ahora().toISOString(),
      });
      return;
    }

    if (esConflictoResultado(r)) {
      await this.deps.outbox.actualizar(op.operationId, {
        estado: 'CONFLICTO_VERSION',
        intentos: op.intentos + 1,
        ultimoError: r.detalle ?? 'Conflicto de versión',
        resultado: r,
        actualizadoEn: this.ahora().toISOString(),
      });
      return;
    }

    if (!esAceptado(r) && r.status !== 'RECHAZADO') {
      // Estados inesperados se tratan como error reintentable.
      throw new Error(r.detalle ?? `Resultado inesperado: ${r.status}`);
    }
    if (r.status === 'RECHAZADO') {
      // Rechazo distinto a reemplazo: no reintentar indefinidamente.
      await this.deps.outbox.actualizar(op.operationId, {
        estado: 'PERMISO_REVOCADO',
        intentos: op.intentos + 1,
        ultimoError: r.detalle ?? 'No aceptado — revisión',
        resultado: r,
        actualizadoEn: this.ahora().toISOString(),
      });
      return;
    }

    await this.deps.outbox.actualizar(op.operationId, {
      estado: 'RESULTADO_RECIBIDO',
      intentos: op.intentos + 1,
      resultado: r,
      actualizadoEn: this.ahora().toISOString(),
    });
    op.estado = 'RESULTADO_RECIBIDO';

    // Evidencia: solo si hay foto local y ruta remota.
    if (op.fotoLocalPath && op.fotoRemotaPath) {
      await this.deps.outbox.actualizar(op.operationId, {
        estado: 'EVIDENCIA_PENDIENTE',
        actualizadoEn: this.ahora().toISOString(),
      });
      op.estado = 'EVIDENCIA_PENDIENTE';

      const subida = await this.deps.remoto.subirFoto(op.fotoRemotaPath, op.fotoLocalPath);
      if (!subida.ok) throw new Error(subida.error);

      const conf = await this.deps.remoto.confirmarEvidencia(op.operationId, op.fotoRemotaPath);
      if (!conf.ok) throw new Error(conf.error);
      const cr: ResultadoRemoto = conf.valor;
      if (esConflictoResultado(cr)) {
        await this.deps.outbox.actualizar(op.operationId, {
          estado: 'CONFLICTO_VERSION',
          ultimoError: cr.detalle ?? 'Conflicto de versión',
          resultado: cr,
          actualizadoEn: this.ahora().toISOString(),
        });
        return;
      }
      if (cr.status === 'RECHAZADO') {
        await this.deps.outbox.actualizar(op.operationId, {
          estado: 'PERMISO_REVOCADO',
          ultimoError: cr.detalle ?? 'No aceptado — revisión',
          resultado: cr,
          actualizadoEn: this.ahora().toISOString(),
        });
        return;
      }

      // Confirmación del servidor recibida: recién entonces se borra el archivo local.
      if (this.deps.archivos) {
        try {
          await this.deps.archivos.eliminar(op.fotoLocalPath);
        } catch {
          // No bloquear el estado respaldado por un fallo al borrar el archivo.
        }
      }
      await this.deps.outbox.actualizar(op.operationId, {
        estado: 'EVIDENCIA_RESPALDADA',
        fotoLocalPath: null,
        resultado: cr,
        actualizadoEn: this.ahora().toISOString(),
      });
    } else {
      // Sin foto: el resultado ya fue recibido; se considera respaldado a nivel de datos.
      await this.deps.outbox.actualizar(op.operationId, {
        estado: 'EVIDENCIA_RESPALDADA',
        actualizadoEn: this.ahora().toISOString(),
      });
    }
  }

  private async flujoCorregir(op: OperacionSync): Promise<void> {
    const res = await this.deps.remoto.corregirActa(op.payload);
    if (!res.ok) throw new Error(res.error);
    const r: ResultadoRemoto = res.valor;

    if (esConflictoResultado(r)) {
      await this.deps.outbox.actualizar(op.operationId, {
        estado: 'CONFLICTO_VERSION',
        intentos: op.intentos + 1,
        ultimoError: r.detalle ?? 'Conflicto de versión',
        resultado: r,
        actualizadoEn: this.ahora().toISOString(),
      });
      return;
    }

    if (r.status === 'RECHAZADO') {
      await this.deps.outbox.actualizar(op.operationId, {
        estado: 'PERMISO_REVOCADO',
        intentos: op.intentos + 1,
        ultimoError: r.detalle ?? 'No aceptado — revisión',
        resultado: r,
        actualizadoEn: this.ahora().toISOString(),
      });
      return;
    }

    if (!esAceptado(r)) throw new Error(r.detalle ?? `Resultado inesperado: ${r.status}`);

    await this.deps.outbox.actualizar(op.operationId, {
      estado: 'EVIDENCIA_RESPALDADA',
      intentos: op.intentos + 1,
      resultado: r,
      actualizadoEn: this.ahora().toISOString(),
    });
  }

  private async flujoEvidencia(op: OperacionSync): Promise<void> {
    if (!op.fotoLocalPath || !op.fotoRemotaPath) {
      await this.deps.outbox.actualizar(op.operationId, {
        estado: 'EVIDENCIA_RESPALDADA',
        actualizadoEn: this.ahora().toISOString(),
      });
      return;
    }
    await this.deps.outbox.actualizar(op.operationId, {
      estado: 'EVIDENCIA_PENDIENTE',
      actualizadoEn: this.ahora().toISOString(),
    });
    const subida = await this.deps.remoto.subirFoto(op.fotoRemotaPath, op.fotoLocalPath);
    if (!subida.ok) throw new Error(subida.error);
    const conf = await this.deps.remoto.confirmarEvidencia(op.operationId, op.fotoRemotaPath);
    if (!conf.ok) throw new Error(conf.error);
    const cr = conf.valor;
    if (esConflictoResultado(cr)) {
      await this.deps.outbox.actualizar(op.operationId, { estado: 'CONFLICTO_VERSION', resultado: cr, actualizadoEn: this.ahora().toISOString() });
      return;
    }
    if (cr.status === 'RECHAZADO') {
      await this.deps.outbox.actualizar(op.operationId, { estado: 'PERMISO_REVOCADO', resultado: cr, actualizadoEn: this.ahora().toISOString() });
      return;
    }
    if (this.deps.archivos) {
      try { await this.deps.archivos.eliminar(op.fotoLocalPath); } catch { /* noop */ }
    }
    await this.deps.outbox.actualizar(op.operationId, {
      estado: 'EVIDENCIA_RESPALDADA',
      fotoLocalPath: null,
      resultado: cr,
      actualizadoEn: this.ahora().toISOString(),
    });
  }

  private async marcarError(op: OperacionSync, e: unknown): Promise<void> {
    const intentos = op.intentos + 1;
    const espera = calcularBackoffMs(intentos, this.base(), 2, this.tope());
    const proximo = new Date(this.ahora().getTime() + espera).toISOString();
    await this.deps.outbox.actualizar(op.operationId, {
      estado: 'ERROR',
      intentos,
      proximoIntentoEn: proximo,
      ultimoError: e instanceof Error ? e.message : String(e),
      actualizadoEn: this.ahora().toISOString(),
    });
  }
}

// Factory de conveniencia.
export function crearMotorSync(deps: DependenciasMotorSync): MotorSync {
  return new MotorSync(deps);
}
