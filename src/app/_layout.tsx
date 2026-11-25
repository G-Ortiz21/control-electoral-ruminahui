import '../global.css';

import * as Sentry from '@sentry/react-native';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { GRUPO_POR_ROL, RUTAS_POR_ROL } from '@/modules/auth/domain/roles';
import { useSessionStore } from '@/modules/auth/presentation/session-store';
import { contenedor } from '@/composition';
import { entregarErroresPendientes } from '@/shared/infrastructure/errores-pendientes';
import { inicializarSentry } from '@/shared/infrastructure/sentry';

SplashScreen.preventAutoHideAsync();

inicializarSentry();

const GRUPOS = ['(auth)', '(provincial)', '(coordinador)', '(veedor)'];

function Raiz() {
  const usuario = useSessionStore((s) => s.usuario);
  const rol = useSessionStore((s) => s.rol);
  const estado = useSessionStore((s) => s.estado);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const usuario = useSessionStore.getState().usuario;
    if (usuario) {
      contenedor.sync.motor.reanudarPendientes().then(() => {
        contenedor.sync.motor.sincronizarTodo().catch(() => {});
      }).catch(() => {});
    } else {
      // Recuperación de sesión al arranque (secundaria): si el repositorio
      // tiene una sesión en memoria, cargar el perfil y reflejarlo en el store.
      contenedor.auth.obtenerSesionActual()
        .then((sesion) => (sesion ? contenedor.usuarios.obtenerPerfilActual() : null))
        .then((perfil) => {
          if (perfil?.ok && perfil.valor) useSessionStore.getState().setSesion(perfil.valor);
        })
        .catch(() => {});
    }
    entregarErroresPendientes().catch(() => {});
  }, []);

  useEffect(() => {
    SplashScreen.hideAsync();
    const grupo = segments[0] as string | undefined;
    const enApp = grupo !== undefined && GRUPOS.includes(grupo);

    if (!usuario) {
      // En la ruta raíz (sin segmentos) o dentro de un grupo de la app (salvo
      // el grupo (auth)) no hay sesión: redirigir al login. Sin esto, la app
      // se quedaba en "/" mostrando el Lottie de carga indefinidamente.
      if (grupo === undefined || (enApp && grupo !== '(auth)')) {
        router.replace('/login' as Href);
      }
      return;
    }

    if (estado === 'PENDIENTE') {
      if (grupo !== '(auth)') router.replace('/(auth)/primer-ingreso' as Href);
      return;
    }

    if (estado !== 'ACTIVO') {
      router.replace('/login' as Href);
      return;
    }

    if (!rol) {
      router.replace('/login' as Href);
      return;
    }

    const ruta = RUTAS_POR_ROL[rol];
    if (grupo === undefined || grupo === '(auth)') {
      router.replace(ruta as Href);
    } else if (grupo !== GRUPO_POR_ROL[rol] && enApp) {
      router.replace(ruta as Href);
    }
  }, [usuario, rol, estado, segments, router]);

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

export default Sentry.wrap(Raiz);