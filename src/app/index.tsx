import { View } from 'react-native';

import { FondoSuave } from '@/shared/ui/fondo-suave';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';

/** Punto de entrada: mientras la raíz decide a qué rol redirigir. */
export default function Index() {
  return (
    <FondoSuave>
      <View className="flex-1 items-center justify-center">
        <LottieFeedback tipo="carga" mensaje="Cargando…" />
      </View>
    </FondoSuave>
  );
}
