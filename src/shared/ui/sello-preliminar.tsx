import { Text, View } from 'react-native';

/**
 * Sello fijo de resultados preliminares + hora de última actualización +
 * estado de conexión. Se muestra en el panel provincial y pantallas de
 * seguimiento. Nunca se omite.
 */
export function SelloPreliminar({ ultimoActualizado, sinConexion }: { ultimoActualizado: string; sinConexion: boolean }) {
  const hora = new Date(ultimoActualizado).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View className="flex-row flex-wrap gap-2 items-center">
      <Text className="text-[11px] font-semibold text-texto-secundario">
        Resultados preliminares de la organización, no oficiales
      </Text>
      <Text className="text-[11px] text-texto-secundario">· Última actualización {hora}</Text>
      {sinConexion && (
        <View className="flex-row items-center gap-1">
          <Text className="text-[11px] font-semibold text-warning">Sin conexión</Text>
          <Text className="text-[11px] text-texto-secundario">· datos locales hasta recuperar la red</Text>
        </View>
      )}
    </View>
  );
}
