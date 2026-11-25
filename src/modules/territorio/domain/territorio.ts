import type { Resultado } from '@/shared/domain/resultado';
import type { EstadoPerfil } from '@/modules/auth/domain';

export interface AsignacionVeedor {
  id: string;
  jrvId: string;
  veedorId: string;
  veedorNombre?: string | null;
  desde: string;
  hasta: string | null;
  motivo: string | null;
  asignadoPor: string | null;
}

export interface JrvRecinto {
  jrvId: string;
  numero: number;
  recintoId: string;
  veedorVigenteId: string | null;
  veedorVigenteNombre: string | null;
}

/** Veedor del ámbito del coordinador, tal como viene de Supabase (RF-04). */
export interface VeedorDisponible {
  id: string;
  nombres: string;
  apellidos: string;
  estado: EstadoPerfil;
}

export interface ResultadoReemplazo {
  jrvId: string;
  veedorAnteriorCerrado: boolean;
  nuevoVeedorId: string;
}

// ---------------- Reglas puras ----------------

export function veedorVigenteDe(asignaciones: AsignacionVeedor[]): AsignacionVeedor | null {
  return asignaciones.find((a) => a.hasta === null) ?? null;
}

export function historialOrdenado(asignaciones: AsignacionVeedor[]): AsignacionVeedor[] {
  return [...asignaciones].sort((a, b) => (a.desde < b.desde ? -1 : 1));
}

export function otrasAsignacionesNoAfectadas(
  asignaciones: AsignacionVeedor[],
  jrvId: string,
): AsignacionVeedor[] {
  return asignaciones.filter((a) => a.jrvId !== jrvId);
}

export function puedeVerRecinto(actorRecintoId: string | null, recursoRecintoId: string): boolean {
  return Boolean(actorRecintoId) && actorRecintoId === recursoRecintoId;
}

/**
 * Veedores ofrecibles para una JRV (ADR-06: una persona puede cubrir varias JRV).
 * Solo ACTIVO; se excluye al vigente de ESA JRV, no a quien esté vigente en otra.
 */
export function veedoresDisponiblesParaJrv(
  veedores: VeedorDisponible[],
  jrv: JrvRecinto | null,
): VeedorDisponible[] {
  return veedores.filter((v) => v.estado === 'ACTIVO' && v.id !== jrv?.veedorVigenteId);
}

/** JRV del recinto donde el veedor es responsable vigente (para mostrar asignaciones). */
export function jrvsVigentesDelVeedor(jrvs: JrvRecinto[], veedorId: string): JrvRecinto[] {
  return jrvs.filter((j) => j.veedorVigenteId === veedorId);
}

export function validarReemplazo(params: {
  jrvId: string;
  veedorActualId: string | null;
  nuevoVeedorId: string;
  motivo: string;
}): Resultado<void, string> {
  if (!params.jrvId) return { ok: false, error: 'JRV inválida.' };
  if (!params.nuevoVeedorId) return { ok: false, error: 'Debe seleccionar un veedor.' };
  if (!params.motivo || params.motivo.trim() === '') return { ok: false, error: 'El motivo es obligatorio.' };
  if (params.veedorActualId && params.veedorActualId === params.nuevoVeedorId) {
    return { ok: false, error: 'El nuevo veedor debe ser distinto del vigente.' };
  }
  return { ok: true, valor: undefined };
}

export function validarAsignacion(params: { jrvId: string; veedorId: string; motivo: string }): Resultado<void, string> {
  if (!params.jrvId) return { ok: false, error: 'JRV inválida.' };
  if (!params.veedorId) return { ok: false, error: 'Debe seleccionar un veedor.' };
  if (!params.motivo || params.motivo.trim() === '') return { ok: false, error: 'El motivo es obligatorio.' };
  return { ok: true, valor: undefined };
}

/**
 * Designar/reemplazar coordinador de recinto (ADR-06). La RPC existente cierra
 * al vigente y abre la nueva; aquí solo se valida la entrada en el cliente.
 */
export function validarDesignacionCoordinador(params: {
  recintoId: string;
  coordinadorId: string;
  motivo: string;
  vigenteId?: string | null;
}): Resultado<void, string> {
  if (!params.recintoId) return { ok: false, error: 'Debe seleccionar un recinto.' };
  if (!params.coordinadorId) return { ok: false, error: 'Debe seleccionar un coordinador.' };
  if (!params.motivo || params.motivo.trim() === '') return { ok: false, error: 'El motivo es obligatorio.' };
  if (params.vigenteId && params.vigenteId === params.coordinadorId) {
    return { ok: false, error: 'El coordinador ya es el responsable vigente de ese recinto.' };
  }
  return { ok: true, valor: undefined };
}
