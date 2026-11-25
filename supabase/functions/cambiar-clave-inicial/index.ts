
import { createClient } from "supabase";

// Edge Function: cambiar-clave-inicial
// ADR-04, RF-01, RF-02, RNF-03
//
// Cambia la contraseña inicial del usuario y registra
// la marca clave_inicial_cambiada en app_metadata.
//
// La SERVICE_ROLE_KEY permanece exclusivamente en el servidor.

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request) => {
  // 1. Gestionar CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  // 2. Validar método HTTP
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  // 3. Obtener variables de entorno
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("[CAMBIAR-CLAVE] Configuración incompleta");

    return json({ error: "server_misconfigured" }, 500);
  }

  // 4. Crear cliente administrativo
  const admin = createClient(
    SUPABASE_URL,
    SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  try {
    // 5. Obtener token de autenticación
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return json({ error: "missing_authorization" }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return json({ error: "missing_authorization" }, 401);
    }

    // 6. Validar usuario autenticado
    const {
      data: userData,
      error: userErr,
    } = await admin.auth.getUser(token);

    if (userErr || !userData.user) {
      console.error(
        "[CAMBIAR-CLAVE] Token inválido:",
        userErr?.message
      );

      return json({ error: "invalid_token" }, 401);
    }

    const authUser = userData.user;

    console.log(
      "[CAMBIAR-CLAVE] Usuario autenticado:",
      authUser.id
    );

    // 7. Buscar perfil asociado al usuario
    const {
      data: profile,
      error: profileErr,
    } = await admin
      .from("profiles")
      .select("id, id_auth, estado")
      .eq("id_auth", authUser.id)
      .maybeSingle();

    if (profileErr) {
      console.error(
        "[CAMBIAR-CLAVE] Error consultando perfil:",
        profileErr.message,
        profileErr.code
      );

      return json({ error: "profile_query_failed" }, 500);
    }

    if (!profile) {
      console.error(
        "[CAMBIAR-CLAVE] Perfil no encontrado:",
        authUser.id
      );

      return json({ error: "profile_not_found" }, 404);
    }

    console.log("[CAMBIAR-CLAVE] Perfil encontrado:", {
      profile_id: profile.id,
      estado: profile.estado,
    });

    // 8. Validar estado del perfil
    if (profile.estado !== "PENDIENTE") {
      return json(
        {
          error: "estado_invalido",
          estado: profile.estado,
        },
        403
      );
    }

    // 9. Verificar correo electrónico
    if (!authUser.email_confirmed_at) {
      return json({ error: "email_no_verificado" }, 403);
    }

    // 10. Validar cuerpo de la solicitud
    const body = await req.json().catch(() => null);

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return json({ error: "invalid_request_body" }, 400);
    }

    const password = String(
      (body as Record<string, unknown>).password ?? ""
    );

    if (password.length < 8) {
      return json({ error: "password_invalida" }, 400);
    }

    // 11. Cambiar contraseña y actualizar app_metadata
    const {
      error: updateError,
    } = await admin.auth.admin.updateUserById(
      authUser.id,
      {
        password,
        app_metadata: {
          ...(authUser.app_metadata ?? {}),
          clave_inicial_cambiada: true,
        },
      }
    );

    if (updateError) {
      console.error(
        "[CAMBIAR-CLAVE] Error actualizando contraseña:",
        updateError.message
      );

      return json({ error: "password_update_failed" }, 500);
    }

    console.log(
      "[CAMBIAR-CLAVE] Contraseña actualizada correctamente:",
      authUser.id
    );

    // 12. Respuesta exitosa
    return json(
      {
        status: "CLAVE_CAMBIADA",
        user_id: authUser.id,
      },
      200
    );

  } catch (error) {
    console.error(
      "[CAMBIAR-CLAVE] Error inesperado:",
      error
    );

    return json({ error: "internal_error" }, 500);
  }
});
