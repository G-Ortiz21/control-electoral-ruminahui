import { obtenerDb } from './sqlite-client';
import { reportarErrorNoFatal } from './sentry';
import Constants from 'expo-constants';

export interface ErrorPendiente {
  id: string;
  codigo: string;
  pantalla: string;
  versionApp: string;
  fecha: string;
  reintentos: number;
  detalle?: string | null;
}

export async function guardarErrorPendiente(err: { codigo: string; pantalla: string; detalle?: string }): Promise<void> {
  const db = await obtenerDb();
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await db.runAsync(
    `INSERT INTO errores_pendientes (id, codigo, pantalla, version_app, fecha, reintentos, detalle) VALUES (?,?,?,?,?,?,?)`,
    [id, err.codigo, err.pantalla, Constants.expoConfig?.version ?? '1.0.0', new Date().toISOString(), 0, err.detalle ?? null],
  );
}

export async function listarErroresPendientes(): Promise<ErrorPendiente[]> {
  const db = await obtenerDb();
  const rows = await db.getAllAsync('SELECT * FROM errores_pendientes ORDER BY fecha ASC');
  return (rows as any[]).map((r) => ({
    id: r.id,
    codigo: r.codigo,
    pantalla: r.pantalla,
    versionApp: r.version_app,
    fecha: r.fecha,
    reintentos: Number(r.reintentos ?? 0),
    detalle: r.detalle,
  }));
}

export async function entregarErroresPendientes(): Promise<void> {
  const pendientes = await listarErroresPendientes();
  for (const e of pendientes) {
    try {
      reportarErrorNoFatal(e.codigo, e.pantalla, e.detalle ?? undefined);
      const db = await obtenerDb();
      await db.runAsync('DELETE FROM errores_pendientes WHERE id = ?', [e.id]);
    } catch {
      const db = await obtenerDb();
      await db.runAsync('UPDATE errores_pendientes SET reintentos = reintentos + 1 WHERE id = ?', [e.id]);
    }
  }
}
