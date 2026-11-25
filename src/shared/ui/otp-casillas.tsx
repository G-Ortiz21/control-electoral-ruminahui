import { useRef } from 'react';
import { Text, TextInput, View, Pressable } from 'react-native';

/**
 * OTP en casillas grandes (DI-05, accesible). Presentacional: valor/controlado por props.
 */
export function OtpCasillas({
  valor,
  onChange,
  longitud = 6,
  error,
}: {
  valor: string;
  onChange: (v: string) => void;
  longitud?: number;
  error?: string | null;
}) {
  const inputRef = useRef<any>(null);
  const digitos = Array.from({ length: longitud }, (_, i) => valor[i] ?? '');

  return (
    <View className="gap-2">
      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessibilityRole="button"
        accessibilityLabel="Ingresar código OTP"
        className="flex-row justify-center gap-2"
      >
        {digitos.map((d, i) => {
          const activo = i === valor.length;
          return (
            <View
              key={i}
              className={`h-14 w-12 items-center justify-center rounded-xl border ${activo ? 'border-primary bg-primary/5' : 'border-foreground/20 bg-white/70'} ${error ? 'border-error' : ''}`}
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
