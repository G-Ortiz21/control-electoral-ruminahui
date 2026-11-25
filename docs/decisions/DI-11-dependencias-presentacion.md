# DI-11: Dependencias de presentación (rediseño visual)

**Estado:** DECIDIDO  
**Refina:** DI-05 (revisión 2), ADR-12, RNF-06  
**Autorizado por:** tarea de rediseño visual (solo presentación)

## Contexto

El rediseño visual requiere degradados decorativos (fondoBase → cianDecorativo → azul noche) y manchas de
fondo, además de gráficos SVG (donut de participación, anillos de avance). El stack cerrado de ADR-01 no
incluye estas dos librerías, por lo que se decide esta DI individual sin contradecir la línea base.

## Decisión

- `expo-linear-gradient` (SDK 58): degradados en `FondoSuave` (parte superior y manchas de fondo) y barras
  decorativas. Solo presentación; no toca lógica de negocio ni sync.
- `react-native-svg` (vía expo): `DonutParticipacion` y `AnillosAvance` en SVG. Solo presentación.

## Por qué no contradice la línea base

ADR-01 fija el stack cerrado; esta DI añade únicamente dependencias de presentación solicitadas por el
rediseño visual. No se agrega ninguna dependencia de estado, red, base de datos, autenticación ni cámara.
ADR-12 deja la identidad visual y las pantallas al implementador.

## Consecuencias y pruebas

- Instaladas con `npx expo install expo-linear-gradient react-native-svg` (versiones compatibles con SDK 58).
- `npx tsc --noEmit` y `npm test` deben pasar.
