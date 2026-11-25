import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { ResultadoOrganizacion } from '@/modules/seguimiento/domain';

const RADIO = 86;
const GROSOR = 20;
const CENTRO = RADIO + GROSOR / 2;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

/** Ángulos medidos desde las 12 en punto, en el sentido de las agujas del reloj. */
function caminoArco(inicioRad: number, finRad: number): string {
  const x0 = CENTRO + RADIO * Math.sin(inicioRad);
  const y0 = CENTRO - RADIO * Math.cos(inicioRad);
  const x1 = CENTRO + RADIO * Math.sin(finRad);
  const y1 = CENTRO - RADIO * Math.cos(finRad);
  const arcoGrande = finRad - inicioRad > Math.PI ? 1 : 0;
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${RADIO},${RADIO} 0 ${arcoGrande} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

export interface DonutParticipacionProps {
  candidatos: readonly ResultadoOrganizacion[];
  totalVotos: number;
  seleccionadaId?: string | null;
  onSeleccionar?: (id: string) => void;
}

/**
 * Donut de participación por organización (SVG). Tocar un segmento cambia la
 * cifra central. Incluye alternativa en texto con todas las cifras.
 */
export function DonutParticipacion({
  candidatos,
  totalVotos,
  seleccionadaId,
  onSeleccionar,
}: DonutParticipacionProps) {
  const [seleccionInterna, setSeleccionInterna] = useState<string | null>(null);
  const idSeleccionada = seleccionadaId ?? seleccionInterna;
  const total = totalVotos <= 0 ? 0 : totalVotos;
  let fraccionAcumulada = 0;
  const segmentos: Array<{
    organizacion: ResultadoOrganizacion;
    inicio: number;
    fin: number;
    porcentaje: number;
  }> = [];

  for (const c of candidatos) {
    const fraccion = total <= 0 ? 0 : c.votos / total;
    const inicio = -Math.PI / 2 + fraccionAcumulada * 2 * Math.PI;
    const fin = inicio + fraccion * 2 * Math.PI;
    segmentos.push({ organizacion: c, inicio, fin, porcentaje: fraccion * 100 });
    fraccionAcumulada += fraccion;
  }

  const seleccionada = candidatos.find((c) => c.organizacionId === idSeleccionada);

  return (
    <View className="w-full items-center">
      <Svg width={CENTRO * 2} height={CENTRO * 2}>
        <Circle cx={CENTRO} cy={CENTRO} r={RADIO} stroke="#E2E8F0" strokeWidth={GROSOR} fill="none" />
        {segmentos.map((s) => (
          <Path
            key={s.organizacion.organizacionId}
            d={caminoArco(s.inicio, s.fin)}
            stroke={s.organizacion.color}
            strokeWidth={GROSOR}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${(CIRCUNFERENCIA * s.porcentaje) / 100},${CIRCUNFERENCIA}`}
            onPress={() => {
              setSeleccionInterna(s.organizacion.organizacionId);
              onSeleccionar?.(s.organizacion.organizacionId);
            }}
          />
        ))}
      </Svg>
      <View className="mt-3 flex-row items-center gap-2">
        <Text className="text-[11px] font-mono font-bold text-foreground">
          {seleccionada ? seleccionada.votos.toLocaleString() : total.toLocaleString()}
        </Text>
        <Text className="text-[11px] text-texto-secundario">
          {seleccionada ? seleccionada.organizacionNombre : 'votos totales'}
        </Text>
      </View>
      {/* Alternativa en texto: nunca depende solo del color. */}
      <View className="mt-2">
        <Text className="text-[12px] text-texto-secundario">Participación por organización:</Text>
        {candidatos.map((c) => (
          <Text key={c.organizacionId} className="text-sm text-foreground">
            {c.organizacionNombre}: {c.votos.toLocaleString()} votos (
            {total <= 0 ? '0,0' : ((c.votos / total) * 100).toFixed(1)} %)
          </Text>
        ))}
      </View>
    </View>
  );
}
