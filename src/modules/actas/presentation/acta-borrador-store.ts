import { create } from 'zustand';

import type { CalidadFoto, Dignidad } from '../domain';

export interface BorradorActa {
  jrvId: string;
  dignidad: Dignidad;
  recintoLat: number;
  recintoLon: number;
  recintoNombre: string;
  votos: { organizacionId: string; organizacionNombre: string; votos: number }[];
  blancos: number;
  nulos: number;
  sufragantes: number;
}

interface EstadoBorrador {
  borrador: BorradorActa | null;
  setBorrador: (b: BorradorActa) => void;
  limpiar: () => void;
}

export const useActaBorradorStore = create<EstadoBorrador>((set) => ({
  borrador: null,
  setBorrador: (b) => set({ borrador: b }),
  limpiar: () => set({ borrador: null }),
}));