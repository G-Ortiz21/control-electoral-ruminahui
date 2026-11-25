import { Text, View } from 'react-native';

/**
 * Banner de conectividad no modal. Se muestra solo cuando no hay red (RNF-08);
 * el texto explica el comportamiento offline. Sin Alert.alert.
 */
export function BannerConexion({ conectado }: { conectado: boolean }) {
  if (conectado) return null;

  return (
    <View className="bg-warning px-4 py-2 flex-row items-center gap-2">
      <Text className="text-texto-sobre-color text-base font-semibold">Sin conexión</Text>
      <Text className="text-texto-sobre-color text-sm">
        Los resultados se conservan localmente y se envían al recuperar la red.
      </Text>
    </View>
  );
}
