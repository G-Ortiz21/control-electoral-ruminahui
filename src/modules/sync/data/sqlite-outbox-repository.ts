import { obtenerDb } from '@/shared/infrastructure/sqlite-client';
import type { OperacionSync, RepositorioOutbox } from '../domain';

function filaAOp(row: any): OperacionSync {
  return {
    operationId: row.operation_id,
    jrvId: row.jrv_id,
    recintoId: row.recinto_id ?? null,
    dignidad: row.dignidad as OperacionSync['dignidad'],
    tipo: row.tipo as OperacionSync['tipo'],
    payload: safeJson(row.payload),
    fotoLocalPath: row.foto_local_path ?? null,
    fotoRemotaPath: row.foto_remota_path ?? null,
    intentos: Number(row.intentos ?? 0),
    estado: row.estado as OperacionSync['estado'],
    proximoIntentoEn: row.proximo_intento_en ?? null,
    ultimoError: row.ultimo_error ?? null,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
    resultado: row.resultado ? safeJson(row.resultado) : undefined,
  };
}

function safeJson(v: string): unknown {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

export class SqliteOutboxRepository implements RepositorioOutbox {
  async listarPendientes(): Promise<OperacionSync[]> {
    const db = await obtenerDb();
    const rows = await db.getAllAsync('SELECT * FROM outbox ORDER BY creado_en ASC');
    return (rows as any[]).map(filaAOp);
  }

  async obtener(operationId: string): Promise<OperacionSync | null> {
    const db = await obtenerDb();
    const rows = await db.getAllAsync('SELECT * FROM outbox WHERE operation_id = ?', [operationId]);
    if (!rows || (rows as any[]).length === 0) return null;
    return filaAOp((rows as any[])[0]);
  }

  async guardar(op: OperacionSync): Promise<void> {
    const db = await obtenerDb();
    await db.runAsync(
      `INSERT INTO outbox (operation_id, jrv_id, recinto_id, dignidad, tipo, payload, foto_local_path, foto_remota_path, intentos, estado, proximo_intento_en, ultimo_error, resultado, creado_en, actualizado_en)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        op.operationId,
        op.jrvId,
        op.recintoId ?? null,
        op.dignidad,
        op.tipo,
        JSON.stringify(op.payload ?? null),
        op.fotoLocalPath,
        op.fotoRemotaPath,
        op.intentos,
        op.estado,
        op.proximoIntentoEn,
        op.ultimoError,
        op.resultado ? JSON.stringify(op.resultado) : null,
        op.creadoEn,
        op.actualizadoEn,
      ],
    );
  }

  async actualizar(operationId: string, cambios: Partial<OperacionSync>): Promise<void> {
    const db = await obtenerDb();
    const actual = await this.obtener(operationId);
    if (!actual) return;
    const merged = { ...actual, ...cambios };
    await db.runAsync(
      `UPDATE outbox SET jrv_id=?, recinto_id=?, dignidad=?, tipo=?, payload=?, foto_local_path=?, foto_remota_path=?, intentos=?, estado=?, proximo_intento_en=?, ultimo_error=?, resultado=?, actualizado_en=? WHERE operation_id=?`,
      [
        merged.jrvId,
        merged.recintoId ?? null,
        merged.dignidad,
        merged.tipo,
        JSON.stringify(merged.payload ?? null),
        merged.fotoLocalPath,
        merged.fotoRemotaPath,
        merged.intentos,
        merged.estado,
        merged.proximoIntentoEn,
        merged.ultimoError,
        merged.resultado ? JSON.stringify(merged.resultado) : null,
        merged.actualizadoEn,
        operationId,
      ],
    );
  }

  async eliminar(operationId: string): Promise<void> {
    const db = await obtenerDb();
    await db.runAsync('DELETE FROM outbox WHERE operation_id = ?', [operationId]);
  }
}

// Función transaccional: guarda acta local + outbox en una sola transacción.
export async function guardarActaLocalYOutbox(params: {
  operationId: string;
  jrvId: string;
  recintoId: string;
  dignidad: OperacionSync['dignidad'];
  payload: unknown;
  fotoLocalPath: string;
  fotoRemotaPath: string;
  creadoEn: string;
}): Promise<void> {
  const db = await obtenerDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT OR REPLACE INTO actas_locales (id, operation_id, jrv_id, dignidad, estado, payload, foto_path, creado_en)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        params.operationId,
        params.operationId,
        params.jrvId,
        params.dignidad,
        'GUARDADA_LOCAL',
        JSON.stringify(params.payload ?? null),
        params.fotoLocalPath,
        params.creadoEn,
      ],
    );
    await db.runAsync(
      `INSERT INTO outbox (operation_id, jrv_id, recinto_id, dignidad, tipo, payload, foto_local_path, foto_remota_path, intentos, estado, proximo_intento_en, ultimo_error, resultado, creado_en, actualizado_en)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        params.operationId,
        params.jrvId,
        params.recintoId,
        params.dignidad,
        'REGISTRAR_ACTA',
        JSON.stringify(params.payload ?? null),
        params.fotoLocalPath,
        params.fotoRemotaPath,
        0,
        'GUARDADA_LOCAL',
        null,
        null,
        null,
        params.creadoEn,
        params.creadoEn,
      ],
    );
  });
}
