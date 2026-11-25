import { View } from 'react-native';

/**
 * Franja decorativa de identidad (DI-05 revisión 3).
 * Siete segmentos de 4 px de alto, sin texto, iconos, estado ni interacción.
 * Es una inspiración cromática aproximada: NO reproduce una bandera oficial,
 * el churo ni la wiphala, y NUNCA debe ser el único indicador de estado.
 */
const SEGMENTOS = [
  'bg-franja-rojo',
  'bg-franja-naranja',
  'bg-franja-amarillo',
  'bg-franja-verde',
  'bg-franja-turquesa',
  'bg-franja-azul',
  'bg-franja-violeta',
] as const;

export function FranjaIdentidad() {
  return (
    <View
      className="h-1 w-full flex-row overflow-hidden"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      {SEGMENTOS.map((segmento, i) => (
        <View key={i} className={`h-1 flex-1 ${segmento}`} />
      ))}
    </View>
  );
}
