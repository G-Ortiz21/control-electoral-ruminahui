import { obtenerClienteSupabase } from '@/shared/infrastructure/supabase-client';
import type { AuthRepository } from '../domain/ports/auth-repository';
import type {
  DatosCrearUsuario,
  ResultadoCrearUsuario,
  SesionAuth,
} from '../domain/entities/usuario';
import { err, ok, type Resultado } from '@/shared/domain/resultado';

interface SesionInterna {
  accessToken: string;
  refreshToken: string | null;
  userId: string;
  email: string | null;
}

/** Debe coincidir con el emailRedirectTo de crear-usuario y con el deep link de app.json. */
const REDIRECCION_CONFIRMACION = 'controlelectoralruminahui://confirmar-correo';

// Mensajes en español para los códigos de error JSON de las Edge Functions
// (cambiar-clave-inicial y activar-perfil). Sin claves, correos ni datos
// personales: solo el código y el status (RNF-03, ADR-11).
const MENSAJES_FUNCION: Record<string, string> = {
  missing_authorization: 'Tu sesión expiró. Inicia sesión nuevamente.',
  invalid_token: 'Tu sesión no es válida. Inicia sesión nuevamente.',
  profile_not_found: 'No se encontró tu perfil de usuario.',
  estado_invalido: 'Tu perfil no está pendiente de activación.',
  email_no_verificado: 'Tu correo aún no está verificado. Solicita el código OTP nuevamente.',
  clave_temporal_no_sustituida: 'Debes cambiar la contraseña antes de activar la cuenta.',
  password_invalida: 'La nueva contraseña debe tener al menos 8 caracteres.',
  password_update_failed: 'No se pudo cambiar la contraseña. Intenta de nuevo.',
  profile_update_failed: 'No se pudo activar la cuenta. Intenta de nuevo.',
  method_not_allowed: 'Operación no permitida.',
  server_misconfigured: 'Servicio no disponible. Contacta al responsable.',
  internal_error: 'Error inesperado. Intenta de nuevo.',
};

