# AGENTS.md — Control Electoral (React Native / Expo)

App móvil Android para el escrutinio de una organización política en Ecuador. Roles: **provincial → coordinador de recinto → veedor**.
Proyecto individual de examen. Se parte de una **línea base de equipo que NO se puede cambiar** (`docs/requirements.md`, `docs/assumptions.md`, `docs/adr/`).
No respetar la línea base reduce la nota a la mitad: trátala como ley.

## Reglas de proceso (obligatorias)
1. Antes de codificar, indica qué RF/RNF y qué ADR cubre la tarea.
2. **La línea base no se modifica.** Si algo choca con un ADR o es imposible, DETENTE y pregunta; no lo resuelvas por tu cuenta.
3. No agregues dependencias fuera del stack de abajo sin preguntar.
4. Lo que el consenso dejó abierto se decide en `docs/decisions/DI-xx.md`. Léelos antes de implementar.
5. Un commit por tarea pequeña (mensaje: `feat(acta): ... [RF-05, ADR-07]`).
6. Al terminar cada tarea actualiza `docs/traceability.md` (RF → archivo → prueba).
7. Responde y comenta en español. Identificadores de código en inglés o español, pero consistentes.

## Stack CERRADO (ADR-01…12)
| Área | Obligatorio |
|---|---|
| App | React Native + Expo (TypeScript), APK por **EAS Build** (development/preview build, no Expo Go) |
| Rutas | Expo Router (grupos por rol) |
| Estado de UI | **Zustand** (solo sesión, usuario, conectividad, estados visibles de operaciones) |
| Backend | **Supabase**: Auth, PostgreSQL, Storage (bucket privado), Realtime, Edge Functions, RLS |
| Offline | **expo-sqlite** + archivos locales + outbox con UUID + **NetInfo** |
| Formularios | **React Hook Form + Zod** + reglas puras de dominio + CHECK/trigger SQL |
| Evidencia | **expo-camera** (sin galería) + **expo-location** + comprobación de nitidez |
| Fallos | **Sentry** (fatales y no fatales) |
| UI | **Uniwind** + **Lottie** + **Reanimated** |
| Correo (pruebas) | Resend (opción de envío, no sustituye a Supabase Auth) |

## PROHIBIDO
- `signUp` público o autorregistro de cualquier tipo.
- `service_role` o secretos administrativos en el APK / en `EXPO_PUBLIC_*`.
- `Alert.alert` y modales genéricos para feedback (usar componentes propios + Lottie).
- AsyncStorage para actas/pendientes; seleccionar fotos de galería.
- Cédulas, claves, teléfonos, coordenadas, fotos o votos en eventos/breadcrumbs de Sentry o en logs.
- Decir «guardado» antes de persistir votos + metadatos + referencia a la foto (RNF-05).
- Sumar eventos Realtime en el cliente para resultados: siempre se re-consulta el agregado SQL (ADR-10).
- Confiar solo en ocultar pantallas: la autorización real es RLS (ADR-05, ADR-12).
- Abrir mapas externos (`Linking.openURL`, `geo:`, Google Maps) para mostrar ubicaciones, o cargar Leaflet desde un CDN: el visor es Leaflet en WebView, DENTRO de la app y empaquetado localmente (ADR-09).
- Presentar datos ficticios como padrón real de recintos/JRV (S-01, ADR-03).

## Vocabulario de estados (baseline final; no inventar otros)
- Acta/evidencia: `RESULTADO_RECIBIDO`, `EVIDENCIA_PENDIENTE`, `EN_REVISION` (foto dudosa), `EVIDENCIA_RESPALDADA`.
- Operación local: `GUARDADA_LOCAL`, `SINCRONIZANDO`, `ERROR`, `CONFLICTO_VERSION`, `PERMISO_REVOCADO` (estos dos últimos detienen reintentos automáticos).
- JRV: `REPORTADA` (dos actas con RESULTADO_RECIBIDO) y `RESPALDADA` (dos actas con EVIDENCIA_RESPALDADA).

## Arquitectura (RNF-02, ADR-01)
Módulos por funcionalidad, cada uno con `domain/`, `data/`, `presentation/`. **El dominio no importa React, Expo, SQLite ni Supabase**; usa puertos (interfaces) e implementaciones en `data/`.
Detalle y regla de dependencias: `docs/architecture.md`.

## Comandos
- `npx expo start --dev-client` — desarrollo
- `npm test` — pruebas unitarias del dominio (deben correr sin Expo)
- `npx tsc --noEmit` — tipos
- `eas build -p android --profile preview` — APK
- `supabase db reset` / `supabase functions serve` — backend local (si se usa CLI)

## Dónde buscar
`docs/requirements.md` · `docs/assumptions.md` · `docs/adr/` · `docs/decisions/` · `docs/architecture.md` · `docs/data-model.md` · `docs/ux.md` · `docs/traceability.md` · `docs/plan/`
