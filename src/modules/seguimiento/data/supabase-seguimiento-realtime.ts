import { obtenerClienteSupabase } from '@/shared/infrastructure/supabase-client';
import type { SeguimientoCambio, SeguimientoRealtimePort } from '../domain';

export class SupabaseSeguimientoRealtime implements SeguimientoRealtimePort {
  suscribir(cb: (cambio: SeguimientoCambio) => void): () => void {
    const sb = obtenerClienteSupabase();
    if (!sb) return () => {};
    const channel = sb
      .channel('seguimiento-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actas' }, () => cb({ tabla: 'actas' }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votos_acta' }, () => cb({ tabla: 'votos_acta' }))
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }
}