import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { CLASE_ROL } from './theme';

const LABEL_POR_ROL: Record<'PROVINCIAL' | 'COORDINADOR' | 'VEEDOR', string> = {
  PROVINCIAL: 'Provincial',
  COORDINADOR: 'Coordinador de recinto',
  VEEDOR: 'Veedor',
};

/**
 * Sol naciente estilizado (logotipo de Movimiento Horizonte Ciudadano, DI-05),
 * creado con formas simples en SVG.
 */
function SolNaciente({ size = 26, color }: { size?: number; color: string }) {
  const cx = size / 2;
  const cy = size / 2;
  const rInt = size * 0.3;
  const rExt = size * 0.46;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angulo, i) => {
        const rad = (angulo * Math.PI) / 180;
        const x1 = cx + Math.cos(rad) * rInt;
        const y1 = cy + Math.sin(rad) * rInt;
        const x2 = cx + Math.cos(rad) * rExt;
        const y2 = cy + Math.sin(rad) * rExt;
        return (
          <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
        );
      })}
      <Circle cx={cx} cy={cy} r={size * 0.28} fill={color} />
    </Svg>
  );
}

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
        <SolNaciente size={28} color="#0B1F4B" />
        <Text className="font-semibold text-foreground">{titulo ?? LABEL_POR_ROL[rol]}</Text>
      </View>
      <View className="flex-row items-center gap-1.5 mt-2">
        <View className={`flex-row items-center gap-1.5 px-2.5 py-0.5 rounded-full ${colorRol} text-texto-sobre-color text-[11px] font-semibold`}>
          <SolNaciente size={10} color="white" />
          <Text>{LABEL_POR_ROL[rol]}</Text>
        </View>
        <Text className="text-texto-secundario text-[13px]">
          {recinto}{jrv ? ` · JRV ${jrv}` : ''}
        </Text>
      </View>
    </View>
  );
}
