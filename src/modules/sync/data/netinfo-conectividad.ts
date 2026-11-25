import NetInfo from '@react-native-community/netinfo';
import type { ConectividadPort } from '../domain';

// Último estado de conectividad conocido (por defecto true para no bloquear
// el arranque ni asumir sin conexión en el primer render).
let ultimoEstadoConectado = true;

// Suscripción global para mantener el último estado conocido sincronizable
// de forma síncrona (NetInfo.fetch es asíncrono).
NetInfo.addEventListener((state) => {
  ultimoEstadoConectado = Boolean(state.isConnected);
});

/**
 * Estado crudo de la red para refrescos de UI (RNF-08).
 * Conserva los `null` de NetInfo: significan «aún desconocido».
 */
export interface EstadoRed {
  conectado: boolean | null;
  alcanzable: boolean | null;
}

export class NetInfoConectividad implements ConectividadPort {
  estaConectado(): boolean {
    return ultimoEstadoConectado;
  }

  suscribir(cb: (conectado: boolean) => void): () => void {
    const unsub = NetInfo.addEventListener((state) => {
      cb(Boolean(state.isConnected));
    });
    return () => unsub();
  }

  /**
   * Suscripción al estado completo de la red para detectar recuperaciones
   * (interfaz de red + alcanzabilidad de internet), a diferencia de
   * `suscribir`, que solo informa si hay interfaz. Devuelve la función de
   * desuscripción para liberarla al desmontar.
   */
  suscribirRed(cb: (estado: EstadoRed) => void): () => void {
    const unsub = NetInfo.addEventListener((state) => {
      cb({ conectado: state.isConnected, alcanzable: state.isInternetReachable });
    });
    return () => unsub();
  }
}
