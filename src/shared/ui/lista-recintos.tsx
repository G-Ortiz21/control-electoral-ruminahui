import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';

import type { ResultadoOrganizacion } from '@/modules/seguimiento/domain';
import { BarrasCandidatos } from './barras-candidatos';

export interface RecintoAvance {
  readonly id: string;
  readonly nombre: string;
  readonly jrvTotal: number;
  readonly jrvConResultados: number;
  readonly jrvRespaldadas: number;
}

export interface ListaRecintosProps {
  recintos: readonly RecintoAvance[];
  candidatosPorRecinto: Record<string, readonly ResultadoOrganizacion[]>;
  totalVotosPorRecinto?: Record<string, number>;
  expandedId?: string | null;
  onSeleccionar?: (recinto: RecintoAvance) => void;
}

/**
 * Lista de recintos con mini-barra de avance. Tocar expande y muestra las
 * barras de candidatos del recinto con animación de layout (un solo valor
 * animado Reanimated).
 */
export function ListaRecintos({
  recintos,
  candidatosPorRecinto,
  totalVotosPorRecinto,
  expandedId,
  onSeleccionar,
}: ListaRecintosProps) {
  const altoExpandido = useSharedValue(0);

  useEffect(() => {
    altoExpandido.value = withTiming(expandedId != null ? 300 : 0, { duration: 350 });
  }, [expandedId]);

  const estiloContenido = useAnimatedStyle(() => ({
    height: altoExpandido.value,
    opacity: altoExpandido.value > 10 ? 1 : 0,
    overflow: 'hidden',
  }));

  return (
    <View className="w-full">
      {recintos.map((recinto) => {
        const expandido = expandedId === recinto.id;
        const total = totalVotosPorRecinto?.[recinto.id] ?? 0;
        const candidatos = (candidatosPorRecinto[recinto.id] ?? []).slice().sort((a, b) => b.votos - a.votos);
        const pctResultados = recinto.jrvTotal <= 0 ? 0 : Math.round((recinto.jrvConResultados / recinto.jrvTotal) * 100);
        return (
          <View key={recinto.id} className="mb-3">
            <Pressable
              onPress={() => onSeleccionar?.(recinto)}
              accessibilityRole="button"
              accessibilityLabel={`Recinto ${recinto.nombre}`}
              className="flex-row items-center justify-between px-3 py-2.5 rounded-22 bg-white/[0.72] border border-white/[0.9] shadow-suave-azul"
            >
              <View className="flex-1">
                <Text className="font-semibold text-foreground">{recinto.nombre}</Text>
                <Text className="text-[11px] text-texto-secundario">
                  {recinto.jrvConResultados} de {recinto.jrvTotal} JRV con resultados ({pctResultados} %)
                </Text>
              </View>
              <View className="w-20 h-3 bg-foreground/10 rounded-full overflow-hidden">
                <View className="h-full bg-primary" style={{ width: `${Math.min(100, pctResultados)}%` }} />
              </View>
            </Pressable>
            <Animated.View style={estiloContenido} className="mt-1 px-3 pb-2">
              {expandido && (
                <BarrasCandidatos candidatos={candidatos} totalVotos={total} />
              )}
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
}
