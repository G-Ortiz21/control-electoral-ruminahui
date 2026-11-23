import { Text, View } from 'react-native';

import { useSessionStore } from '@/modules/auth/presentation/session-store';
import { Boton } from '@/shared/ui/boton';
import { BotonErrorTemporal } from '@/shared/ui/boton-error-temporal';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
import { StatusBadge } from '@/shared/ui/status-badge';

/** Pantalla de ejemplo del rol provincial (seguimiento). Fase real: docs/plan/07-provincial.md. */
export default function PanelProvincial() {
  const setRol = useSessionStore((s) => s.setRol);

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-6 pb-6 pt-16">
        <Text className="text-2xl font-bold text-white">Panel provincial</Text>
        <Text className="mt-2 text-base text-white">Seguimiento de recintos y JRV</Text>
      </View>
      <View className="h-1.5 bg-secondary" />

      <View className="flex-1 items-center gap-6 px-6 pt-8">
        <StatusBadge estado="RESULTADO_RECIBIDO" />
        <LottieFeedback tipo="exito" mensaje="Resultados recibidos (demostración)" />
        <BotonErrorTemporal />
        <Boton titulo="Cerrar sesión (demo)" variante="secundario" onPress={() => setRol(null)} />
      </View>
    </View>
  );
}
