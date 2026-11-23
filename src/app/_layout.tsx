import '../global.css';

import * as Sentry from '@sentry/react-native';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { RUTAS_POR_ROL } from '@/modules/auth/domain/roles';
import { useSessionStore } from '@/modules/auth/presentation/session-store';
import { inicializarSentry } from '@/shared/infrastructure/sentry';

SplashScreen.preventAutoHideAsync();

// Init con release y entorno (ADR-11) antes del primer render.
inicializarSentry();

const GRUPOS = ['(auth)', '(provincial)', '(coordinador)', '(veedor)'];

/**
 * Raíz: carga el tema Uniwind, inicializa Sentry y redirige según el rol
 * del store (fase 1: rol simulado). La autorización REAL es RLS (ADR-05),
 * no esconder pantallas: esto es solo navegación.
 */
function Raiz() {
  const rol = useSessionStore((s) => s.rol);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    SplashScreen.hideAsync();
    const grupo = segments[0] as string | undefined;
    const enApp = grupo !== undefined && GRUPOS.includes(grupo);

    if (!rol && enApp && grupo !== '(auth)') {
      router.replace('/login' as Href);
    } else if (rol && (grupo === undefined || grupo === '(auth)')) {
      router.replace(RUTAS_POR_ROL[rol] as Href);
    }
  }, [rol, segments, router]);

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

export default Sentry.wrap(Raiz);
