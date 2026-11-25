import { Text, TextInput, View } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  useAnimatedStyle,
  useAnimatedReaction,
} from 'react-native-reanimated';

import { MEDIDAS } from './theme';
import { FUENTES } from './usar-fuentes';

const CLASE_ETIQUETA = 'text-base font-semibold text-foreground';

/**
 * Campo numérico grande (cifras en JetBrains Mono, DI-05). Cuando llega un error
 * de validación, sacude el campo con Reanimated y muestra el mensaje debajo.
 * Nunca usa Alert.alert.
 */
export function CampoNumerico({
  valor,
  onChangeText,
  etiqueta,
  error,
  placeholder = '0',
  accesibilidadLabel,
}: {
  valor: string;
  onChangeText: (texto: string) => void;
  etiqueta: string;
  error?: string | null;
  placeholder?: string;
  accesibilidadLabel?: string;
}) {
  const sacudida = useSharedValue(0);
  const errorPrevio = useSharedValue(Boolean(error));

  useAnimatedReaction(
    () => Boolean(error),
    (tieneError, previo) => {
      if (tieneError && !previo) {
        sacudida.value = withRepeat(
          withSequence(
            withTiming(-12, { duration: 50 }),
            withTiming(12, { duration: 50 }),
            withTiming(0, { duration: 50 })
          ),
          2
        );
      } else if (!tieneError) {
        sacudida.value = withTiming(0, { duration: 100 });
      }
    }
  );

  const estiloInput = useAnimatedStyle(() => ({
    transform: [{ translateX: sacudida.value }],
  }));

  const tieneError = Boolean(error);

  return (
    <View className="mb-2">
      <View className="gap-1">
        <Text className={CLASE_ETIQUETA}>{etiqueta}</Text>
      </View>
      <Animated.View style={estiloInput}>
        <TextInput
          accessibilityRole="text"
        accessibilityLabel={accesibilidadLabel ?? etiqueta}
        keyboardType="numeric"
        placeholder={placeholder}
        value={valor}
        onChangeText={onChangeText}
        className={`h-16 rounded-xl border border-foreground/20 px-4 text-lg ${FUENTES.cifras} text-foreground ${
          tieneError ? 'border-error' : ''
        }`}
        />
      </Animated.View>
      {tieneError && (
        <Animated.View style={{ transform: [{ translateX: sacudida.value }] }}>
          <Text className="mt-1 text-sm text-error">{error}</Text>
        </Animated.View>
      )}
    </View>
  );
}
