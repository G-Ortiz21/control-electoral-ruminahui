import type { Rol } from '../domain/roles';

/**
 * ADAPTADOR DE SESIÓN SIMULADO (fase 1).
 * Solo memoria del proceso: sirve para probar la navegación por rol sin backend.
 * Se sustituirá por Supabase Auth en la fase 3 (docs/plan/03-acceso.md).
 * OJO: aquí NO se guardan actas ni pendientes (eso vive en SQLite, ADR-01).
 */
let sesion: { rol: Rol } | null = null;

export const sesionSimulada = {
  leer: (): { rol: Rol } | null => sesion,
  escribir: (rol: Rol): void => {
    sesion = { rol };
  },
  limpiar: (): void => {
    sesion = null;
  },
};
