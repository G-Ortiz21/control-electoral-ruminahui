import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, withTiming, withRepeat, useAnimatedStyle } from 'react-native-reanimated';

/**
 * Esqueleto de carga con brillo (shimmer) animado por Reanimated. Solo
 * presentación; no depende de datos ni de estado de red.
 */
export function SkeletonCarga({ ancho, alto }: { ancho: number; alto: number }) {
  const x = useSharedValue(-140);

  useEffect(() => {
    x.value = withRepeat(withTiming(ancho + 140, { duration: 1400 }), -1, true);
  }, [ancho]);

  const estiloBrillo = useAnimatedStyle(() => ({
    left: x.value,
  }));

  return (
    <View className="bg-foreground/10 rounded-xl overflow-hidden" style={{ width: ancho, height: alto }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 140,
          },
          estiloBrillo,
        ]}
        className="bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)]"
      />
    </View>
  );
}
