/**
 * Entidades del módulo auth (RNF-02: sin React/Expo/Supabase/SQLite).
 */

export type Rol = 'PROVINCIAL' | 'COORDINADOR' | 'VEEDOR';

export const ROLES: readonly Rol[] = ['PROVINCIAL', 'COORDINADOR', 'VEEDOR'] as const;

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === 'string' && (ROLES as readonly string[]).includes(valor);
}

export type EstadoPerfil = 'PENDIENTE' | 'ACTIVO' | 'DESACTIVADO';

export const ESTADOS_PERFIL: readonly EstadoPerfil[] = [
  'PENDIENTE',
  'ACTIVO',
  'DESACTIVADO',
] as const;

export function esEstadoPerfil(valor: unknown): valor is EstadoPerfil {
  return typeof valor === 'string' && (ESTADOS_PERFIL as readonly string[]).includes(valor);
}

export interface Usuario {
  id: string; // id del perfil (uuid)
  idAuth: string; // id en auth.users
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  email: string | null;
  rol: Rol;
  estado: EstadoPerfil;
  provinciaId: string | null;
  creadoPor: string | null;
  creadoEn: string;
}

export interface SesionAuth {
  accessToken: string;
  refreshToken: string | null;
  userId: string; // auth.users.id
  email: string | null;
}

export interface DatosCrearUsuario {
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  email: string;
  recintoId?: string | null;
}

export interface ResultadoCrearUsuario {
  userId: string;
  email: string;
  rol: Rol;
  estado: EstadoPerfil;
  tempPassword: string;
}