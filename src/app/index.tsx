import { View } from 'react-native';

import { LottieFeedback } from '@/shared/ui/lottie-feedback';

/** Punto de entrada: mientras la raíz decide a qué rol redirigir. */
export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <LottieFeedback tipo="carga" mensaje="Cargando…" />
    </View>
  );
}
