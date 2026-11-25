import { useState } from 'react';
import { TextInput, type KeyboardTypeOptions } from 'react-native';

import { TOKENS } from './theme';

/**
 * Entrada de texto presentacional (DI-05, revisión 4).
 * Conserva el valor, onChange/onBlur y secureTextEntry que recibe del formulario;
 * solo añade bordes por estado (normal, enfocado, válido, error). Nunca muestra
 * la contraseña automáticamente ni almacena su valor.
 */
export function CampoTexto({
  valor,
  onChangeText,
  onBlur,
  etiqueta,
  placeholder,
  teclado,
  seguro,
  error,
  valido,
  autoCapitalize = 'none',
}: {
  valor: string;
  onChangeText: (texto: string) => void;
  onBlur?: () => void;
  etiqueta: string;
  placeholder?: string;
  teclado?: KeyboardTypeOptions;
  seguro?: boolean;
  error?: string | null;
  valido?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  const [enfocado, setEnfocado] = useState(false);
  const borde = error
    ? 'border-error'
    : valido && !enfocado
      ? 'border-success'
      : enfocado
        ? 'border-primary'
        : 'border-foreground/20';

  return (
    <TextInput
      className={`h-14 w-full rounded-xl border bg-white/70 px-4 text-base text-foreground ${borde}`}
      placeholder={placeholder}
      placeholderTextColor={TOKENS.textoSecundario}
      keyboardType={teclado}
      autoCapitalize={autoCapitalize}
      secureTextEntry={seguro}
      value={valor}
      onChangeText={onChangeText}
      onFocus={() => setEnfocado(true)}
      onBlur={() => {
        setEnfocado(false);
        onBlur?.();
      }}
      accessibilityLabel={etiqueta}
    />
  );
}
