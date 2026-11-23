import { Pressable, Text } from 'react-native';

import { MEDIDAS } from './theme';

type Variante = 'primario' | 'secundario' | 'error';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-primary text-white',
  secundario: 'bg-secondary text-foreground',
  error: 'bg-error text-white',
};

type PropiedadesBoton = {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  accesibilidadLabel?: string;
};

/**
 * Botón propio (PROHIBIDO Alert.alert ni modales genéricos — usamos componentes propios).
 * Altura mínima 56 px y esquinas redondeadas (DI-05).
 */
export function Boton({ titulo, onPress, variante = 'primario', accesibilidadLabel }: PropiedadesBoton) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accesibilidadLabel ?? titulo}
      className={`h-14 w-full items-center justify-center rounded-xl px-6 active:opacity-80 ${VARIANTES[variante]}`}
      style={{ minHeight: MEDIDAS.alturaBotonMinima, borderRadius: MEDIDAS.radioRedondeado }}
    >
      <Text className="text-base font-semibold">{titulo}</Text>
    </Pressable>
  );
}
