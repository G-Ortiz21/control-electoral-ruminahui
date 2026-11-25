import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

import type { EstadoActa } from './status-badge';

/**
 * Paso del ciclo de vida de un acta/operación (vocabulario de estados, AGENTS.md).
 * Siempre: icono + texto + color. El paso activo pulsa con Reanimated.
 */
export const PASOS_ESTADO: readonly EstadoActa[] = [
  'GUARDADA_LOCAL',
  'SINCRONIZANDO',
  'RESULTADO_RECIBIDO',
  'EVIDENCIA_PENDIENTE',
  'EN_REVISION',
  'EVIDENCIA_RESPALDADA',
] as const;

const ESTILO_PASO: Record<EstadoActa, { etiqueta: string; clase: string }> = {
  BORRADOR: { etiqueta: 'Borrador', clase: 'bg-foreground/10 text-foreground' },
  PERMISO_REVOCADO: { etiqueta: 'Permiso revocado', clase: 'bg-error text-texto-sobre-color' },
  GUARDADA_LOCAL: { etiqueta: 'Guardada localmente', clase: 'bg-secondary text-foreground' },
  SINCRONIZANDO: { etiqueta: 'Sincronizando', clase: 'bg-accent text-texto-sobre-color' },
  RESULTADO_RECIBIDO: { etiqueta: 'Resultado recibido', clase: 'bg-primary text-texto-sobre-color' },
  EVIDENCIA_PENDIENTE: { etiqueta: 'Evidencia pendiente', clase: 'bg-warning text-texto-sobre-color' },
  EN_REVISION: { etiqueta: 'En revisión', clase: 'bg-accent text-texto-sobre-color' },
  EVIDENCIA_RESPALDADA: { etiqueta: 'Evidencia respaldada', clase: 'bg-success text-texto-sobre-color' },
  ERROR: { etiqueta: 'Error', clase: 'bg-error text-texto-sobre-color' },
  CONFLICTO_VERSION: { etiqueta: 'Conflicto de versión', clase: 'bg-error text-texto-sobre-color' },
};

function IconoPaso({ estado, color }: { estado: EstadoActa; color: string }) {
  switch (estado) {
    case 'GUARDADA_LOCAL':
      return (
        <Svg width={20} height={20} viewBox="0 0 20 20">
          <Circle cx={10} cy={10} r={9} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M7 10.5l2.5 2.5 6-6" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      );
    case 'SINCRONIZANDO':
      return (
        <Svg width={20} height={20} viewBox="0 0 20 20">
          <Circle cx={10} cy={10} r={9} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          <Polyline points="10,4 10,16" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          <Polyline points="4,10 16,10" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        </Svg>
      );
    case 'RESULTADO_RECIBIDO':
      return (
        <Svg width={20} height={20} viewBox="0 0 20 20">
          <Circle cx={10} cy={10} r={9} fill={color} />
          <Path d="M7 10l2.5 2.5 6-6" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      );
    case 'EVIDENCIA_PENDIENTE':
      return (
        <Svg width={20} height={20} viewBox="0 0 20 20">
          <Rect x={5} y={5} width={10} height={12} rx={1.5} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={10} cy={8.5} r={1} fill={color} />
        </Svg>
      );
    case 'EN_REVISION':
      return (
        <Svg width={20} height={20} viewBox="0 0 20 20">
          <Path d="M2 10a8 8 0 1 0 16 0 8 8 0 0 0-16 0" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          <Circle cx={10} cy={10} r={1.5} fill={color} />
        </Svg>
      );
    case 'EVIDENCIA_RESPALDADA':
      return (
        <Svg width={20} height={20} viewBox="0 0 20 20">
          <Circle cx={10} cy={10} r={9} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M7 10l2.5 2.5 6-6" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      );
    case 'ERROR':
    case 'CONFLICTO_VERSION':
      return (
        <Svg width={20} height={20} viewBox="0 0 20 20">
          <Circle cx={10} cy={10} r={9} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M7 7l6 6M13 7l-6 6" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      );
  }
}

export function PasoEstado({ estado, activo }: { estado: EstadoActa; activo: boolean }) {
  const estilo = ESTILO_PASO[estado];
  const escala = useSharedValue(1);

  useEffect(() => {
    if (activo) {
      escala.value = withRepeat(
        withSequence(withTiming(1.1, { duration: 300 }), withTiming(1, { duration: 300 })),
        -1
      );
    } else {
      escala.value = withTiming(1, { duration: 300 });
    }
  }, [activo]);

  const estiloIcono = useAnimatedStyle(() => ({
    transform: [{ scale: escala.value }],
  }));

  return (
    <View className="items-center gap-1.5">
      <Animated.View style={estiloIcono}>
        <IconoPaso estado={estado} color="#3B4A78" />
      </Animated.View>
      <View className={`px-2.5 py-1 rounded-full text-[11px] font-semibold leading-none ${activo ? estilo.clase : 'bg-foreground/10 text-texto-secundario'}`}>
        <Text>{activo ? estilo.etiqueta : '—'}</Text>
      </View>
    </View>
  );
}

/**
 * Stepper de estados: GUARDADA_LOCAL → SINCRONIZANDO → RESULTADO_RECIBIDO →
 * EVIDENCIA_PENDIENTE → EN_REVISION → EVIDENCIA_RESPALDADA; además ERROR y
 * CONFLICTO_VERSION como terminales. El activo pulsa.
 */
export function StepperEstado({ estado }: { estado: EstadoActa }) {
  const indiceActivo = PASOS_ESTADO.indexOf(estado);
  const esTerminal = estado === 'ERROR' || estado === 'CONFLICTO_VERSION';

  return (
    <View className="w-full">
      <View className="flex-row gap-1">
        {PASOS_ESTADO.map((paso) => {
          const completado = indiceActivo !== -1 && PASOS_ESTADO.indexOf(paso) < indiceActivo;
          const esActivo = paso === estado;
          const esUltimo = paso === PASOS_ESTADO[PASOS_ESTADO.length - 1];
          return (
            <View key={paso} className="flex-1 items-center">
              <PasoEstado estado={paso} activo={esActivo} />
              {!esUltimo && (
                <View
                  className="mx-2 h-0.5 self-center"
                  style={{ backgroundColor: '#3B4A78', opacity: completado ? 1 : 0.35 }}
                />
              )}
            </View>
          );
        })}
      </View>
      {esTerminal && (
        <View className="mt-3 flex-row items-center gap-2 pl-1">
          <IconoPaso estado={estado} color="#B91C1C" />
          <Text className="text-sm font-semibold text-error">{ESTILO_PASO[estado].etiqueta}</Text>
        </View>
      )}
    </View>
  );
}
