# DI-02: Definición de «JRV reportada»

**Estado:** DECIDIDO
**Refina:** S-04, ADR-10, RF-11

## Contexto
No se ratificó si una mesa está «reportada» con las dos actas recibidas o con las dos actas con evidencia aceptada.

## Alternativas consideradas
| Alternativa | Ventajas | Desventajas |
|---|---|---|
| Reportada = 2 actas con RESULTADO_RECIBIDO | Avance numérico inmediato; permite exit poll en tiempo real | Puede haber fotos aún pendientes |
| Reportada = 2 actas RESPALDADAS | Más estricta | Retrasa el avance y contradice el objetivo de seguimiento en tiempo real |

## Decisión
El panel muestra **dos indicadores separados**:
- **JRV con resultados** = ambas dignidades en `RESULTADO_RECIBIDO` o superior (cuenta para votos y avance numérico).
- **JRV respaldadas** = ambas dignidades con evidencia validada (`RESPALDADA`).
Los votos se calculan siempre desde actas vigentes en servidor.

## Por qué no contradice la línea base
ADR-10 propone exactamente separar RESULTADO_RECIBIDO de EVIDENCIA_RESPALDADA y no fija la denominación; esta DI solo la fija.

## Consecuencias y pruebas
Dos actas por JRV, foto en espera → cuenta en «con resultados», no en «respaldadas». Corrección → no duplica votos.
