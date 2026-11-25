// Edge Function: crear-usuario
// Fase 3A (SPIKE) — Alta jerárquica de usuarios (ADR-04, RF-01, RF-02, RNF-03).
// Solo el servidor (service_role) crea cuentas en Supabase Auth y perfiles PENDIENTE.
// El APK jamás ve service_role: se lee únicamente de Deno.env.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Versión fijada a la instalada en el proyecto (package.json) para que el
// comportamiento de signUp/resend coincida con la documentación consultada.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Etapa =
  | "ENV_CONFIG"
  | "CLIENT_INIT"
  | "AUTH_TOKEN"
  | "CREATOR_PROFILE"
  | "SCOPE_CHECK"
  | "DUPLICATE_CHECK"
  | "AUTH_SIGNUP"
  | "AUTH_GET_USER"
  | "PROFILE_INSERT"
  | "COMPENSATION"
  | "UNEXPECTED";

// Mensajes fijos: nunca se registran correos, cédulas, teléfonos, tokens,
// contraseñas ni identificadores de usuario.
const MENSAJE_POR_ETAPA: Record<Etapa, string> = {
  ENV_CONFIG: "Falta configuración del servidor.",
  CLIENT_INIT: "No se pudieron inicializar los clientes de Supabase.",
  AUTH_TOKEN: "No se pudo validar la sesión del creador.",
  CREATOR_PROFILE: "No se pudo consultar el perfil del creador.",
  SCOPE_CHECK: "No se pudo validar el rol o el ámbito territorial.",
  DUPLICATE_CHECK: "No se pudo comprobar la unicidad del usuario.",
  AUTH_SIGNUP: "No se pudo crear la cuenta en Supabase Auth.",
  AUTH_GET_USER: "No se pudo verificar la cuenta creada.",
  PROFILE_INSERT: "No se pudo registrar el perfil.",
  COMPENSATION: "No se pudo revertir la cuenta creada.",
  UNEXPECTED: "Error inesperado al crear el usuario.",
};

/** Solo códigos de máquina; cualquier otro texto se sustituye por "unknown". */
function codigoSeguro(valor: unknown): string {
  const texto = typeof valor === "string" ? valor : "";
  return /^[A-Za-z0-9_.-]{1,64}$/.test(texto) ? texto : "unknown";
}

type DetalleSeguro = Record<string, string | number | boolean | null>;

