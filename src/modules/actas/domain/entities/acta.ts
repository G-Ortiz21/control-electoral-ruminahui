/**
 * Entidad Acta y tipos del m��dulo actas (RNF-02: sin React/Expo/Supabase/SQLite).
 */

export type Dignidad = 'ALCALDIA' | 'PREFECTURA';

export const DIGNIDADES: readonly Dignidad[] = ['ALCALDIA', 'PREFECTURA'] as const;

export function esDignidad(valor: unknown): valor is Dignidad {
  return typeof valor === 'string' && (DIGNIDADES as readonly string[]).includes(valor);
}

export type CalidadFoto = 'NORMAL' | 'CALIDAD_DUDOSA';

export const CALIDADES_FOTO: readonly CalidadFoto[] = ['NORMAL', 'CALIDAD_DUDOSA'] as const;

export function esCalidadFoto(valor: unknown): valor is CalidadFoto {
  return typeof valor === 'string' && (CALIDADES_FOTO as readonly string[]).includes(valor);
}

export type EstadoActa =
  | 'BORRADOR'
  | 'GUARDADA_LOCAL'
  | 'SINCRONIZANDO'
  | 'RESULTADO_RECIBIDO'
  | 'EVIDENCIA_PENDIENTE'
  | 'EN_REVISION'
  | 'EVIDENCIA_RESPALDADA'
  | 'ERROR'
  | 'CONFLICTO_VERSION';

export const ESTADOS_ACTA: readonly EstadoActa[] = [
  'BORRADOR',
  'GUARDADA_LOCAL',
  'SINCRONIZANDO',
  'RESULTADO_RECIBIDO',
  'EVIDENCIA_PENDIENTE',
  'EN_REVISION',
  'EVIDENCIA_RESPALDADA',
  'ERROR',
  'CONFLICTO_VERSION',
] as const;

export function esEstadoActa(valor: unknown): valor is EstadoActa {
  return typeof valor === 'string' && (ESTADOS_ACTA as readonly string[]).includes(valor);
}

export interface VotoActa {
  organizacionId: string;
  votos: number;
}

export interface Acta {
  id: string;
  jrvId: string;
  recintoId?: string | null;
  dignidad: Dignidad;
  version: number;
  estado: EstadoActa;
  capturedAt: string;
  lat: number | null;
  lon: number | null;
  accuracy: number | null;
  gpsTimestamp: string | null;
  distanciaRecintoM: number | null;
  calidadFoto: CalidadFoto;
  fotoPath: string | null;
  sufragantes: number;
  blancos: number;
  nulos: number;
  votos: VotoActa[];
  capturadoPor: string | null;
}

export interface ValoresCuadratura {
  votos: number[];
  blancos: number;
  nulos: number;
  sufragantes: number;
}

export interface RecintoCoords {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
}

export interface MesaVeedor {
  jrvId: string;
  numero: number;
  recinto: RecintoCoords;
}