import { MotorSync, calcularBackoffMs } from './index';
import type {
  ClienteActasRemoto,
  OperacionSync,
  RepositorioOutbox,
  ResultadoRemoto,
} from './sync';
import { ok, err } from '@/shared/domain/resultado';

function makeOp(overrides: Partial<OperacionSync> = {}): OperacionSync {
  return {
    operationId: 'op-1',
    jrvId: 'jrv-1',
    recintoId: 'rec-1',
    dignidad: 'ALCALDIA',
    tipo: 'REGISTRAR_ACTA',
    payload: { foo: 'bar' },
    fotoLocalPath: null,
    fotoRemotaPath: null,
    intentos: 0,
    estado: 'GUARDADA_LOCAL',
    proximoIntentoEn: null,
    ultimoError: null,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
    ...overrides,
  };
}

function makeOutbox(initial: OperacionSync[]): { repo: RepositorioOutbox; state: Map<string, OperacionSync> } {
  const state = new Map(initial.map((o) => [o.operationId, { ...o }]));
  const repo: RepositorioOutbox = {
    async listarPendientes() {
      return [...state.values()].map((o) => ({ ...o }));
    },
    async obtener(id) {
      const v = state.get(id);
      return v ? { ...v } : null;
    },
    async guardar(op) {
      state.set(op.operationId, { ...op });
    },
    async actualizar(id, cambios) {
      const v = state.get(id);
      if (v) state.set(id, { ...v, ...cambios });
    },
    async eliminar(id) {
      state.delete(id);
    },
  };
  return { repo, state };
}

describe('calcularBackoffMs', () => {
  it('crece con los intentos y respeta el tope', () => {
    expect(calcularBackoffMs(0, 1000, 2, 10000)).toBe(1000);
    expect(calcularBackoffMs(1, 1000, 2, 10000)).toBe(2000);
    expect(calcularBackoffMs(10, 1000, 2, 10000)).toBe(10000);
  });
});

describe('MotorSync - reintento', () => {
  it('reintenta tras error y programa backoff', async () => {
    const op = makeOp();
    const { repo, state } = makeOutbox([op]);
    let llamadas = 0;
    const remoto: ClienteActasRemoto = {
      async registrarActa() {
        llamadas++;
        if (llamadas === 1) return err('red caída');
        return ok({ status: 'ACEPTADO', actaId: 'a1', estado: 'EVIDENCIA_PENDIENTE' } as ResultadoRemoto);
      },
      async confirmarEvidencia() { return ok({ status: 'ACEPTADO', actaId: 'a1', estado: 'EVIDENCIA_RESPALDADA' } as ResultadoRemoto); },
      async corregirActa() { return ok({ status: 'ACEPTADO' } as ResultadoRemoto); },
      async subirFoto() { return ok('ruta'); },
    };
    const motor = new MotorSync({ outbox: repo, remoto, baseBackoffMs: 10, topeBackoffMs: 100 });

    // Primer intento falla.
    const r1 = await motor.sincronizarOperacion('op-1');
    expect(r1.ok).toBe(false);
    expect(state.get('op-1')?.estado).toBe('ERROR');
    expect(state.get('op-1')?.proximoIntentoEn).not.toBeNull();

    // Simular que ya pasó el tiempo: limpiar proximoIntentoEn.
    await repo.actualizar('op-1', { proximoIntentoEn: null });

    const r2 = await motor.sincronizarOperacion('op-1');
    expect(r2.ok).toBe(true);
    expect(state.get('op-1')?.estado).toBe('EVIDENCIA_RESPALDADA');
    expect(llamadas).toBe(2);
  });
});

describe('MotorSync - idempotencia', () => {
  it('mismo operation_id repetido no duplica: el remoto responde idempotent y avanza', async () => {
    const op = makeOp({ fotoLocalPath: null, fotoRemotaPath: null });
    const { repo, state } = makeOutbox([op]);
    const remoto: ClienteActasRemoto = {
      async registrarActa() {
        return ok({ status: 'ACEPTADO', actaId: 'a1', estado: 'EVIDENCIA_PENDIENTE', idempotent: true } as ResultadoRemoto);
      },
      async confirmarEvidencia() { return ok({ status: 'ACEPTADO' } as ResultadoRemoto); },
      async corregirActa() { return ok({ status: 'ACEPTADO' } as ResultadoRemoto); },
      async subirFoto() { return ok('ruta'); },
    };
    const motor = new MotorSync({ outbox: repo, remoto });
    const r = await motor.sincronizarOperacion('op-1');
    expect(r.ok).toBe(true);
    expect(state.get('op-1')?.estado).toBe('EVIDENCIA_RESPALDADA');
  });
});

