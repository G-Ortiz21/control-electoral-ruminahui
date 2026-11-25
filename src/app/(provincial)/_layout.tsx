import { Stack, useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useSessionStore } from '@/modules/auth/presentation/session-store';

export default function ProvincialLayout() {
  const rol = useSessionStore((s) => s.rol);
  const estado = useSessionStore((s) => s.estado);
  const router = useRouter();

  useEffect(() => {
    if (rol !== 'PROVINCIAL' || estado !== 'ACTIVO') router.replace('/login' as Href);
  }, [rol, estado, router]);

  if (rol !== 'PROVINCIAL' || estado !== 'ACTIVO') return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}