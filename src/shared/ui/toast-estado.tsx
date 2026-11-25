import { useEffect } from 'react';
import { Dimensions, Platform, Text, View } from 'react-native';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LottieFeedback } from './lottie-feedback';

type TipoToast = 'exito' | 'error' | 'carga' | 'sin-conexion';

const CLASE_POR_TIPO: Record<TipoToast, string> = {
  exito: 'bg-success text-texto-sobre-color',
  error: 'bg-error text-texto-sobre-color',
  carga: 'bg-primary text-texto-sobre-color',
  'sin-conexion': 'bg-warning text-foreground',
};

/**
 * Toast no modal: aparece abajo con Reanimated (300 ms), se oculta solo y puede
 * cerrarse tocando. No es un modal ni usa Alert.alert.
 */
export function ToastEstado({
  visible,
  tipo = 'exito',
  mensaje,
  duracionMs = 4000,
  onCerrar,
}: {
  visible: boolean;
  tipo?: TipoToast;
  mensaje: string;
  duracionMs?: number;
  onCerrar?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const y = useSharedValue(visible ? 0 : Dimensions.get('window').height);
  const opacidad = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout> | null = null;
    if (visible) {
      y.value = withTiming(0, { duration: 300 });
      opacidad.value = withTiming(1, { duration: 300 });
      temporizador = setTimeout(() => {
        y.value = withTiming(Dimensions.get('window').height, { duration: 300 });
        opacidad.value = withTiming(0, { duration: 300 });
      }, duracionMs);
    } else {
      y.value = withTiming(Dimensions.get('window').height, { duration: 300 });
      opacidad.value = withTiming(0, { duration: 300 });
    }
    return () => {
      if (temporizador) clearTimeout(temporizador);
    };
  }, [visible, duracionMs]);

  const estiloContenedor = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacidad.value,
  }));

  if (!visible && opacidad.value === 0) return null;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: 20 + insets.bottom,
          minHeight: 56,
        },
        estiloContenedor,
      ]}
    >
      <View className={`flex-row items-center gap-2.5 px-4 py-3 rounded-22 ${CLASE_POR_TIPO[tipo]} shadow-suave-azul`}>
        <LottieFeedback
          tipo={tipo === 'sin-conexion' ? 'sin-conexion' : tipo === 'error' ? 'error' : 'exito'}
          mensaje=""
          animando={tipo === 'carga'}
        />
        <Text className="text-base font-semibold text-center flex-1">{mensaje}</Text>
        {onCerrar && (
          <Text className="text-[12px] underline text-texto-sobre-color opacity-80" onPress={onCerrar}>
            Cerrar
          </Text>
        )}
      </View>
    </Animated.View>
  );
}