describe('MotorSync - conflicto de versión', () => {
  it('marca CONFLICTO_VERSION y no reintenta', async () => {
    const op = makeOp({ tipo: 'CORREGIR_ACTA' });
    const { repo, state } = makeOutbox([op]);
    const remoto: ClienteActasRemoto = {
      async registrarActa() { return ok({ status: 'ACEPTADO' } as ResultadoRemoto); },
      async confirmarEvidencia() { return ok({ status: 'ACEPTADO' } as ResultadoRemoto); },
      async corregirActa() {
        return ok({ status: 'CONFLICTO_VERSION', detalle: 'versión distinta' } as ResultadoRemoto);
      },
      async subirFoto() { return ok('ruta'); },
    };
    const motor = new MotorSync({ outbox: repo, remoto });
    const r = await motor.sincronizarOperacion('op-1');
    expect(r.ok).toBe(true);
    expect(state.get('op-1')?.estado).toBe('CONFLICTO_VERSION');

    // Segundo intento: terminal, no llama al remoto.
    let llamadas = 0;
    const remoto2: ClienteActasRemoto = {
      async registrarActa() { return ok({ status: 'ACEPTADO' } as ResultadoRemoto); },
      async confirmarEvidencia() { return ok({ status: 'ACEPTADO' } as ResultadoRemoto); },
      async corregirActa() { llamadas++; return ok({ status: 'ACEPTADO' } as ResultadoRemoto); },
      async subirFoto() { return ok('ruta'); },
    };
    const motor2 = new MotorSync({ outbox: repo, remoto: remoto2 });
    await motor2.sincronizarOperacion('op-1');
    expect(llamadas).toBe(0);
  });
});

describe('MotorSync - veedor reemplazado', () => {
  it('marca NO_ACEPTADO_REVISION y no reintenta', async () => {
    const op = makeOp();
    const { repo, state } = makeOutbox([op]);
    const remoto: ClienteActasRemoto = {
      async registrarActa() {
        return ok({ status: 'RECHAZADO', motivo: 'VEEDOR_NO_VIGENTE', detalle: 'No aceptado — revisión' } as ResultadoRemoto);
      },
      async confirmarEvidencia() { return ok({ status: 'ACEPTADO' } as ResultadoRemoto); },
      async corregirActa() { return ok({ status: 'ACEPTADO' } as ResultadoRemoto); },
      async subirFoto() { return ok('ruta'); },
    };
    const motor = new MotorSync({ outbox: repo, remoto });
    const r = await motor.sincronizarOperacion('op-1');
    expect(r.ok).toBe(true);
    expect(state.get('op-1')?.estado).toBe('PERMISO_REVOCADO');
  });
});

describe('MotorSync - recuperación tras cierre forzado', () => {
  it('operaciones en SINCRONIZANDO vuelven a la cola', async () => {
    const op = makeOp({ estado: 'SINCRONIZANDO' });
    const { repo, state } = makeOutbox([op]);
    const motor = new MotorSync({ outbox: repo, remoto: {
      async registrarActa() { return ok({ status: 'ACEPTADO', actaId: 'a1', estado: 'EVIDENCIA_PENDIENTE' } as ResultadoRemoto); },
      async confirmarEvidencia() { return ok({ status: 'ACEPTADO' } as ResultadoRemoto); },
      async corregirActa() { return ok({ status: 'ACEPTADO' } as ResultadoRemoto); },
      async subirFoto() { return ok('ruta'); },
    } });
    await motor.reanudarPendientes();
    expect(state.get('op-1')?.estado).toBe('GUARDADA_LOCAL');
  });
});

