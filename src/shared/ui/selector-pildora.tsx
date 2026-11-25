import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';

/**
 * Selector de pílula (Alcaldía / Prefectura / Por recinto) con indicador
 * animado bajo la opción activa. Puromente presentacional: recibe datos por props.
 */
export type OpcionPildora = { id: string; label: string };

export function SelectorPildora({
  opciones,
  valor,
  onCambio,
}: {
  opciones: readonly OpcionPildora[];
  valor: string;
  onCambio: (id: string) => void;
}) {
  const indiceActivo = opciones.findIndex((o) => o.id === valor);
  const translateX = useSharedValue(0);
  const anchoIndicador = useSharedValue(0);

  useEffect(() => {
    const activo = opciones[indiceActivo];
    if (!activo) return;
    // La posición se fija en onLayout de la pílula activa; este efecto solo
    // garantiza que no quede valores huérfanos si las opciones cambian.
  }, [opciones, valor, indiceActivo]);

  return (
    <View className="w-full" style={{ position: 'relative' }}>
      <View className="flex-row w-full overflow-hidden">
        {opciones.map((opcion) => {
          const activa = opcion.id === valor;
          return (
            <Pressable
              key={opcion.id}
              onPress={() => onCambio(opcion.id)}
              accessibilityRole="button"
              accessibilityLabel={opcion.label}
              onLayout={(e) => {
                if (activa) {
                  const { width, x } = e.nativeEvent.layout;
                  translateX.value = withTiming(x, { duration: 300 });
                  anchoIndicador.value = width;
                }
              }}
              className={`flex-1 items-center justify-center py-2.5 ${activa ? 'bg-primary text-texto-sobre-color' : 'bg-foreground/10 text-foreground'}`}
            >
              <Text className="text-sm font-semibold text-center">{opcion.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Animated.View
        style={useAnimatedStyle(() => ({
          transform: [{ translateX: translateX.value }],
          width: anchoIndicador.value,
          height: 3,
          backgroundColor: '#1D4ED8',
          borderRadius: 2,
          position: 'absolute',
          bottom: 0,
        }))}
      />
    </View>
  );
}
