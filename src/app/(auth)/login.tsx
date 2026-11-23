import { Text, View } from 'react-native';

import { useSessionStore } from '@/modules/auth/presentation/session-store';
import { Boton } from '@/shared/ui/boton';

/** Demo con rol simulado: en la fase 3 será el login real con Supabase Auth. */
export default function Login() {
  const setRol = useSessionStore((s) => s.setRol);

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-6 pb-6 pt-16">
        <Text className="text-2xl font-bold text-white">Control Electoral Rumiñahui</Text>
        <Text className="mt-2 text-base text-white">Escrutinio, actas y seguimiento en campo</Text>
      </View>
      <View className="h-1.5 bg-secondary" />

      <View className="flex-1 justify-center gap-4 px-6">
        <Text className="text-base text-foreground">
          Selecciona un rol (demostración con rol simulado):
        </Text>
        <Boton titulo="Provincial" onPress={() => setRol('PROVINCIAL')} />
        <Boton titulo="Coordinador de recinto" variante="secundario" onPress={() => setRol('COORDINADOR')} />
        <Boton titulo="Veedor" variante="secundario" onPress={() => setRol('VEEDOR')} />
        <Text className="mt-4 text-sm text-foreground">
          Fase 1: la sesión es simulada. La autorización real se aplica con RLS (ADR-05).
        </Text>
      </View>
    </View>
  );
}
