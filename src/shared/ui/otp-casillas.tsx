import { useRef } from 'react';
import { Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';

/**
 * OTP en casillas grandes (DI-05, accesible). Presentacional: valor/controlado por props.
 */
export function OtpCasillas({
  valor,
  onChange,
  longitud = 8,
  error,
}: {
  valor: string;
  onChange: (v: string) => void;
  longitud?: number;
  error?: string | null;
}) {
  const inputRef = useRef<any>(null);
  const { width } = useWindowDimensions();
  const digitos = Array.from({ length: longitud }, (_, i) => valor[i] ?? '');
  const gap = width < 380 ? 4 : 6;
  const boxW = Math.max(32, Math.min(48, Math.floor((width - 48 - gap * (longitud - 1)) / longitud)));

  return (
    <View className="gap-2">
      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessibilityRole="button"
        accessibilityLabel="Ingresar código OTP"
        className="flex-row justify-center"
        style={{ gap }}
      >
        {digitos.map((d, i) => {
          const activo = i === valor.length;
          return (
            <View
              key={i}
              className={`h-14 items-center justify-center rounded-xl border ${activo ? 'border-primary bg-primary/5' : 'border-foreground/20 bg-white/70'} ${error ? 'border-error' : ''}`}
              style={{ width: boxW }}
            >
              <Text className="text-xl font-mono font-bold text-foreground">{d}</Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={valor}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, longitud))}
        keyboardType="number-pad"
        maxLength={longitud}
        className="absolute h-0 w-0 opacity-0"
        accessibilityLabel="Código OTP"
      />
      {error ? <Text className="text-center text-sm text-error">{error}</Text> : null}
    </View>
  );
}
