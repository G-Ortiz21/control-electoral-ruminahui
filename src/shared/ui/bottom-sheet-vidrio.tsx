import { useEffect } from 'react';
import { Dimensions, PanResponder, Pressable, Text, View } from 'react-native';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, useAnimatedReaction } from 'react-native-reanimated';

import { CLASES } from './theme';

const { height: ALTO_PANTALLA } = Dimensions.get('window');

/**
 * Hoja inferior de vidrio (no es un modal): se desliza hacia arriba con
 * Reanimated (300 ms), se cierra tocando el trasfondo o el indicador, y
 * contiene acciones secundarias. Estilo de vidrio (DI-05).
 */
export function BottomSheetVidrio({
  visible,
  onCerrar,
  niños,
  alturaMax = 0.75,
}: {
  visible: boolean;
  onCerrar: () => void;
  niños: React.ReactNode;
  alturaMax?: number;
}) {
  const y = useSharedValue(visible ? ALTO_PANTALLA * 0.1 : ALTO_PANTALLA);
  const trasfondo = useSharedValue(0);

  useAnimatedReaction(
    () => visible,
    (v) => {
      y.value = withTiming(v ? ALTO_PANTALLA * 0.1 : ALTO_PANTALLA, { duration: 300 });
      trasfondo.value = withTiming(v ? 0.45 : 0, { duration: 300 });
    }
  );

  const estiloHoja = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  const estiloTrasfondo = useAnimatedStyle(() => ({
    opacity: trasfondo.value,
  }));

  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (e, gestureState) => {
      y.value = Math.max(ALTO_PANTALLA * 0.1, ALTO_PANTALLA - gestureState.dy);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.vy < -1 || gestureState.dy < -ALTO_PANTALLA * 0.15) {
        y.value = withTiming(ALTO_PANTALLA * 0.1, { duration: 250 });
      } else {
        y.value = withTiming(ALTO_PANTALLA, { duration: 250 });
        setTimeout(() => onCerrar(), 250);
      }
    },
  });

  const alturaHoja = ALTO_PANTALLA * alturaMax;

  return (
    <View className="flex-1">
      <Pressable
        onPress={onCerrar}
        accessibilityLabel="Cerrar hoja de opciones"
        style={[estiloTrasfondo as unknown as never, { position: 'absolute', inset: 0, backgroundColor: '#0B1F4B' }]}
      />
      <Animated.View
        {...responder.panHandlers}
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: alturaHoja,
          },
          estiloHoja,
        ]}
        className={`${CLASES.vidrio} border-t-0 border-b-0 border-l-0 border-r-0 rounded-t-[24px] overflow-hidden`}
      >
        <View className="w-full items-center pb-2 pt-1">
          <View className="w-12 h-1 rounded-full bg-foreground/30" />
        </View>
        <View className="px-5 pb-4">{niños}</View>
      </Animated.View>
    </View>
  );
}
