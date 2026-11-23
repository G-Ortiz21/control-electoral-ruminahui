# DI-03: Radio y precisión GPS — advertir y registrar, no bloquear

**Estado:** DECIDIDO
**Refina:** S-05, ADR-09, RF-07

## Contexto
Se debatieron 300 m (radio) y 100 m (precisión) sin ratificar el bloqueo.

## Decisión
Constantes configurables `RADIO_MAX_M = 300` y `PRECISION_MAX_M = 100` en `shared/domain`.
- Sin lectura GPS válida → el acta queda **BORRADOR**, no se envía (lo dice ADR-09).
- Precisión peor que 100 m o distancia mayor a 300 m → **se advierte** con mensaje claro, se registra la condición y se permite continuar. No se declara fraude.
- Se guardan siempre lat, lon, accuracy y timestamp originales y la distancia calculada; nunca se reemplazan al sincronizar.
- Las coordenadas del catálogo de prueba son **aproximadas**; para la demo, un recinto de prueba lleva las coordenadas reales del lugar de la demostración y otro queda lejano para mostrar la advertencia de distancia (DI-01).

## Por qué no contradice la línea base
S-05 indica expresamente: «mientras no se ratifique, advierte y registra la condición sin declararla prueba de fraude».

## Consecuencias y pruebas
Pruebas: accuracy insuficiente, fuera de radio, sin GPS, modo avión; el detalle del acta muestra coordenadas y distancia.
