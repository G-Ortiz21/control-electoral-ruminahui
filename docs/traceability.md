# Matriz de trazabilidad

ADR(s) que respaldan cada requerimiento (generado desde el consenso). Completar las columnas **Módulo / archivo** y **Prueba** al terminar cada fase. En la defensa, esta tabla es el mapa para encontrar el código.

| Requerimiento | ADR | Módulo / archivo | Prueba | Estado |
|---|---|---|---|---|
| RF-01 | ADR-02, ADR-04, ADR-05, ADR-07 |  |  | ⬜ |
| RF-02 | ADR-04, ADR-12 |  |  | ⬜ |
| RF-03 | ADR-02, ADR-03, ADR-06 |  |  | ⬜ |
| RF-04 | ADR-04, ADR-05, ADR-06, ADR-12 |  |  | ⬜ |
| RF-05 | ADR-01, ADR-02, ADR-03, ADR-07, ADR-08, ADR-10 |  |  | ⬜ |
| RF-06 | ADR-08, ADR-09 |  |  | ⬜ |
| RF-07 | ADR-08, ADR-09 |  |  | ⬜ |
| RF-08 | ADR-02, ADR-05, ADR-06, ADR-07, ADR-10 |  |  | ⬜ |
| RF-09 | ADR-01, ADR-08, ADR-12 |  |  | ⬜ |
| RF-10 | ADR-02, ADR-05, ADR-06, ADR-12 |  |  | ⬜ |
| RF-11 | ADR-02, ADR-10 |  |  | ⬜ |
| RF-12 | ADR-01, ADR-03, ADR-08, ADR-09 |  |  | ⬜ |
| RF-13 | ADR-11 |  |  | ⬜ |
| RF-14 | ADR-03 |  |  | ⬜ |
| RNF-01 | ADR-01, ADR-11, ADR-12 | `eas.json` (perfil preview→APK), `app.json` (plugins expo-sqlite/sentry/camera/location), `metro.config.js` | `npx expo export --platform android` (bundle 2041 módulos OK); **pendiente**: `eas build -p android --profile preview` + instalación en Android físico | ⬜ (falta APK y dispositivo) |
| RNF-02 | ADR-01 | `src/modules/**` (domain/data/presentation), `src/shared/domain/**`, `src/shared/infrastructure/**`, `src/composition/index.ts` | `npm test`: 9 pruebas de dominio sin Expo (validador de cédula módulo 10); `npx tsc --noEmit` | ✅ |
| RNF-03 | ADR-02, ADR-04, ADR-05 |  |  | ⬜ |
| RNF-04 | ADR-02, ADR-03, ADR-05, ADR-06, ADR-07, ADR-08, ADR-09, ADR-10 |  |  | ⬜ |
| RNF-05 | ADR-01, ADR-03, ADR-08, ADR-09, ADR-11 |  |  | ⬜ |
| RNF-06 | ADR-04, ADR-07, ADR-12 | `src/app/(auth|provincial|coordinador|veedor)/**`, `src/shared/ui/**` (StatusBadge, LottieFeedback, Boton), `src/global.css` (tema DI-05), `assets/lottie/*.json` | `tsc` + bundle export OK; recorrido por rol en dispositivo (pendiente APK) | ✅ (esqueleto) |
| RNF-07 | ADR-11 | `src/shared/infrastructure/sentry.ts` (release/entorno), `src/shared/ui/boton-error-temporal.tsx` | Init con release `control-electoral-ruminahui@1.0.0` + entorno; botón temporal de error; **pendiente**: verificación en panel Sentry con APK | ⬜ (falta verificación en Sentry) |
| RNF-08 | ADR-10 |  |  | ⬜ |
