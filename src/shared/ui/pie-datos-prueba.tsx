import { Text, View } from 'react-native';

/** Pie informativo fijo (login y panel provincial). El padding de área segura
 * lo aporta el contenedor, para no cubrir formularios ni contenido desplazable. */
export function PieDatosPrueba() {
  return (
    <View className="w-full items-center py-2">
      <Text className="text-center text-xs text-texto-secundario">
        Datos de prueba — no corresponde a resultados reales
      </Text>
    </View>
  );
}
