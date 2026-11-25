# DI-08: Calidad dudosa de la foto y conflicto de versión en correcciones

**Estado:** DECIDIDO
**Refina:** S-06, S-07, ADR-07, ADR-08, ADR-09, RF-06, RF-08, RF-09

## Contexto
S-06 (tres intentos y `CALIDAD_DUDOSA`) y S-07 (`expected_version` y `CONFLICTO_VERSION`) quedaron como propuestas sin ratificar. Las fases 4, 5 y 6 del plan ya las usan, por lo que deben quedar decididas aquí.

## Alternativas consideradas
| Alternativa | Ventajas | Desventajas |
|---|---|---|
| Foto: bloquear hasta que sea nítida | Evidencia siempre buena | Un veedor con mala luz queda sin poder registrar el acta |
| Foto: tres intentos y luego conservar con marca `CALIDAD_DUDOSA` (S-06) | No bloquea la jornada; la revisión humana decide | La foto dudosa no cuenta como evidencia validada |
| Corrección: «gana la última recibida» | Simple | Una corrección puede pisar a otra sin que nadie lo note |
| Corrección: `expected_version` + `CONFLICTO_VERSION` (S-07) | No se sobrescribe nada; queda historial | Hay que mostrar ambos valores al usuario |

## Decisión
1. **Foto:** al detectar desenfoque se pide repetir. Al tercer intento fallido se guarda la foto con marca `CALIDAD_DUDOSA` y el acta puede enviarse. Esa acta cuenta en «JRV reportadas» y **no** en «JRV respaldadas» (DI-02); su evidencia queda en `EN_REVISION` (S-04). La UI lo indica con texto: «Foto de calidad dudosa — pendiente de revisión».
2. **Corrección:** toda corrección envía `expected_version`. Si la versión del servidor es otra, la RPC responde `CONFLICTO_VERSION` y no modifica nada. La app muestra el valor actual y el propuesto, y el usuario decide con un motivo. Cada corrección válida inserta una fila en `revisiones_acta` con autor, hora, motivo y valores anteriores.
3. Las constantes (`MAX_INTENTOS_FOTO = 3`) viven en `shared/domain`.
4. Un `CONFLICTO_VERSION` o un `PERMISO_REVOCADO` detienen los reintentos automáticos y conservan la operación local para revisión, sin sobrescribir nada (ADR-08, S-07, S-08).

## Por qué no contradice la línea base
Implementa literalmente S-06 y S-07 y respeta ADR-09 («tras tres fallos puede conservarse CALIDAD_DUDOSA… no como foto validada») y RF-08 (historial sin pérdida).

## Consecuencias y pruebas
- Tres fotos borrosas seguidas → acta enviable con `CALIDAD_DUDOSA`, no cuenta como respaldada.
- Dos correcciones con la misma `expected_version` → la segunda recibe `CONFLICTO_VERSION` y el acta no cambia.
- Cada corrección deja su fila de revisión.
