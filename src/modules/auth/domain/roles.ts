import type { Rol } from './entities/usuario';

export type { Rol, EstadoPerfil, Usuario } from './entities/usuario';
export { ROLES, esRol, ESTADOS_PERFIL, esEstadoPerfil } from './entities/usuario';

export const GRUPO_POR_ROL: Record<Rol, string> = {
  PROVINCIAL: '(provincial)',
  COORDINADOR: '(coordinador)',
  VEEDOR: '(veedor)',
};

export const RUTAS_POR_ROL: Record<Rol, string> = {
  PROVINCIAL: '/(provincial)/panel',
  COORDINADOR: '/(coordinador)/recinto',
  VEEDOR: '/(veedor)/mis-mesas',
};

export function rutaDeRol(rol: Rol): string {
  return RUTAS_POR_ROL[rol];
}

export function esRolValor(valor: unknown): valor is Rol {
  return typeof valor === 'string' && ['PROVINCIAL', 'COORDINADOR', 'VEEDOR'].includes(valor);
}