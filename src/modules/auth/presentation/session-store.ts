import { create } from 'zustand';

import type { Rol, EstadoPerfil, Usuario } from '../domain/entities/usuario';

/**
 * Store de presentación (ADR-01): solo sesión/rol/estado visible y estado
 * de operaciones. No guarda actas ni pendientes.
 */
type EstadoSesion = {
  usuario: Usuario | null;
  rol: Rol | null;
  estado: EstadoPerfil | null;
  operacion: 'idle' | 'cargando' | 'exito' | 'error';
  mensajeOperacion: string | null;
  setSesion: (usuario: Usuario | null) => void;
  setOperacion: (operacion: EstadoSesion['operacion'], mensaje?: string | null) => void;
  limpiar: () => void;
};

export const useSessionStore = create<EstadoSesion>((set) => ({
  usuario: null,
  rol: null,
  estado: null,
  operacion: 'idle',
  mensajeOperacion: null,
  setSesion: (usuario) =>
    set({
      usuario,
      rol: usuario?.rol ?? null,
      estado: usuario?.estado ?? null,
    }),
  setOperacion: (operacion, mensaje = null) => set({ operacion, mensajeOperacion: mensaje }),
  limpiar: () =>
    set({ usuario: null, rol: null, estado: null, operacion: 'idle', mensajeOperacion: null }),
}));