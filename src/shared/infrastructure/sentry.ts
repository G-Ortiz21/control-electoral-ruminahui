/**
 * Inicialización de Sentry (ADR-11, RNF-07).
 * - release y entorno en cada evento;
 * - sin cédulas, claves, teléfonos, coordenadas, fotos ni votos en eventos/breadcrumbs
 *   (la redacción beforeSend completa queda en la fase 8, docs/plan/08-sentry-y-pulido.md);
 * - si falta el DSN la app sigue funcionando y se avisa en la UI (fase 1 sin .env real).
 */
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
const RELEASE = `control-electoral-ruminahui@${Constants.expoConfig?.version ?? '1.0.0'}`;
const ENTORNO = __DEV__ ? 'desarrollo' : 'preview';

let inicializado = false;

export function inicializarSentry(): void {
  if (inicializado) return;
  inicializado = true;

  if (!DSN) {
    if (__DEV__) {
      console.warn('[sentry] EXPO_PUBLIC_SENTRY_DSN sin configurar: los eventos no se enviarán (fase 1).');
    }
    return;
  }

  Sentry.init({
    dsn: DSN,
    release: RELEASE,
    environment: ENTORNO,
    tracesSampleRate: 0.2,
  });
}

/** TEMPORAL (fase 1): error controlado para verificar el reporte en el panel de Sentry. */
export function reportarErrorPrueba(): { ok: boolean; detalle: string } {
  if (!DSN) {
    return { ok: false, detalle: 'EXPO_PUBLIC_SENTRY_DSN no está configurado (copialo a .env).' };
  }
  inicializarSentry();
  Sentry.captureException(new Error('Error de prueba temporal (fase 1): botón de diagnóstico.'));
  return { ok: true, detalle: 'Error enviado a Sentry (revisa el panel con release y entorno).' };
}
