import { useState } from 'react';
import { Text, View } from 'react-native';

import { reportarErrorPrueba } from '../infrastructure/sentry';
import { Boton } from './boton';

/**
 * TEMPORAL (fase 1 — eliminar en fase 8): dispara un error controlado a Sentry
 * para verificar release/entorno en el panel. No envía datos sensibles (RNF-07).
 */
export function BotonErrorTemporal() {
  const [mensaje, setMensaje] = useState<string | null>(null);

  const presionar = () => {
    const resultado = reportarErrorPrueba();
    setMensaje(resultado.detalle);
  };

  return (
    <View className="w-full items-center gap-2">
      <Boton titulo="TEMPORAL: provocar error (Sentry)" variante="error" onPress={presionar} />
      {mensaje !== null && (
        <Text accessibilityRole="text" className="text-center text-sm text-foreground">
          {mensaje}
        </Text>
      )}
    </View>
  );
}
