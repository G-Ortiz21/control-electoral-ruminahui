import { err, ok, type Resultado } from '@/shared/domain/resultado';
import type { AuthRepository } from '../ports/auth-repository';

export class CompletarPrimerIngreso {
  constructor(private readonly auth: AuthRepository) {}

  async ejecutar(
    email: string,
    otp: string,
    nuevaClave: string,
    correoYaVerificado = false,
  ): Promise<Resultado<void, string>> {
    const emailNorm = (email ?? '').trim().toLowerCase();
    if (!emailNorm) return err('El correo es obligatorio.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) return err('El correo no es válido.');
    const codigo = (otp ?? '').trim();
    if (!correoYaVerificado && !/^\d{4,8}$/.test(codigo)) {
      return err('El código OTP debe tener entre 4 y 8 dígitos.');
    }
    if (!nuevaClave || nuevaClave.length < 8) return err('La nueva contraseña debe tener al menos 8 caracteres.');

    // 1) El titular prueba que controla su correo. Si llegó desde el enlace de
    // confirmación, el correo ya está verificado y la sesión queda establecida
    // por confirmarCorreoEnlace; no se vuelve a pedir el OTP.
    if (!correoYaVerificado) {
      const ver = await this.auth.verificarOtp(emailNorm, codigo);
      if (!ver.ok) return err(ver.error);
    }

    // 2) La clave la cambia el SERVIDOR (Edge Function cambiar-clave-inicial),
    //    no supabase.auth.updateUser: solo así activar-perfil puede acreditarlo
    //    con app_metadata.clave_inicial_cambiada (ADR-04, DI-07).
    const cam = await this.auth.cambiarClaveInicial(nuevaClave);
    if (!cam.ok) return err(cam.error);

    // 3) El servidor activa el perfil (correo verificado + clave sustituida).
    const act = await this.auth.activarPerfil();
    if (!act.ok) return err(act.error);

    return ok(undefined);
  }
}