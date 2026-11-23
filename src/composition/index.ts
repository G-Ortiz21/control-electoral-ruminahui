/**
 * Contenedor de composición (ADR-01): crea adaptadores y los inyecta en los casos de uso.
 * La presentación llama a los casos de uso a través de este archivo, nunca
 * importa adaptadores directamente.
 * Fase 1: solo registra el adaptador de sesión simulada.
 */
import { sesionSimulada } from '@/modules/auth/data/sesion-simulada';

export const contenedor = {
  sesion: sesionSimulada,
};

export type Contenedor = typeof contenedor;
