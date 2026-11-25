import { Text, View } from 'react-native';

import { GestionUsuarios } from '@/modules/auth/presentation';
import { FranjaIdentidad } from '@/shared/ui';

export default function UsuariosProvincial() {
  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-6 pb-6 pt-16">
        <Text className="text-2xl font-bold text-white">Coordinadores</Text>
        <Text className="mt-2 text-base text-white">Alta y desactivación de coordinadores</Text>
      </View>
      <FranjaIdentidad />
      <GestionUsuarios />
    </View>
  );
}