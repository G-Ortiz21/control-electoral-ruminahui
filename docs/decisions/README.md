# Decisiones individuales (DI)

La línea base del equipo no se puede cambiar. Lo que el consenso dejó **abierto** o **sin ratificar** se decide aquí, de forma individual, **refinando sin contradecir** ningún RF, RNF, S ni ADR.

Reglas:
- Cada DI cita el supuesto/ADR que refina y explica por qué no lo contradice.
- Si una DI parece contradecir la línea base, no es una DI: es un cambio de ADR y hay que consultarlo antes.
- Estado: `DECIDIDO` (listo para implementar) o `PENDIENTE` (requiere dato/prueba).
- En la defensa debes poder justificar cada una: contexto → decisión → consecuencia.

| ID | Tema | Refina | Estado |
|---|---|---|---|
| DI-01 | Territorio y fuente del catálogo | S-01, ADR-03 | DECIDIDO (catálogo de prueba, reemplazable) |
| DI-02 | Definición de «JRV reportada» | S-04, ADR-10 | DECIDIDO |
| DI-03 | Radio/precisión GPS: advertir, no bloquear | S-05, ADR-09 | DECIDIDO |
| DI-04 | Visor de ubicación del acta | ADR-09 | DECIDIDO |
| DI-05 | Organización política, paleta y tema | RNF-06, ADR-12 | DECIDIDO (propuesta editable) |
| DI-06 | Cuenta provincial inicial y reemplazo por JRV | S-02, S-03, S-08, ADR-04, ADR-06 | DECIDIDO |
| DI-07 | Resultado del spike de alta (Admin → OTP → activación) | ADR-04 | PENDIENTE (spike) |
| DI-08 | Foto de calidad dudosa y conflicto de versión | S-06, S-07, ADR-09 | DECIDIDO |
| DI-09 | Algoritmo de nitidez | ADR-09, RF-06 | DECIDIDO (calibrar umbral) |
| DI-10 | Versión de Expo SDK y compatibilidad | ADR-01, ADR-12 | PENDIENTE (tras fase 1) |

Plantilla: `_plantilla.md`
