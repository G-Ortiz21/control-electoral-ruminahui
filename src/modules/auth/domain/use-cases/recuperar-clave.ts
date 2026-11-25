import { err, ok, type Resultado } from '@/shared/domain/resultado';
import type { AuthRepository } from '../ports/auth-repository';

export class RecuperarClave {
  constructor(private readonly auth: AuthRepository) {}

  async ejecutar(email: string): Promise<Resultado<void, string>> {
    const emailNorm = (email ?? '').trim().toLowerCase();
    if (!emailNorm) return err('El correo es obligatorio.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) return err('El correo no es válido.');
    return this.auth.recuperarClave(emailNorm);
  }
}