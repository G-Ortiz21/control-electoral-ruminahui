import { Stack, useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useSessionStore } from '@/modules/auth/presentation/session-store';

/**
 * Guard de navegación del grupo coordinador (fase 1: rol simulado).
 * OJO: esto NO es autorización: la autorización real es RLS (ADR-05/ADR-12).
 */
export default function CoordinadorLayout() {
  const rol = useSessionStore((s) => s.rol);
  const router = useRouter();

  useEffect(() => {
    if (rol !== 'COORDINADOR') router.replace('/login' as Href);
  }, [rol, router]);

  if (rol !== 'COORDINADOR') return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
