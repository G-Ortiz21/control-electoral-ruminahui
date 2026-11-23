/**
 * Roles de la aplicación (provincial → coordinador de recinto → veedor).
 * Reglas puras de navegación por rol (ADR-12); sin importar React ni Expo.
 */

export type Rol = 'PROVINCIAL' | 'COORDINADOR' | 'VEEDOR';

export const ROLES: readonly Rol[] = ['PROVINCIAL', 'COORDINADOR', 'VEEDOR'] as const;

/** Grupo de Expo Router que corresponde a cada rol. */
export const GRUPO_POR_ROL: Record<Rol, string> = {
  PROVINCIAL: '(provincial)',
  COORDINADOR: '(coordinador)',
  VEEDOR: '(veedor)',
};

/** Ruta explícita (con grupo) hacia la pantalla de ejemplo de cada rol. */
export const RUTAS_POR_ROL: Record<Rol, string> = {
  PROVINCIAL: '/(provincial)/panel',
  COORDINADOR: '/(coordinador)/recinto',
  VEEDOR: '/(veedor)/mis-mesas',
};

export function rutaDeRol(rol: Rol): string {
  return RUTAS_POR_ROL[rol];
}

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === 'string' && (ROLES as readonly string[]).includes(valor);
}
