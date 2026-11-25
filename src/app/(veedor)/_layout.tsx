import { Stack, useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useSessionStore } from '@/modules/auth/presentation/session-store';

export default function VeedorLayout() {
  const rol = useSessionStore((s) => s.rol);
  const estado = useSessionStore((s) => s.estado);
  const router = useRouter();

  useEffect(() => {
    if (rol !== 'VEEDOR' || estado !== 'ACTIVO') router.replace('/login' as Href);
  }, [rol, estado, router]);

  if (rol !== 'VEEDOR' || estado !== 'ACTIVO') return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}