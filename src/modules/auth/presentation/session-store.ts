import { create } from 'zustand';

import type { Rol } from '../domain/roles';

/**
 * Store de presentación (ADR-01): solo sesión/rol visible.
 * No guarda actas ni pendientes; la fuente persistente es SQLite.
 * Fase 1: rol simulado para probar la navegación por rol (ADR-12).
 */
type EstadoSesion = {
  rol: Rol | null;
  setRol: (rol: Rol | null) => void;
};

export const useSessionStore = create<EstadoSesion>((set) => ({
  rol: null,
  setRol: (rol) => set({ rol }),
}));
