import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { reportarErrorFatal, reportarErrorNoFatal } from '../infrastructure/sentry';
import { Boton } from './boton';

export function EntradaOcultaSentry() {
  const [toques, setToques] = useState(0);
  const [visible, setVisible] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  function tocar() {
    const n = toques + 1;
    setToques(n);
    if (n >= 7) {
      setVisible(true);
      setToques(0);
    }
  }

  if (!visible) {
    return (
      <Pressable onPress={tocar} accessibilityRole="button" accessibilityLabel="Logo">
        <Text className="text-2xl font-bold text-foreground">Control Electoral Rumiñahui</Text>
      </Pressable>
    );
  }

  return (
    <View className="w-full items-center gap-2">
      <Text className="text-base font-semibold text-foreground">Diagnóstico (oculto)</Text>
      <Boton titulo="Provocar fallo FATAL" variante="error" onPress={() => { reportarErrorFatal('FATAL_DEMO', 'diagnostico', new Error('Fallo fatal de demostración (fase 8).')); setMensaje('Fallo fatal enviado.'); }} />
      <Boton titulo="Provocar fallo NO FATAL" variante="secundario" onPress={() => { reportarErrorNoFatal('NO_FATAL_DEMO', 'diagnostico', 'Fallo no fatal de demostración (fase 8).'); setMensaje('Fallo no fatal enviado.'); }} />
      {mensaje && <Text className="text-sm text-foreground">{mensaje}</Text>}
      <Pressable onPress={() => setVisible(false)}>
        <Text className="text-sm text-white underline">Cerrar</Text>
      </Pressable>
    </View>
  );
}
