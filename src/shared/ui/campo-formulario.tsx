import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

/**
 * Contenedor presentacional de un campo: etiqueta, control, pista y error.
 * No valida: solo hace visibles las reglas y mensajes que ya existen.
 * La altura mínima del pie evita saltos de layout al aparecer un error.
 */
export function CampoFormulario({
  etiqueta,
  pista,
  error,
  valido,
  children,
}: {
  etiqueta: string;
  pista?: string;
  error?: string | null;
  valido?: boolean;
  children: ReactNode;
}) {
  const textoPie = error ?? (valido ? 'Correcto' : (pista ?? ''));
  const clasePie = error ? 'text-error' : valido ? 'text-success' : 'text-texto-secundario';

  return (
    <View className="gap-1">
      <Text className="text-sm font-semibold text-foreground">{etiqueta}</Text>
      {children}
      <Text className={`text-xs ${clasePie}`} style={{ minHeight: 16 }}>
        {textoPie}
      </Text>
    </View>
  );
}
