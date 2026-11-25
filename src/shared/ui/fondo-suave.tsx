import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, View } from 'react-native';

import { CLASES } from './theme';

/**
 * Fondo de la app (DI-05 revisión 2):
 * - degradado decorativo SOLO en la parte superior: fondoBase → cianDecorativo → primario, baja opacidad;
 * - dos manchas de fondo con baja opacidad;
 * - la zona de lectura queda casi blanca (fondoBase).
 * Sin expo-blur: las manchas son degradados opacos, no desenfoque real.
 */
export function FondoSuave({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView className={`${CLASES.fondoBase} flex-1`}>
      <LinearGradient
        colors={[
          'rgba(244, 248, 251, 0.92)',
          'rgba(103, 232, 249, 0.10)',
          'rgba(29, 78, 216, 0.05)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
        pointerEvents="none"
      />
      <View className="absolute top-36 left-[-14%] w-[340px] h-[340px] rounded-full bg-cian-decorativo/[0.10]" />
      <View className="absolute bottom-24 right-[-12%] w-[220px] h-[220px] rounded-full bg-primary/[0.07]" />
      {children}
    </SafeAreaView>
  );
}
