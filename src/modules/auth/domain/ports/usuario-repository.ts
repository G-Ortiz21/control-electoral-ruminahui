import type { Usuario } from '../entities/usuario';
import type { Resultado } from '@/shared/domain/resultado';

export interface UsuarioRepository {
  obtenerPerfilActual(): Promise<Resultado<Usuario | null, string>>;
  listarAMiCargo(): Promise<Resultado<Usuario[], string>>;
  desactivar(id: string): Promise<Resultado<void, string>>;
}