/** Traduce { error } + status de una Edge Function a un mensaje mostrable. */
function mensajeDeErrorFuncion(codigo: string | null, status: number | null): string {
  if (codigo && MENSAJES_FUNCION[codigo]) return MENSAJES_FUNCION[codigo];
  if (status === 400) return 'Los datos enviados no son válidos.';
  if (status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
  if (status === 403) return 'No tienes permiso para realizar esta acción.';
  if (status === 404) return 'No se encontró la información solicitada.';
  if (status !== null && status >= 500) return 'Error del servidor. Intenta de nuevo en unos minutos.';
  return 'No se pudo completar la operación. Intenta de nuevo.';
}

/**
 * Lee `error.context.status` y `error.context.json()` de un FunctionsHttpError
 * de supabase-js. Nunca registra claves, correos ni el cuerpo completo:
 * solo se usa el código `error` y el status para armar el mensaje.
 */
async function leerErrorFuncion(error: unknown): Promise<{ codigo: string | null; status: number | null }> {
  const contexto = (error as { context?: Response } | null)?.context;
  if (!contexto || typeof contexto.status !== 'number') return { codigo: null, status: null };
  try {
    const cuerpo = (await contexto.json()) as { error?: unknown };
    const codigo = typeof cuerpo?.error === 'string' ? cuerpo.error : null;
    return { codigo, status: contexto.status };
  } catch {
    return { codigo: null, status: contexto.status };
  }
}

export class SupabaseAuthRepository implements AuthRepository {
  private sesion: SesionInterna | null = null;

  private cliente() {
    return obtenerClienteSupabase();
  }

  private async asegurarSesionEnCliente(): Promise<void> {
    const sb = this.cliente();
    if (!sb || !this.sesion) return;
    try {
      await sb.auth.setSession({
        access_token: this.sesion.accessToken,
        refresh_token: this.sesion.refreshToken ?? '',
      });
    } catch {
      // ignorar: el cliente puede no tener refresh token
    }
  }

  async iniciarSesion(email: string, password: string): Promise<Resultado<SesionAuth, string>> {
    const sb = this.cliente();
    if (!sb) return err('Supabase no está configurado.');
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) {
      return err('Correo o contraseña incorrectos.');
    }
    this.sesion = {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token ?? null,
      userId: data.user.id,
      email: data.user.email ?? email,
    };
    return ok(this.toSesionAuth(this.sesion));
  }

  async cerrarSesion(): Promise<void> {
    const sb = this.cliente();
    if (sb) {
      try {
        await sb.auth.signOut();
      } catch {
        // ignorar
      }
    }
    this.sesion = null;
  }

  async enviarOtp(email: string): Promise<Resultado<void, string>> {
    const sb = this.cliente();
    if (!sb) return err('Supabase no está configurado.');
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) return err(error.message || 'No se pudo enviar el código OTP.');
    return ok(undefined);
  }

  async verificarOtp(email: string, token: string): Promise<Resultado<SesionAuth, string>> {
    const sb = this.cliente();
    if (!sb) return err('Supabase no está configurado.');
    const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
    if (error || !data.session || !data.user) {
      return err('Código OTP inválido o expirado.');
    }
    this.sesion = {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token ?? null,
      userId: data.user.id,
      email: data.user.email ?? email,
    };
    return ok(this.toSesionAuth(this.sesion));
  }

  async confirmarCorreoEnlace(params: {
    tokenHash?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
  }): Promise<Resultado<SesionAuth, string>> {
    const sb = this.cliente();
    if (!sb) return err('Supabase no está configurado.');

    const tokenHash = (params.tokenHash ?? '').trim();
    const accessToken = (params.accessToken ?? '').trim();
    const refreshToken = (params.refreshToken ?? '').trim();

    let sesion: SesionAuth | null = null;
    if (tokenHash) {
      const { data, error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: 'signup' });
      if (error || !data.session || !data.user) {
        return err('El enlace de confirmación no es válido o expiró. Solicita uno nuevo.');
      }
      sesion = this.toSesionAuth({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token ?? null,
        userId: data.user.id,
        email: data.user.email ?? null,
      });
    } else if (accessToken && refreshToken) {
      const { data, error } = await sb.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error || !data.session || !data.user) {
        return err('El enlace de confirmación no es válido o expiró. Solicita uno nuevo.');
      }
      sesion = this.toSesionAuth({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token ?? null,
        userId: data.user.id,
        email: data.user.email ?? null,
      });
    } else {
      return err('El enlace de confirmación no contiene datos válidos.');
    }

    this.sesion = {
      accessToken: sesion.accessToken,
      refreshToken: sesion.refreshToken,
      userId: sesion.userId,
      email: sesion.email,
    };
    return ok(sesion);
  }

  async reenviarConfirmacion(email: string): Promise<Resultado<void, string>> {
    const sb = this.cliente();
    if (!sb) return err('Supabase no está configurado.');
    const correo = (email ?? '').trim().toLowerCase();
    if (!correo) return err('No se pudo identificar el correo del usuario.');
    // Endpoint público de Auth: no expone service_role. Supabase aplica
    // rate-limiting y solo reenvía si existe una solicitud de signup previa.
    const { error } = await sb.auth.resend({
      type: 'signup',
      email: correo,
      options: { emailRedirectTo: REDIRECCION_CONFIRMACION },
    });
    if (error) return err('No se pudo reenviar el correo de confirmación.');
    return ok(undefined);
  }

  async cambiarClaveInicial(password: string): Promise<Resultado<void, string>> {
    const sb = this.cliente();
    if (!sb || !this.sesion) return err('No hay sesión activa.');
    const email = this.sesion.email;
    if (!email) return err('No se pudo identificar tu cuenta. Inicia sesión nuevamente.');
    await this.asegurarSesionEnCliente();

    // 1) La clave la cambia el SERVIDOR (ADR-04, DI-07): nunca se usa
    //    supabase.auth.updateUser porque el backend no se enteraría.
    const { error } = await sb.functions.invoke('cambiar-clave-inicial', {
      body: { password },
    });
    if (error) {
      return err(await this.mensajeErrorFuncion(error, 'No se pudo cambiar la contraseña.'));
    }

    // 2) Refrescar la sesión con la clave nueva: el token nuevo arrastra
    //    app_metadata.clave_inicial_cambiada, que activar-perfil acredita.
    const { data, error: signInErr } = await sb.auth.signInWithPassword({ email, password });
    if (signInErr || !data.session || !data.user) {
      return err('La contraseña se cambió, pero no se pudo iniciar sesión. Cierra sesión y vuelve a entrar.');
    }
    this.sesion = {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token ?? null,
      userId: data.user.id,
      email: data.user.email ?? email,
    };
    return ok(undefined);
  }

  async recuperarClave(email: string): Promise<Resultado<void, string>> {
    const sb = this.cliente();
    if (!sb) return err('Supabase no está configurado.');
    const { error } = await sb.auth.resetPasswordForEmail(email);
    if (error) return err(error.message || 'No se pudo enviar el correo de recuperación.');
    return ok(undefined);
  }

  async obtenerSesionActual(): Promise<SesionAuth | null> {
    if (!this.sesion) return null;
    return this.toSesionAuth(this.sesion);
  }

  async crearUsuario(datos: DatosCrearUsuario): Promise<Resultado<ResultadoCrearUsuario, string>> {
    const sb = this.cliente();
    if (!sb || !this.sesion) return err('No hay sesión activa.');
    await this.asegurarSesionEnCliente();

    const { data, error } = await sb.functions.invoke('crear-usuario', {
      body: {
        cedula: datos.cedula,
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        telefono: datos.telefono,
        email: datos.email,
        recinto_id: datos.recintoId ?? null,
      },
    });

    if (error) {
      // Supabase functions invoke error may contain context
      const msg = (error as { message?: string })?.message ?? 'Error al crear el usuario.';
      return err(msg);
    }
    const payload = (data ?? {}) as Record<string, unknown>;
    if (payload.error) {
      return err(String(payload.error));
    }
    const resultado: ResultadoCrearUsuario = {
      userId: String(payload.user_id ?? ''),
      email: String(payload.email ?? datos.email),
      rol: (payload.rol as ResultadoCrearUsuario['rol']) ?? 'VEEDOR',
      estado: (payload.estado as ResultadoCrearUsuario['estado']) ?? 'PENDIENTE',
      tempPassword: String(payload.temp_password ?? ''),
    };
    return ok(resultado);
  }

  async activarPerfil(): Promise<Resultado<void, string>> {
    const sb = this.cliente();
    if (!sb || !this.sesion) return err('No hay sesión activa.');
    await this.asegurarSesionEnCliente();

    const { data, error } = await sb.functions.invoke('activar-perfil', { body: {} });
    if (error) {
      return err(await this.mensajeErrorFuncion(error, 'No se pudo activar la cuenta.'));
    }
    const payload = (data ?? {}) as Record<string, unknown>;
    if (payload.error) return err(mensajeDeErrorFuncion(String(payload.error), null));
    return ok(undefined);
  }

  /**
   * functions.invoke falla con «Edge Function returned a non-2xx status code»
   * sin cuerpo visible; la Edge Function sí responde JSON { error } con su
   * status. Se leen context.status y context.json() y se traducen a un mensaje
   * en español. Nunca se registran claves, correos ni el cuerpo completo:
   * solo el código del error y el status (RNF-03, ADR-11).
   */
  private async mensajeErrorFuncion(error: unknown, respaldo: string): Promise<string> {
    const { codigo, status } = await leerErrorFuncion(error);
    if (codigo || status !== null) return mensajeDeErrorFuncion(codigo, status);
    const mensaje = (error as { message?: string })?.message;
    return mensaje && mensaje.trim() ? mensaje : respaldo;
  }

  private toSesionAuth(s: SesionInterna): SesionAuth {
    return {
      accessToken: s.accessToken,
      refreshToken: s.refreshToken,
      userId: s.userId,
      email: s.email,
    };
  }
}