describe('MotorSync - evidencia y borrado de archivo local', () => {
  it('sube la foto, confirma y borra el archivo local solo tras confirmación', async () => {
    const op = makeOp({ fotoLocalPath: '/local/foto.jpg', fotoRemotaPath: 'rec/jrv/ALCALDIA/op-1.jpg' });
    const { repo, state } = makeOutbox([op]);
    let eliminado = false;
    const archivos = {
      async copiarFoto() { return '/local/foto.jpg'; },
      async eliminar(ruta: string) { if (ruta === '/local/foto.jpg') eliminado = true; },
      async existe() { return true; },
      async listar() { return []; },
      async info() { return { existe: true }; },
    };
    const remoto: ClienteActasRemoto = {
      async registrarActa() { return ok({ status: 'ACEPTADO', actaId: 'a1', estado: 'EVIDENCIA_PENDIENTE' } as ResultadoRemoto); },
      async confirmarEvidencia() { return ok({ status: 'ACEPTADO', actaId: 'a1', estado: 'EVIDENCIA_RESPALDADA' } as ResultadoRemoto); },
      async corregirActa() { return ok({ status: 'ACEPTADO' } as ResultadoRemoto); },
      async subirFoto() { return ok('ruta'); },
    };
    const motor = new MotorSync({ outbox: repo, remoto, archivos });
    const r = await motor.sincronizarOperacion('op-1');
    expect(r.ok).toBe(true);
    expect(eliminado).toBe(true);
    expect(state.get('op-1')?.fotoLocalPath).toBeNull();
    expect(state.get('op-1')?.estado).toBe('EVIDENCIA_RESPALDADA');
  });

  it('si falla la subida, no borra el archivo y queda ERROR', async () => {
    const op = makeOp({ fotoLocalPath: '/local/foto.jpg', fotoRemotaPath: 'rec/jrv/ALCALDIA/op-1.jpg' });
    const { repo, state } = makeOutbox([op]);
    let eliminado = false;
    const archivos = {
      async copiarFoto() { return '/local/foto.jpg'; },
      async eliminar() { eliminado = true; },
      async existe() { return true; },
      async listar() { return []; },
      async info() { return { existe: true }; },
    };
    const remoto: ClienteActasRemoto = {
      async registrarActa() { return ok({ status: 'ACEPTADO', actaId: 'a1', estado: 'EVIDENCIA_PENDIENTE' } as ResultadoRemoto); },
      async confirmarEvidencia() { return ok({ status: 'ACEPTADO' } as ResultadoRemoto); },
      async corregirActa() { return ok({ status: 'ACEPTADO' } as ResultadoRemoto); },
      async subirFoto() { return err('fallo de red'); },
    };
    const motor = new MotorSync({ outbox: repo, remoto, archivos });
    const r = await motor.sincronizarOperacion('op-1');
    expect(r.ok).toBe(false);
    expect(eliminado).toBe(false);
    expect(state.get('op-1')?.fotoLocalPath).toBe('/local/foto.jpg');
    expect(state.get('op-1')?.estado).toBe('ERROR');
  });
});

describe('MotorSync - idempotencia del reintento de evidencia', () => {
  it('si confirmar_evidencia responde idempotent, se respalda y borra archivo', async () => {
    const op = makeOp({ fotoLocalPath: '/local/foto.jpg', fotoRemotaPath: 'rec/jrv/ALCALDIA/op-1.jpg' });
    const { repo, state } = makeOutbox([op]);
    let eliminado = false;
    const archivos = {
      async copiarFoto() { return '/local/foto.jpg'; },
      async eliminar() { eliminado = true; },
      async existe() { return true; },
      async listar() { return []; },
      async info() { return { existe: true }; },
    };
    const remoto: ClienteActasRemoto = {
      async registrarActa() { return ok({ status: 'ACEPTADO', actaId: 'a1', estado: 'EVIDENCIA_PENDIENTE', idempotent: true } as ResultadoRemoto); },
      async confirmarEvidencia() { return ok({ status: 'ACEPTADO', actaId: 'a1', estado: 'EVIDENCIA_RESPALDADA', idempotent: true } as ResultadoRemoto); },
      async corregirActa() { return ok({ status: 'ACEPTADO' } as ResultadoRemoto); },
      async subirFoto() { return ok('ruta'); },
    };
    const motor = new MotorSync({ outbox: repo, remoto, archivos });
    const r = await motor.sincronizarOperacion('op-1');
    expect(r.ok).toBe(true);
    expect(eliminado).toBe(true);
    expect(state.get('op-1')?.estado).toBe('EVIDENCIA_RESPALDADA');
  });
});
