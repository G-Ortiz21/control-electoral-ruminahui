import { useEffect } from 'react';
import { SupabaseSeguimientoRealtime } from '../data';
import type { SeguimientoRealtimePort } from '../domain';

/**
 * Hook que suscribe a cambios de actas/votos por Supabase Realtime y re-consulta
 * el agregado con debounce. Al reconectar refresca. Nunca suma eventos en el cliente.
 */
export function useSeguimientoRealtime(
  onCambio: () => void,
  debounceMs = 500,
  puerto: SeguimientoRealtimePort = new SupabaseSeguimientoRealtime(),
): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = puerto.suscribir(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(onCambio, debounceMs);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [onCambio, debounceMs, puerto]);
}