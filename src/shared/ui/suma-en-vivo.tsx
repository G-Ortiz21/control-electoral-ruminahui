import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { evaluarCuadratura, porcentaje } from '@/modules/seguimiento/domain';
import type { DatosCuadratura } from '@/modules/seguimiento/domain';

const CENTRO = 52;
const RADIO = 44;
const GROSOR = 12;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

export interface SumaEnVivoProps {
  votos: readonly number[];
  blancos: number;
  nulos: number;
  sufragantes: number;
}

/**
 * Anillo que se llena según votos + blancos + nulos frente a los sufragantes
 * (formulario del acta). Verde si cuadra, ámbar si falta, rojo suave si sobra,
 * con texto «Faltan N votos» o «Sobran N votos».
 */
export function SumaEnVivo({ votos, blancos, nulos, sufragantes }: SumaEnVivoProps) {
  const datos: DatosCuadratura = { votos, blancos, nulos, sufragantes };
  const { diferencia, estado } = evaluarCuadratura(datos);
  const suma = votos.reduce((acc, v) => acc + v, 0) + blancos + nulos;
  const proporcion = sufragantes <= 0 ? 0 : Math.min(1, suma / sufragantes);

  const colorPorEstado: Record<typeof estado, string> = {
    CUADRA: '#15803D',
    FALTA: '#B45309',
    SOBRA: '#B91C1C',
  };

  return (
    <View className="w-full items-center">
      <Svg width={CENTRO * 2} height={CENTRO * 2}>
        <Circle cx={CENTRO} cy={CENTRO} r={RADIO} stroke="#E2E8F0" strokeWidth={GROSOR} fill="none" />
        <Circle
          cx={CENTRO}
          cy={CENTRO}
          r={RADIO}
          stroke={colorPorEstado[estado]}
          strokeWidth={GROSOR}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${CIRCUNFERENCIA},${CIRCUNFERENCIA}`}
          strokeDashoffset={CIRCUNFERENCIA * (1 - proporcion)}
        />
      </Svg>
      <View className="mt-2 text-center">
        <Text className={`font-mono font-bold text-foreground ${estado === 'CUADRA' ? 'text-success' : ''}`}>
          {estado === 'CUADRA' ? 'Cuadra' : estado === 'FALTA' ? `Faltan ${Math.abs(diferencia)} votos` : `Sobran ${diferencia} votos`}
        </Text>
        <Text className="text-[11px] text-texto-secundario">
          {suma.toLocaleString()} / {sufragantes.toLocaleString()} sufragantes
        </Text>
      </View>
    </View>
  );
}
