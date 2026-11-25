/**
 * Inicialización de Sentry (ADR-11, RNF-07).
 */
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
const RELEASE = `control-electoral-ruminahui@${Constants.expoConfig?.version ?? '1.0.0'}`;
const ENTORNO = __DEV__ ? 'desarrollo' : 'preview';

const SENSITIVE_KEY = /(cedula|password|clave|telefono|phone|email|correo|lat|lon|coord|image|foto|voto|token)/i;

function redactarValor(valor: any, clave?: string): any {
  if (clave && SENSITIVE_KEY.test(clave)) {
    return '[REDACTED]';
  }
  if (Array.isArray(valor)) return valor.map((v) => redactarValor(v));
  if (valor && typeof valor === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(valor)) {
      out[k] = redactarValor(v, k);
    }
    return out;
  }
  if (typeof valor === 'string') {
    // Redactar patrones de correo y números largos por si acaso.
    return valor
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
      .replace(/\b\d{7,}\b/g, '[REDACTED_NUMBER]');
  }
  return valor;
}

function redactarEvento(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.user) {
    event.user = { id: event.user.id };
  }
  if (event.request) {
    event.request = redactarValor(event.request) as any;
  }
  if (event.contexts) {
    event.contexts = redactarValor(event.contexts) as any;
  }
  if (event.extra) {
    event.extra = redactarValor(event.extra) as any;
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      message: typeof b.message === 'string' ? redactarValor(b.message) : b.message,
      data: b.data ? redactarValor(b.data) : b.data,
    }));
  }
  // tags seguros
  event.tags = { ...(event.tags ?? {}), app_version: RELEASE, plataforma: 'android' };
  return event;
}

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
    beforeSend: (event) => redactarEvento(event),
    beforeBreadcrumb: (breadcrumb) => {
      if (breadcrumb.message) breadcrumb.message = redactarValor(breadcrumb.message) as string;
      if (breadcrumb.data) breadcrumb.data = redactarValor(breadcrumb.data);
      return breadcrumb;
    },
    initialScope: {
      tags: {
        app_version: RELEASE,
        dispositivo: Device.modelName ?? 'desconocido',
        android: Device.osVersion ?? 'desconocido',
      },
    },
  });
}

export function reportarErrorFatal(codigo: string, pantalla: string, error?: unknown): void {
  inicializarSentry();
  Sentry.withScope((scope) => {
    scope.setTag('codigo', codigo);
    scope.setTag('pantalla', pantalla);
    scope.setTag('fatal', 'true');
    scope.setLevel('fatal');
    Sentry.captureException(error instanceof Error ? error : new Error(String(error ?? codigo)));
  });
}

export function reportarErrorNoFatal(codigo: string, pantalla: string, detalle?: string): void {
  inicializarSentry();
  Sentry.withScope((scope) => {
    scope.setTag('codigo', codigo);
    scope.setTag('pantalla', pantalla);
    scope.setTag('fatal', 'false');
    scope.setLevel('warning');
    Sentry.captureMessage(detalle ?? codigo, 'warning');
  });
}

export function reportarErrorPrueba(): { ok: boolean; detalle: string } {
  if (!DSN) {
    return { ok: false, detalle: 'EXPO_PUBLIC_SENTRY_DSN no está configurado (copialo a .env).' };
  }
  inicializarSentry();
  reportarErrorNoFatal('PRUEBA_NO_FATAL', 'diagnostico', 'Error de prueba no fatal (fase 8).');
  return { ok: true, detalle: 'Error no fatal enviado a Sentry (revisa el panel con release y entorno).' };
}
