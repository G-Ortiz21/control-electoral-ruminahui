import { Text, View } from 'react-native';
import LottieView from 'lottie-react-native';

/** Animaciones propias (DI-05); JSON en assets/lottie (pulido fino en fase 8). */
export type TipoFeedback = 'carga' | 'exito' | 'error' | 'sin-conexion';

const ANIMACIONES: Record<TipoFeedback, unknown> = {
  carga: require('../../../assets/lottie/carga.json'),
  exito: require('../../../assets/lottie/exito.json'),
  error: require('../../../assets/lottie/error.json'),
  'sin-conexion': require('../../../assets/lottie/sin-conexion.json'),
};

type PropiedadesFeedback = {
  tipo: TipoFeedback;
  /** Texto accesible y visible siempre (ADR-12). */
  mensaje: string;
  /** Repetir la animación aunque no sea de carga. */
  animando?: boolean;
};

/**
 * Retroalimentación visual con Lottie + texto (ADR-12).
 * Sustituye a Alert.alert para los estados de proceso, éxito, fallo y sin conexión.
 */
export function LottieFeedback({ tipo, mensaje, animando = false }: PropiedadesFeedback) {
  const esCarga = tipo === 'carga';
  return (
    <View accessibilityRole="text" accessibilityLabel={mensaje} className="items-center gap-2">
      <LottieView
        source={ANIMACIONES[tipo] as never}
        autoPlay={esCarga || animando}
        loop={esCarga}
        style={{ width: 160, height: 160 }}
      />
      <Text className="text-center text-base text-foreground">{mensaje}</Text>
    </View>
  );
}
