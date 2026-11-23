/**
 * Cliente Supabase mínimo (ADR-02).
 * - Clave pública (anon) vía EXPO_PUBLIC_*; NUNCA service_role en la APK (RNF-03).
 * - react-native-url-polyfill está autorizado en AGENTS.md como soporte (instalado en fase 1).
 * - persistSession: false en fase 1 (sin AsyncStorage): la persistencia de la sesión
 *   se decide en la fase 3 de acceso; si requiere una dependencia extra, se pregunta.
 * - Si faltan las variables, el cliente es null y cada fase avisa en su UI.
 */
import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL_SUPABASE = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigurado = Boolean(URL_SUPABASE && ANON_KEY);

let cliente: SupabaseClient | null = null;

export function obtenerClienteSupabase(): SupabaseClient | null {
  if (!supabaseConfigurado) return null;
  if (!cliente) {
    cliente = createClient(URL_SUPABASE, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cliente;
}