/** Sanitiza el texto del servidor antes de registrarlo; nunca se loguea crudo. */
function sanitizarMensaje(valor: unknown): string {
  if (typeof valor !== "string") return "";
  return valor
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gi, "[email]")
    .replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, "[uuid]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[token]")
    .replace(/https?:\/\/[^\s"'<>]+/gi, "[url]")
    .replace(/\b\d{10,}\b/g, "[numero]")
    .slice(0, 240);
}

/**
 * Clasifica SOLO lo que el propio SDK/servidor identifica. Nunca inventa un
 * motivo: si no hay código ni texto reconocible, devuelve "no_clasificado" y
 * un mensaje canonicalizado, sin exponer el texto original del servidor.
 */
function clasificarErrorSignup(
  codigo: unknown,
  mensaje: unknown,
): { codigo: string; mensaje: string } {
  const codigoTexto = typeof codigo === "string" ? codigo.toLowerCase() : "";
  const texto = typeof mensaje === "string" ? mensaje.toLowerCase() : "";

  const porCodigo: Record<string, { codigo: string; mensaje: string }> = {
    captcha_failed: { codigo: "captcha_failed", mensaje: "CAPTCHA no verificado." },
    over_email_send_rate_limit: { codigo: "rate_limit_email", mensaje: "Límite de envíos por correo excedido." },
    over_request_rate_limit: { codigo: "rate_limit_request", mensaje: "Límite de solicitudes excedido." },
    email_exists: { codigo: "duplicado", mensaje: "El correo ya está registrado en Auth." },
    user_already_exists: { codigo: "duplicado", mensaje: "El usuario ya existe en Auth." },
    email_address_not_authorized: { codigo: "smtp_no_autorizado", mensaje: "El destinatario no está autorizado por el proveedor de correo." },
    email_provider_disabled: { codigo: "smtp_deshabilitado", mensaje: "El proveedor de correo está deshabilitado." },
    validation_failed: { codigo: "validacion", mensaje: "Parámetros de signup rechazados por Auth." },
    signup_disabled: { codigo: "signup_deshabilitado", mensaje: "Los signups están deshabilitados en Auth." },
    unexpected_failure: { codigo: "interno_auth", mensaje: "Fallo interno del servicio de Auth." },
    request_timeout: { codigo: "timeout", mensaje: "Tiempo de espera agotado en Auth." },
  };
  if (Object.prototype.hasOwnProperty.call(porCodigo, codigoTexto)) {
    return porCodigo[codigoTexto];
  }

  const reglas: Array<[string[], { codigo: string; mensaje: string }]> = [
    [["error sending confirmation email", "gomail", "smtp"], { codigo: "smtp_failed", mensaje: "Fallo al entregar el correo de confirmación." }],
    [["too many requests", "rate limit", "only request this after"], { codigo: "rate_limit", mensaje: "Límite de solicitudes o envíos excedido." }],
    [["captcha"], { codigo: "captcha_failed", mensaje: "CAPTCHA no verificado." }],
    [["redirect"], { codigo: "redirect", mensaje: "URL de redirección rechazada por Auth." }],
    [["already registered", "already exists"], { codigo: "duplicado", mensaje: "El correo ya está registrado en Auth." }],
    [["database error"], { codigo: "interno_db", mensaje: "Error de base de datos en Auth." }],
  ];
  for (const [patrones, resultado] of reglas) {
    if (patrones.some((p) => texto.includes(p))) return resultado;
  }
  return { codigo: "no_clasificado", mensaje: "[mensaje original no clasificado — omitido por seguridad]" };
}

/** El usuario solo se considera creado por esta operación si es reciente, no
 * está confirmado y trae identidades; un usuario ofuscado/ya existente no se
 * toca nunca (DI-07, RF-01: conservar cuentas preexistentes). */
function usuarioPerteneceAOperacion(
  usuario: { created_at?: string; email_confirmed_at?: string | null; identities?: unknown[] } | null | undefined,
  inicio: number,
): boolean {
  if (!usuario) return false;
  if (Array.isArray(usuario.identities) && usuario.identities.length === 0) return false;
  if (usuario.email_confirmed_at) return false;
  if (!usuario.created_at) return false;
  const creado = Date.parse(usuario.created_at);
  return Number.isFinite(creado) && creado >= inicio - 60_000;
}

function registrarFallo(
  etapa: Etapa,
  codigo: unknown,
  status: number,
  compensated = false,
  detalle?: DetalleSeguro,
): void {
  console.error(JSON.stringify({
    etapa,
    codigo: codigoSeguro(codigo),
    status,
    compensated,
    mensaje: MENSAJE_POR_ETAPA[etapa],
    ...(detalle ?? {}),
  }));
}

function fallo(
  etapa: Etapa,
  errorCode: string,
  status: number,
  codigo?: unknown,
  compensated = false,
): Response {
  registrarFallo(etapa, codigo ?? errorCode, status, compensated);
  return json({
    error: errorCode,
    etapa,
    codigo: codigoSeguro(codigo ?? errorCode),
    compensated: compensated || undefined,
  }, status);
}

// app.json → expo.scheme. El grupo (auth) no aparece en la URL de Expo Router.
const REDIRECCION_CONFIRMACION = "controlelectoralruminahui://confirmar-correo";

function esCedulaValida(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false;
  const provincia = Number(cedula.slice(0, 2));
  if (provincia < 1 || provincia > 24) return false;
  if (Number(cedula[2]) > 5) return false;
  const coefs = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let producto = Number(cedula[i]) * coefs[i];
    if (producto > 9) producto -= 9;
    suma += producto;
  }
  const verificador = (10 - (suma % 10)) % 10;
  return verificador === Number(cedula[9]);
}

