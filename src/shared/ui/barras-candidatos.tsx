import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import type { ResultadoOrganizacion } from '@/modules/seguimiento/domain';

export interface BarrasCandidatosProps {
  candidatos: readonly ResultadoOrganizacion[];
  totalVotos: number;
  /** ID de organización que acaba de cambiar (llega acta nueva): pulso. */
  candidatoCambiado?: string | null;
  /** Recintos donde lidera cada organización, para el detalle al tocar. */
  recintosLideraPorOrg?: Record<string, string[]>;
  onSeleccionar?: (candidato: ResultadoOrganizacion & { porcentaje: number }) => void;
}

function FilaBarraCandidato({
  candidato,
  totalVotos,
  esCambiado,
  seleccionada,
  onPress,
}: {
  candidato: ResultadoOrganizacion;
  totalVotos: number;
  esCambiado: boolean;
  seleccionada: boolean;
  onPress: () => void;
}) {
  const progreso = useSharedValue(0);
  const escala = useSharedValue(1);
  const porcentaje = totalVotos <= 0 ? 0 : (candidato.votos / totalVotos) * 100;

  useEffect(() => {
    progreso.value = 0;
    progreso.value = withTiming(1, { duration: 500 });
  }, [candidato.votos, totalVotos, progreso]);

  useEffect(() => {
    if (esCambiado) {
      escala.value = withRepeat(
        withSequence(withTiming(1.04, { duration: 160 }), withTiming(1, { duration: 160 })),
        2,
        false,
      );
    } else {
      escala.value = withTiming(1, { duration: 150 });
    }
  }, [esCambiado, escala]);

  const estiloBarra = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(100, porcentaje)) * progreso.value}%`,
  }));

  const estiloFila = useAnimatedStyle(() => ({
    transform: [{ scale: escala.value }],
  }));

  return (
    <Animated.View style={estiloFila} className={`mb-3 rounded-xl p-2 ${esCambiado ? 'border border-secondary/60 bg-secondary/10' : ''}`}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${candidato.organizacionNombre}: ${candidato.votos} votos, ${porcentaje.toFixed(1)} por ciento`}
        className="flex-row items-center gap-3"
      >
        <View className="w-24">
          <Text numberOfLines={1} className="text-[13px] text-texto-secundario">
            {candidato.organizacionNombre}
          </Text>
        </View>
        <View className="flex-1 h-3 bg-foreground/10 rounded-full overflow-hidden">
          <Animated.View style={[estiloBarra, { height: '100%', backgroundColor: candidato.color }]} />
        </View>
        <View className="w-20">
          <Text className="text-right text-[13px] font-mono font-bold text-foreground">
            {candidato.votos.toLocaleString()} ({porcentaje.toFixed(1)}%)
          </Text>
        </View>
      </Pressable>
      {seleccionada && (
        <View className="mt-2 rounded-lg bg-foreground/5 px-3 py-2">
          <Text className="text-[12px] text-texto-secundario">Detalle</Text>
          <Text className="text-sm text-foreground">
            Votos: <Text className="font-mono font-bold">{candidato.votos.toLocaleString()}</Text> · {porcentaje.toFixed(1)}%
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

/**
 * Barras horizontales ordenadas por votos. Color = organizaciones.color, cifra
 * en mono. Al cambiar datos, crecen con animación; tocar abre detalle; la barra
 * cambiada pulsa. Incluye alternativa en texto.
 */
export function BarrasCandidatos({
  candidatos,
  totalVotos,
  candidatoCambiado,
  recintosLideraPorOrg,
  onSeleccionar,
}: BarrasCandidatosProps) {
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const ordenados = [...candidatos].sort((a, b) => b.votos - a.votos || a.organizacionNombre.localeCompare(b.organizacionNombre));

  return (
    <View className="w-full">
      {ordenados.map((candidato) => {
        const porcentaje = totalVotos <= 0 ? 0 : (candidato.votos / totalVotos) * 100;
        const seleccionada = seleccionadoId === candidato.organizacionId;
        return (
          <View key={candidato.organizacionId}>
            <FilaBarraCandidato
              candidato={candidato}
              totalVotos={totalVotos}
              esCambiado={candidatoCambiado === candidato.organizacionId}
              seleccionada={seleccionada}
              onPress={() => {
                setSeleccionadoId((actual) => (actual === candidato.organizacionId ? null : candidato.organizacionId));
                onSeleccionar?.({ ...candidato, porcentaje });
              }}
            />
            {seleccionada && (
              <View className="mb-3 -mt-1 rounded-lg bg-foreground/5 px-3 py-2">
                <Text className="text-sm text-foreground">
                  Recintos donde lidera: {(recintosLideraPorOrg?.[candidato.organizacionId] ?? []).join(', ') || '—'}
                </Text>
              </View>
            )}
          </View>
        );
      })}
      {/* Alternativa en texto: nunca depende solo del color. */}
      <View className="mt-3">
        <Text className="text-[12px] text-texto-secundario">Votos por organización (texto):</Text>
        {ordenados.map((candidato) => {
          const p = totalVotos <= 0 ? 0 : (candidato.votos / totalVotos) * 100;
          return (
            <Text key={candidato.organizacionId} className="text-sm text-foreground">
              {candidato.organizacionNombre}: {candidato.votos.toLocaleString()} votos ({p.toFixed(1)}%)
            </Text>
          );
        })}
      </View>
    </View>
  );
}
