import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const CENTRO = 70;
const RADIO_EXTERNO = 62;
const RADIO_INTERNO = 44;
const GROSOR = 10;
const CIRCUNFERENCIA_EXTERNO = 2 * Math.PI * RADIO_EXTERNO;
const CIRCUNFERENCIA_INTERNO = 2 * Math.PI * RADIO_INTERNO;

export interface AnillosAvanceProps {
  jrvTotal: number;
  jrvConResultados: number;
  jrvRespaldadas: number;
}

/**
 * Dos anillos concéntricos (SVG): «JRV con resultados» y «JRV respaldadas»
 * (DI-02), con porcentaje en el centro. Incluye alternativa en texto.
 */
export function AnillosAvance({
  jrvTotal,
  jrvConResultados,
  jrvRespaldadas,
}: AnillosAvanceProps) {
  const total = jrvTotal <= 0 ? 1 : jrvTotal;
  const fraccionResultados = Math.min(1, Math.max(0, jrvConResultados / total));
  const fraccionRespaldadas = Math.min(1, Math.max(0, jrvRespaldadas / total));

  const offsetExterno = CIRCUNFERENCIA_EXTERNO * (1 - fraccionResultados);
  const offsetInterno = CIRCUNFERENCIA_INTERNO * (1 - fraccionRespaldadas);

  const pctResultados = jrvTotal <= 0 ? 0 : Math.round((jrvConResultados / jrvTotal) * 100);
  const pctRespaldadas = jrvTotal <= 0 ? 0 : Math.round((jrvRespaldadas / jrvTotal) * 100);

  return (
    <View className="w-full items-center">
      <Svg width={CENTRO * 2} height={CENTRO * 2}>
        <Circle cx={CENTRO} cy={CENTRO} r={RADIO_EXTERNO} stroke="#E2E8F0" strokeWidth={GROSOR} fill="none" />
        <Circle
          cx={CENTRO}
          cy={CENTRO}
          r={RADIO_EXTERNO}
          stroke="#1D4ED8"
          strokeWidth={GROSOR}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${CIRCUNFERENCIA_EXTERNO},${CIRCUNFERENCIA_EXTERNO}`}
          strokeDashoffset={offsetExterno}
        />
        <Circle cx={CENTRO} cy={CENTRO} r={RADIO_INTERNO} stroke="#E2E8F0" strokeWidth={GROSOR} fill="none" />
        <Circle
          cx={CENTRO}
          cy={CENTRO}
          r={RADIO_INTERNO}
          stroke="#0E7490"
          strokeWidth={GROSOR}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${CIRCUNFERENCIA_INTERNO},${CIRCUNFERENCIA_INTERNO}`}
          strokeDashoffset={offsetInterno}
        />
      </Svg>
      <View className="mt-3 flex-row gap-4 text-center">
        <View>
          <Text className="text-[11px] font-mono font-bold text-foreground">{pctResultados} %</Text>
          <Text className="text-[10px] text-texto-secundario">JRV con resultados</Text>
        </View>
        <View>
          <Text className="text-[11px] font-mono font-bold text-foreground">{pctRespaldadas} %</Text>
          <Text className="text-[10px] text-texto-secundario">JRV respaldadas</Text>
        </View>
      </View>
      {/* Alternativa en texto: nunca depende solo del color. */}
      <View className="mt-2">
        <Text className="text-sm text-foreground">
          Avance: {jrvConResultados} de {jrvTotal} JRV con resultados ({pctResultados} %); {jrvRespaldadas} de
          {jrvTotal} JRV respaldadas ({pctRespaldadas} %).
        </Text>
      </View>
    </View>
  );
}
