/**
 * Cálculos puros de seguimiento (RNF-02: sin React/Expo/Supabase/SQLite).
 * División entre cero protegida, redondeo controlado y orden estable.
 * Nunca se suman eventos de Realtime aquí: operan sobre el agregado SQL.
 */

export interface ResultadoOrganizacion {
  readonly organizacionId: string;
  readonly organizacionNombre: string;
  readonly color: string;
  readonly votos: number;
}

export interface DatosCuadratura {
  readonly votos: readonly number[];
  readonly blancos: number;
  readonly nulos: number;
  readonly sufragantes: number;
}

export type EstadoCuadratura = 'CUADRA' | 'FALTA' | 'SOBRA';

/** Porcentaje protegido contra división entre cero. Devuelve 0 si total <= 0. */
export function porcentaje(parte: number, total: number): number {
  if (!Number.isFinite(parte) || parte < 0) return 0;
  if (!Number.isFinite(total) || total <= 0) return 0;
  return (parte / total) * 100;
}

/** Redondeo con precisión controlada (máximo 10 decimales). */
export function redondear(valor: number, decimales = 2): number {
  if (!Number.isFinite(valor)) return 0;
  const d = Math.max(0, Math.min(10, Math.trunc(decimales)));
  const factor = 10 ** d;
  return Math.round((valor + Number.EPSILON) * factor) / factor;
}

/** Porcentaje redondeado (por defecto 1 decimal para pantallas). */
export function porcentajeRedondeado(parte: number, total: number, decimales = 1): number {
  return redondear(porcentaje(parte, total), decimales);
}

/** Ordena candidatos por votos descendente; desempata por nombre (orden estable). No muta el origen. */
export function ordenarPorVotos(candidatos: readonly ResultadoOrganizacion[]): ResultadoOrganizacion[] {
  return [...candidatos].sort((a, b) => b.votos - a.votos || a.organizacionNombre.localeCompare(b.organizacionNombre));
}

/** Evalúa la cuadratura del acta frente a los sufragantes. */
export function evaluarCuadratura(datos: DatosCuadratura): { readonly diferencia: number; readonly estado: EstadoCuadratura } {
  const sumaVotos = datos.votos.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
  const suma = sumaVotos + datos.blancos + datos.nulos;
  const diferencia = suma - datos.sufragantes;
  const estado: EstadoCuadratura = diferencia === 0 ? 'CUADRA' : diferencia < 0 ? 'FALTA' : 'SOBRA';
  return { diferencia, estado };
}
