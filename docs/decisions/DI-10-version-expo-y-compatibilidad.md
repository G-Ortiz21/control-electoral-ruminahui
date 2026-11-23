# DI-10: Versión de Expo SDK y compatibilidad de librerías

**Estado:** PENDIENTE (versiones fijadas en fase 1; se cierra con el primer APK)
**Refina:** ADR-01, ADR-11, ADR-12, RNF-01

## Contexto
El consenso exige demostrar en el APK que Uniwind, Lottie, Reanimated, Sentry y SQLite funcionan juntos con la versión de Expo elegida. Sin versiones fijadas, el agente podría instalar combinaciones incompatibles.

## Decisión
- Usar la **versión estable de Expo SDK vigente al crear el proyecto** (la que instale `create-expo-app@latest`).
- Fijar versiones exactas en `package.json` (sin `^`) una vez que el primer APK compile.
- Instalar cada librería con `npx expo install` cuando exista versión compatible con el SDK; para las que no (Uniwind, Sentry), seguir su guía oficial de instalación para Expo.
- Si alguna librería del stack cerrado es incompatible, el agente debe **detenerse y preguntar**; no sustituirla (regla 3 de `AGENTS.md`).

## Por qué no contradice la línea base
Fija versiones, no cambia el stack. ADR-12 pide demostrar la compatibilidad en el APK.

## Registro (completar tras la fase 1)
| Dato | Valor |
|---|---|
| Expo SDK | 58.0.26 (RN 0.88.1, React 19.3.0) |
| Uniwind / Tailwind | uniwind 1.14.0 / tailwindcss 4.3.5 (Metro `withUniwindConfig`, sin Babel preset) |
| Reanimated | 4.7.1 (react-native-worklets 0.13.0) |
| Sentry | @sentry/react-native 8.28.0 (init con release/entorno; org/project por env en build) |
| expo-sqlite / Lottie | expo-sqlite 58.0.18 / lottie-react-native 7.5.0 |
| Dispositivo y Android de prueba | (pendiente: completar al instalar el APK en el celular — RNF-01) |
| Incidencias y solución | (pendiente: verificar en APK. Local: bundle Android OK vía `expo export`, 9 pruebas de dominio OK, `tsc` OK. Warnings upstream de expo-router en exports, sin impacto) |
