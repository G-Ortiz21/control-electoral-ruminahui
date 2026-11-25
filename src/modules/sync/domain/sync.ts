/**
 * Dominio puro de sincronización (RNF-02: sin React, Expo, SQLite, Supabase).
 * Cubre ADR-08, RF-09, RF-12, RNF-04, RNF-05, DI-06, DI-08.
 */

import type { Dignidad } from '@/modules/actas/domain/entities/acta';
import type { Resultado } from '@/shared/domain/resultado';

export type TipoOperacionSync =
  | 'REGISTRAR_ACTA'
  | 'CONFIRMAR_EVIDENCIA'
  | 'SUBIR_FOTO'
  | 'CORREGIR_ACTA';

export type EstadoSync =
  | 'GUARDADA_LOCAL'
  | 'SINCRONIZANDO'
  | 'RESULTADO_RECIBIDO'
  | 'EVIDENCIA_PENDIENTE'
  | 'EVIDENCIA_RESPALDADA'
  | 'ERROR'
  | 'CONFLICTO_VERSION'
  | 'PERMISO_REVOCADO';

export const ESTADOS_SYNC: readonly EstadoSync[] = [
  'GUARDADA_LOCAL',
  'SINCRONIZANDO',
  'RESULTADO_RECIBIDO',
  'EVIDENCIA_PENDIENTE',
  'EVIDENCIA_RESPALDADA',
  'ERROR',
  'CONFLICTO_VERSION',
  'PERMISO_REVOCADO',
] as const;

export function esEstadoSync(v: unknown): v is EstadoSync {
  return typeof v === 'string' && (ESTADOS_SYNC as readonly string[]).includes(v);
}

export interface OperacionSync {
  operationId: string;
  jrvId: string;
  recintoId: string | null;
  dignidad: Dignidad;
  tipo: TipoOperacionSync;
  payload: unknown;
  fotoLocalPath: string | null;
  fotoRemotaPath: string | null;
  intentos: number;
  estado: EstadoSync;
  proximoIntentoEn: string | null;
  ultimoError: string | null;
  creadoEn: string;
  actualizadoEn: string;
  resultado?: unknown;
}

export interface ResultadoRemoto {
  status: string;
  idempotent?: boolean;
  actaId?: string;
  estado?: string;
  motivo?: string;
  detalle?: string;
  expectedVersion?: number;
  currentVersion?: number;
  valoresActuales?: unknown;
}

// ---------------- Puertos ----------------

export interface RepositorioOutbox {
  listarPendientes(): Promise<OperacionSync[]>;
  obtener(operationId: string): Promise<OperacionSync | null>;
  guardar(op: OperacionSync): Promise<void>;
  actualizar(operationId: string, cambios: Partial<OperacionSync>): Promise<void>;
  eliminar(operationId: string): Promise<void>;
}

export interface ClienteActasRemoto {
  registrarActa(payload: unknown): Promise<Resultado<ResultadoRemoto, string>>;
  confirmarEvidencia(operationId: string, fotoPath: string): Promise<Resultado<ResultadoRemoto, string>>;
  corregirActa(payload: unknown): Promise<Resultado<ResultadoRemoto, string>>;
  subirFoto(ruta: string, uriLocal: string): Promise<Resultado<string, string>>;
}

export interface ArchivosPort {
  copiarFoto(origen: string, destino: string): Promise<string>;
  eliminar(ruta: string): Promise<void>;
  existe(ruta: string): Promise<boolean>;
  /** Lista los archivos de un directorio (rutas absolutas/relativas). */
  listar(directorio: string): Promise<string[]>;
  /** Metadatos básicos de un archivo (mtime en ms). */
  info(ruta: string): Promise<{ existe: boolean; mtime?: number }>;
}

export interface ConectividadPort {
  estaConectado(): boolean;
  suscribir(cb: (conectado: boolean) => void): () => void;
}

export interface RelojPort {
  ahora(): Date;
}

// ---------------- Reglas puras ----------------

export function esEstadoTerminal(estado: EstadoSync): boolean {
  return estado === 'EVIDENCIA_RESPALDADA' || estado === 'CONFLICTO_VERSION' || estado === 'PERMISO_REVOCADO';
}

export function esReintentable(estado: EstadoSync): boolean {
  return !esEstadoTerminal(estado);
}

export function calcularBackoffMs(
  intentos: number,
  baseMs: number = 2000,
  factor: number = 2,
  topeMs: number = 60000,
): number {
  const exp = Math.max(0, Math.min(intentos, 12));
  return Math.min(baseMs * Math.pow(factor, exp), topeMs);
}

// Alias para compatibilidad con distintas convenciones de nombres.
export const calcularEsperaCreciente = calcularBackoffMs;
export const backoff = calcularBackoffMs;
export const esperaCreciente = calcularBackoffMs;

export function calcularProximoIntentoIso(ahora: Date, intentos: number, baseMs?: number, topeMs?: number): string {
  const ms = calcularBackoffMs(intentos, baseMs ?? 2000, 2, topeMs ?? 60000);
  return new Date(ahora.getTime() + ms).toISOString();
}

export function esConflictoResultado(r: ResultadoRemoto): boolean {
  return r.status === 'CONFLICTO_VERSION';
}

export function esRechazadoPorReemplazo(r: ResultadoRemoto): boolean {
  return (
    r.status === 'RECHAZADO' &&
    (r.motivo === 'VEEDOR_NO_VIGENTE' ||
      r.motivo === 'PERMISO_REVOCADO' ||
      (r.detalle ?? '').toLowerCase().includes('no vigente') ||
      (r.detalle ?? '').toLowerCase().includes('permiso revocado'))
  ) || r.status === 'PERMISO_REVOCADO';
}

export function esAceptado(r: ResultadoRemoto): boolean {
  return r.status === 'ACEPTADO' || r.status === 'OK';
}
