// Edge Function: activar-perfil
// Fase 3A (SPIKE) — Activación de perfil tras primer ingreso (ADR-04, RF-01, RF-02, RNF-03).
// Valida que el correo esté verificado por OTP y que la clave temporal haya sido
// sustituida por la definitiva; solo entonces pasa el perfil de PENDIENTE a ACTIVO.
// El cambio de clave lo acredita la marca app_metadata.clave_inicial_cambiada,
// escrita SOLO por la Edge Function cambiar-clave-inicial con service_role
// (DI-07): user_metadata lo escribe el cliente y updated_at cambia con cualquier
// actualización, así que no sirven como prueba del cambio.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ error: "server_misconfigured" }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing_authorization" }, 401);
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json({ error: "invalid_token" }, 401);
    }
    const authUser = userData.user;

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("*")
      .eq("id_auth", authUser.id)
      .single();
    if (profileErr || !profile) return json({ error: "profile_not_found" }, 404);

    if (profile.estado === "ACTIVO") {
      return json({ status: "YA_ACTIVO", user_id: authUser.id }, 200);
    }
    if (profile.estado !== "PENDIENTE") {
      return json({ error: "estado_invalido", estado: profile.estado }, 403);
    }

    // 1) Correo verificado por OTP (email_confirmed_at no nulo).
    if (!authUser.email_confirmed_at) {
      return json({ error: "email_no_verificado" }, 403);
    }

    // 2) La clave temporal debe haber sido sustituida por la definitiva.
    //    Lo acredita el servidor: cambiar-clave-inicial marcó
    //    app_metadata.clave_inicial_cambiada (solo escribible con service_role).
    //    Se descartan user_metadata (lo escribe el cliente) y updated_at
    //    (cambia con cualquier actualización): ver DI-07.
    if (authUser.app_metadata?.clave_inicial_cambiada !== true) {
      return json({ error: "clave_temporal_no_sustituida" }, 403);
    }

    const { error: updErr } = await admin
      .from("profiles")
      .update({ estado: "ACTIVO" })
      .eq("id", profile.id);
    if (updErr) {
      return json({ error: "profile_update_failed", detail: updErr.message }, 500);
    }

    return json({ status: "ACTIVADO", user_id: authUser.id, estado: "ACTIVO" }, 200);
  } catch (e) {
    return json({ error: "internal_error", detail: String((e as Error)?.message ?? e) }, 500);
  }
});