import { Stack, useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useSessionStore } from '@/modules/auth/presentation/session-store';

/**
 * Guard de navegación del grupo provincial (fase 1: rol simulado).
 * OJO: esto NO es autorización: la autorización real es RLS (ADR-05/ADR-12).
 */
export default function ProvincialLayout() {
  const rol = useSessionStore((s) => s.rol);
  const router = useRouter();

  useEffect(() => {
    if (rol !== 'PROVINCIAL') router.replace('/login' as Href);
  }, [rol, router]);

  if (rol !== 'PROVINCIAL') return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
