import { View } from 'react-native';

import { FranjaIdentidad } from '@/shared/ui/franja-identidad';
import { FondoSuave } from '@/shared/ui/fondo-suave';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';

/** Punto de entrada: mientras la raíz decide a qué rol redirigir. */
export default function Index() {
  return (
    <FondoSuave>
      <View className="flex-1 items-center justify-center gap-8">
        <LottieFeedback tipo="carga" mensaje="Cargando…" />
        <View className="w-full px-10">
          <FranjaIdentidad />
        </View>
      </View>
    </FondoSuave>
  );
}
