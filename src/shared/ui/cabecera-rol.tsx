import { Text, View } from 'react-native';

import { CLASE_ROL } from './theme';
import { LogoSolNaciente } from './logo-sol-naciente';

const LABEL_POR_ROL: Record<'PROVINCIAL' | 'COORDINADOR' | 'VEEDOR', string> = {
  PROVINCIAL: 'Provincial',
  COORDINADOR: 'Coordinador de recinto',
  VEEDOR: 'Veedor',
};

/**
 * Cabecera de rol: logo sol naciente + chip de rol con el acento del rol +
 * recinto / JRV. Sustituye a las cabeceras genéricas de las pantallas.
 */
export function CabeceraRol({
  rol,
  recinto,
  jrv,
  titulo,
}: {
  rol: 'PROVINCIAL' | 'COORDINADOR' | 'VEEDOR';
  recinto: string;
  jrv?: string;
  titulo?: string;
}) {
  const colorRol = CLASE_ROL[rol];
  return (
    <View className="px-4 pt-4 pb-3">
      <View className="flex-row items-center gap-2">
        <LogoSolNaciente size={28} color="#0B1F4B" />
        <Text className="font-semibold text-foreground">{titulo ?? LABEL_POR_ROL[rol]}</Text>
      </View>
      <View className="flex-row items-center gap-1.5 mt-2">
        <View className={`flex-row items-center gap-1.5 px-2.5 py-0.5 rounded-full ${colorRol} text-texto-sobre-color text-[11px] font-semibold`}>
          <LogoSolNaciente size={10} color="white" />
          <Text>{LABEL_POR_ROL[rol]}</Text>
        </View>
        <Text className="text-texto-secundario text-[13px]">
          {recinto}{jrv ? ` · JRV ${jrv}` : ''}
        </Text>
      </View>
    </View>
  );
}
