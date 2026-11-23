# DI-10: Versión de Expo SDK y compatibilidad de librerías

**Estado:** PENDIENTE (se cierra al terminar la fase 1 con el primer APK)
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
| Expo SDK | |
| Uniwind / Tailwind | |
| Reanimated | |
| Sentry | |
| Dispositivo y Android de prueba | |
| Incidencias y solución | |
