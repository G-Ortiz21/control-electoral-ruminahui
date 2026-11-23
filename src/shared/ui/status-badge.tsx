import { Text, View } from 'react-native';

/**
 * Insignia de estado de operación (ADR-12: todo estado visual conserva texto accesible;
 * colores del tema Uniwind DI-05: secundario/acento solo como fondo con texto #0F172A,
 * texto blanco solo sobre primario, éxito, advertencia y error).
 */
export type EstadoActa =
  | 'BORRADOR'
  | 'GUARDADA_LOCAL'
  | 'SINCRONIZANDO'
  | 'RESULTADO_RECIBIDO'
  | 'EVIDENCIA_PENDIENTE'
  | 'RESPALDADA'
  | 'ERROR'
  | 'CONFLICTO_VERSION';

const ESTILOS: Record<EstadoActa, { etiqueta: string; clase: string }> = {
  BORRADOR: { etiqueta: 'Borrador', clase: 'border border-foreground bg-background text-foreground' },
  GUARDADA_LOCAL: { etiqueta: 'Guardada localmente', clase: 'bg-secondary text-foreground' },
  SINCRONIZANDO: { etiqueta: 'Sincronizando', clase: 'bg-accent text-foreground' },
  RESULTADO_RECIBIDO: { etiqueta: 'Resultado recibido', clase: 'bg-primary text-white' },
  EVIDENCIA_PENDIENTE: { etiqueta: 'Evidencia pendiente', clase: 'bg-warning text-white' },
  RESPALDADA: { etiqueta: 'Respaldada', clase: 'bg-success text-white' },
  ERROR: { etiqueta: 'Error', clase: 'bg-error text-white' },
  CONFLICTO_VERSION: { etiqueta: 'Conflicto de versión', clase: 'bg-error text-white' },
};

export function StatusBadge({ estado }: { estado: EstadoActa }) {
  const { etiqueta, clase } = ESTILOS[estado];
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Estado: ${etiqueta}`}
      className={`self-start rounded-full px-4 py-2 ${clase}`}
    >
      <Text className="text-base font-semibold">{etiqueta}</Text>
    </View>
  );
}
