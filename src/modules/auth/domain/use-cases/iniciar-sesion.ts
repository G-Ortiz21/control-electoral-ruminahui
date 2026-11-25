import { err, ok, type Resultado } from '@/shared/domain/resultado';
import type { AuthRepository } from '../ports/auth-repository';
import type { UsuarioRepository } from '../ports/usuario-repository';
import type { Usuario, SesionAuth } from '../entities/usuario';

export class IniciarSesion {
  constructor(
    private readonly auth: AuthRepository,
    private readonly usuarios: UsuarioRepository,
  ) {}

  async ejecutar(email: string, password: string): Promise<Resultado<{ usuario: Usuario; sesion: SesionAuth }, string>> {
    const emailNorm = (email ?? '').trim().toLowerCase();
    if (!emailNorm) return err('El correo es obligatorio.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) return err('El correo no es válido.');
    if (!password || password.length < 1) return err('La contraseña es obligatoria.');

    const sesionRes = await this.auth.iniciarSesion(emailNorm, password);
    if (!sesionRes.ok) return err(sesionRes.error);

    const perfilRes = await this.usuarios.obtenerPerfilActual();
    if (!perfilRes.ok) return err(perfilRes.error);
    if (!perfilRes.valor) return err('No se encontró el perfil del usuario.');

    return ok({ usuario: perfilRes.valor, sesion: sesionRes.valor });
  }
}