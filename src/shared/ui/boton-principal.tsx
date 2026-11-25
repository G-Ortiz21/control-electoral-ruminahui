import { Pressable, Text } from 'react-native';

import { MEDIDAS, CLASE_ROL, TEXTO_ROL } from './theme';

export type RolAcento = 'PROVINCIAL' | 'COORDINADOR' | 'VEEDOR';

/**
 * Botón principal con el acento del rol (provincial #1D4ED8 azul, coordinador
 * #6D28D9 violeta, veedor #0E7490 turquesa). Altura mínima 56 px y texto blanco
 * sobre el color del rol (contraste verificado en DI-05 revisión 3).
 */
export function BotonPrincipal({
  titulo,
  onPress,
  rol = 'PROVINCIAL',
  accesibilidadLabel,
  disabled,
}: {
  titulo: string;
  onPress: () => void;
  rol?: RolAcento;
  accesibilidadLabel?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accesibilidadLabel ?? titulo}
      className={`w-full items-center justify-center ${CLASE_ROL[rol]} ${TEXTO_ROL[rol]} active:opacity-80`}
      style={{ minHeight: MEDIDAS.alturaBotonMinima, borderRadius: MEDIDAS.radioRedondeado }}
    >
      <Text className="text-base font-semibold">{titulo}</Text>
    </Pressable>
  );
}
