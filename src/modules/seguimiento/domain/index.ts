/** Reglas y puertos de seguimiento (agregados, avance, JRV reportadas). */
export interface SeguimientoCambio {
  tabla: 'actas' | 'votos_acta';
}

export interface SeguimientoRealtimePort {
  /** Suscribe a cambios de actas/votos. Devuelve función de desuscripción. */
  suscribir(cb: (cambio: SeguimientoCambio) => void): () => void;
}

export * from './calculos';