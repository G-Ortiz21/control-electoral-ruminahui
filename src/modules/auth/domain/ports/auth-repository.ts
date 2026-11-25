import type { DatosCrearUsuario, ResultadoCrearUsuario, SesionAuth } from '../entities/usuario';
import type { Resultado } from '@/shared/domain/resultado';

/**
 * Puerto de autenticación (ADR-01): el dominio depende de esta interfaz,
 * la implementación concreta vive en data/ (Supabase).
 */
export interface AuthRepository {
  iniciarSesion(email: string, password: string): Promise<Resultado<SesionAuth, string>>;
  cerrarSesion(): Promise<void>;
  enviarOtp(email: string): Promise<Resultado<void, string>>;
  verificarOtp(email: string, token: string): Promise<Resultado<SesionAuth, string>>;
  /**
   * Confirma el correo desde el enlace enviado por crear-usuario. Acepta tanto
   * el token_hash del template de Supabase como los tokens de la sesión ya
   * verificada (flujo implícito). No activa el perfil: solo establece sesión.
   */
  confirmarCorreoEnlace(params: {
    tokenHash?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
  }): Promise<Resultado<SesionAuth, string>>;
  /** Reenvía la plantilla «Confirm signup» desde la gestión de usuarios. */
  reenviarConfirmacion(email: string): Promise<Resultado<void, string>>;
  /**
   * Sustituye la clave temporal por la definitiva en el PRIMER INGRESO.
   * No usa supabase.auth.updateUser: invoca la Edge Function cambiar-clave-inicial,
   * que cambia la clave en el servidor y marca app_metadata.clave_inicial_cambiada
   * para que activar-perfil lo acredite (ADR-04, DI-07).
   */
  cambiarClaveInicial(password: string): Promise<Resultado<void, string>>;
  recuperarClave(email: string): Promise<Resultado<void, string>>;
  obtenerSesionActual(): Promise<SesionAuth | null>;
  crearUsuario(datos: DatosCrearUsuario): Promise<Resultado<ResultadoCrearUsuario, string>>;
  activarPerfil(): Promise<Resultado<void, string>>;
}