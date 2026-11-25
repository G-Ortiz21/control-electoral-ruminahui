import { err, ok, type Resultado } from '@/shared/domain/resultado';
import type { UsuarioRepository } from '../ports/usuario-repository';

export class DesactivarUsuario {
  constructor(private readonly usuarios: UsuarioRepository) {}

  async ejecutar(id: string): Promise<Resultado<void, string>> {
    if (!id || !id.trim()) return err('Usuario no válido.');
    return this.usuarios.desactivar(id.trim());
  }
}