function generarClaveTemporal(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const base = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Garantiza una clave que cumpla políticas mínimas habituales de Supabase Auth.
  return `Tmp-${base.slice(0, 12)}9a`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  // Supabase inyecta SUPABASE_ANON_KEY en las Edge Functions. se usa SOLO para
  // invocar signUp() y que Auth envíe su plantilla "Confirm signup" por SMTP.
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
    registrarFallo("ENV_CONFIG", "missing_env", 500);
    // Solo booleanos: nunca los valores de las variables.
    console.error(JSON.stringify({
      etapa: "ENV_CONFIG",
      url: Boolean(SUPABASE_URL),
      serviceRole: Boolean(SERVICE_ROLE_KEY),
      anon: Boolean(ANON_KEY),
    }));
    return json({ error: "server_misconfigured", etapa: "ENV_CONFIG", codigo: "missing_env" }, 500);
  }

  // Referencia para demostrar que una cuenta fue creada por ESTA operación.
  const inicioOperacion = Date.now();
  // etapaActual permite que el catch general registre dónde ocurrió el fallo.
  let etapaActual: Etapa = "CLIENT_INIT";

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    type UsuarioAuth = {
      id?: string;
      created_at?: string;
      email_confirmed_at?: string | null;
      identities?: unknown[];
    };

    // Solo compensa si se puede demostrar pertenencia a esta operación.
    // Nunca borra una cuenta preexistente/devuelta de forma ofuscada por signUp.
    const compensarSiPropio = async (
      usuario: UsuarioAuth | null | undefined,
      etapaSolicitante: Etapa,
    ): Promise<boolean> => {
      if (!usuario?.id || !usuarioPerteneceAOperacion(usuario, inicioOperacion)) {
        registrarFallo("COMPENSATION", "compensacion_omitida", 500, false, {
          etapa_solicitante: etapaSolicitante,
          motivo: "no_se_puede_demostrar_que_la_cuenta_pertenezca_a_esta_operacion",
        });
        return false;
      }
      try {
        await admin.auth.admin.deleteUser(usuario.id);
        return true;
      } catch (e) {
        registrarFallo("COMPENSATION", e instanceof Error ? e.name : "unknown", 500);
        return false;
      }
    };

    etapaActual = "AUTH_TOKEN";
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing_authorization" }, 401);
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return fallo("AUTH_TOKEN", "invalid_token", 401, userErr?.code ?? "no_user");
    }

    etapaActual = "CREATOR_PROFILE";
    const { data: creator, error: creatorErr } = await admin
      .from("profiles")
      .select("*")
      .eq("id_auth", userData.user.id)
      .single();
    if (creatorErr || !creator) {
      return fallo("CREATOR_PROFILE", "profile_not_found", 403, creatorErr?.code ?? "no_profile");
    }
    if (creator.estado !== "ACTIVO") {
      return fallo("CREATOR_PROFILE", "creator_not_active", 403);
    }

    const body = await req.json().catch(() => ({}));
    const cedula = String(body?.cedula ?? "").trim();
    const nombres = String(body?.nombres ?? "").trim();
    const apellidos = String(body?.apellidos ?? "").trim();
    const telefonoRaw = body?.telefono;
    const telefono =
      telefonoRaw === null || telefonoRaw === undefined
        ? null
        : String(telefonoRaw).trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const recintoSolicitado = body?.recinto_id ?? null;

    // Validaciones de dominio (misma regla que src/shared/domain/validador-cedula.ts).
    if (!esCedulaValida(cedula)) return json({ error: "cedula_invalida" }, 400);
    if (nombres.length < 2 || nombres.length > 100) {
      return json({ error: "nombres_invalidos" }, 400);
    }
    if (apellidos.length < 2 || apellidos.length > 100) {
      return json({ error: "apellidos_invalidos" }, 400);
    }
    if (telefono !== null && telefono !== "" && !/^[0-9]{7,15}$/.test(telefono)) {
      return json({ error: "telefono_invalido" }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "email_invalido" }, 400);
    }

    // Determinar rol nuevo y ámbito según el creador (ADR-04, DI-06).
    etapaActual = "SCOPE_CHECK";
    let nuevoRol: string;
    let provinciaId: string | null = null;

    if (creator.rol === "PROVINCIAL") {
      nuevoRol = "COORDINADOR";
      provinciaId = creator.provincia_id ?? null;
      if (!provinciaId) return fallo("SCOPE_CHECK", "creator_without_scope", 403);

      if (recintoSolicitado) {
        const { data: recinto } = await admin
          .from("recintos")
          .select("id, provincia_id")
          .eq("id", recintoSolicitado)
          .single();
        if (!recinto || recinto.provincia_id !== provinciaId) {
          return fallo("SCOPE_CHECK", "recinto_fuera_de_ambito", 403);
        }
      }
    } else if (creator.rol === "COORDINADOR") {
      nuevoRol = "VEEDOR";

      const { data: asignacion } = await admin
        .from("coordinadores_recinto")
        .select("recinto_id")
        .eq("coordinador_id", creator.id)
        .is("hasta", null)
        .limit(1)
        .maybeSingle();
      if (!asignacion) return fallo("SCOPE_CHECK", "coordinator_without_recinto", 403);

      const recintoId = recintoSolicitado ?? asignacion.recinto_id;
      const { data: recinto } = await admin
        .from("recintos")
        .select("id, provincia_id")
        .eq("id", recintoId)
        .single();
      if (!recinto) return fallo("SCOPE_CHECK", "recinto_no_encontrado", 404);

      const { data: coordCheck } = await admin
        .from("coordinadores_recinto")
        .select("id")
        .eq("coordinador_id", creator.id)
        .eq("recinto_id", recinto.id)
        .is("hasta", null)
        .maybeSingle();
      if (!coordCheck) return fallo("SCOPE_CHECK", "recinto_fuera_de_ambito", 403);

      provinciaId = recinto.provincia_id ?? null;
    } else {
      return fallo("SCOPE_CHECK", "forbidden_role", 403);
    }

    // Unicidad de cédula (también garantizada por UNIQUE en profiles).
    etapaActual = "DUPLICATE_CHECK";
    const { data: cedulaExistente } = await admin
      .from("profiles")
      .select("id")
      .eq("cedula", cedula)
      .maybeSingle();
    if (cedulaExistente) return fallo("DUPLICATE_CHECK", "cedula_duplicada", 409);

    // signUp() oculta la existencia de cuentas: si el correo ya existe devuelve
    // un usuario sin identidades y NO envía correo. Se comprueba antes con
    // service_role para no duplicar Auth ni dejar al titular sin confirmación.
    let emailDuplicado = false;
    let codigoDuplicado = "email_duplicado";
    let pagina = 1;
    while (pagina <= 20) {
      const { data: lista, error: listaErr } = await admin.auth.admin.listUsers({
        page: pagina,
        perPage: 200,
      });
      if (listaErr) {
        // No se oculta el fallo del backend detrás de "email_duplicado".
        registrarFallo("DUPLICATE_CHECK", listaErr.code ?? "list_users_failed", 409);
        codigoDuplicado = codigoSeguro(listaErr.code ?? "list_users_failed");
        emailDuplicado = true; // fallar cerrado
        break;
      }
      if ((lista?.users ?? []).some((u) => (u.email ?? "").toLowerCase() === email)) {
        registrarFallo("DUPLICATE_CHECK", "email_duplicado", 409);
        emailDuplicado = true;
        break;
      }
      if (!lista?.nextPage) break;
      pagina = lista.nextPage;
    }
    if (emailDuplicado) {
      return json({ error: "email_duplicado", etapa: "DUPLICATE_CHECK", codigo: codigoDuplicado }, 409);
    }

    // admin.createUser() NO envía correo. signUp() sí usa la plantilla
    // "Confirm signup" y el SMTP configurado en Supabase (Resend), con
    // emailRedirectTo apuntando al esquema de Expo. Se ejecuta en el servidor,
    // después de validar rol/ámbito del creador: NO es autorregistro libre.
    // La clave temporal se conserva como password del usuario Auth.
    etapaActual = "AUTH_SIGNUP";
    const claveTemporal = generarClaveTemporal();
    const { data: signUpData, error: signUpErr } = await anon.auth.signUp({
      email,
      password: claveTemporal,
      options: {
        emailRedirectTo: REDIRECCION_CONFIRMACION,
        data: {
          must_change_password: true,
          temp_password_issued_at: new Date().toISOString(),
        },
      },
    });

    if (signUpErr || !signUpData.user) {
      const usuario = signUpData?.user ?? null;
      const identidades = Array.isArray(usuario?.identities) ? usuario.identities.length : null;
      const clasificacion = clasificarErrorSignup(signUpErr?.code, signUpErr?.message);
      const codigoLog = signUpErr?.code ?? clasificacion.codigo;
      const compensado = await compensarSiPropio(usuario, "AUTH_SIGNUP");

      registrarFallo("AUTH_SIGNUP", codigoLog, 500, compensado, {
        nombre_error: codigoSeguro(signUpErr?.name ?? "none"),
        codigo_auth: codigoSeguro(signUpErr?.code ?? "none"),
        status_auth: typeof signUpErr?.status === "number" ? signUpErr.status : null,
        mensaje_sanitizado: clasificacion.mensaje,
        mensaje_original_saneado: clasificacion.codigo === "no_clasificado"
          ? "[omitido por seguridad]"
          : sanitizarMensaje(signUpErr?.message),
        usuario_recibido: Boolean(usuario),
        sesion_devuelta: signUpData?.session != null,
        identidades,
        motivo: clasificacion.codigo,
        compensacion_omitida: Boolean(usuario) && !compensado,
      });

      return json({
        error: "auth_create_failed",
        etapa: "AUTH_SIGNUP",
        codigo: codigoSeguro(codigoLog),
        compensated: compensado || undefined,
      }, 500);
    }

    const authUserId = signUpData.user.id;

    // Si "Confirm email" está desactivado en el proyecto, Supabase autoconfirma
    // y crea sesión. Eso rompe el flujo del examen: se compensa y se exige
    // activar la confirmación en el Dashboard antes de reintentar.
    etapaActual = "AUTH_GET_USER";
    const { data: creado, error: getUserErr } =
      await admin.auth.admin.getUserById(authUserId);
    if (getUserErr || !creado?.user) {
      const compensado = await compensarSiPropio(creado?.user ?? null, "AUTH_GET_USER");
      return fallo(
        "AUTH_GET_USER",
        "auth_user_verification_failed",
        500,
        getUserErr?.code ?? "no_user",
        compensado,
      );
    }
    if (creado.user.email_confirmed_at) {
      const compensado = await compensarSiPropio(creado.user, "AUTH_GET_USER");
      return fallo("AUTH_GET_USER", "email_confirmation_disabled", 500, "email_confirmation_disabled", compensado);
    }

    // Insertar perfil PENDIENTE. Compensación obligatoria si falla.
    etapaActual = "PROFILE_INSERT";
    const { error: profileErr } = await admin.from("profiles").insert({
      id_auth: authUserId,
      cedula,
      nombres,
      apellidos,
      telefono: telefono === "" ? null : telefono,
      email,
      rol: nuevoRol,
      estado: "PENDIENTE",
      provincia_id: provinciaId,
      creado_por: creator.id,
    });

    if (profileErr) {
      const compensado = await compensarSiPropio(creado.user, "PROFILE_INSERT");
      return fallo("PROFILE_INSERT", "profile_insert_failed", 500, profileErr.code ?? "insert_failed", compensado);
    }

    return json(
      {
        status: "CREADO",
        user_id: authUserId,
        email,
        rol: nuevoRol,
        estado: "PENDIENTE",
        temp_password: claveTemporal,
      },
      201,
    );
  } catch (e) {
    registrarFallo(etapaActual, e instanceof Error ? e.name : "unknown", 500);
    return json({
      error: "internal_error",
      etapa: etapaActual,
      codigo: codigoSeguro(e instanceof Error ? e.name : e),
    }, 500);
  }
});