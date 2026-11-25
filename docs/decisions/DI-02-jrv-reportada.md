# DI-02: Definición de «JRV reportada» y «JRV respaldada»

**Estado:** DECIDIDO (alineada con el texto final de S-04 y ADR-10)
**Refina:** S-04, ADR-10, RF-11, RNF-08

## Contexto
La versión final de S-04 y ADR-10 ratificó las definiciones. Esta DI solo fija cómo se muestran.

## Decisión
- **JRV REPORTADA** = sus dos actas (alcaldía y prefectura) tienen `RESULTADO_RECIBIDO` (o un estado de evidencia posterior). Cuenta para votos y avance numérico.
- **JRV RESPALDADA** = sus dos actas tienen además `EVIDENCIA_RESPALDADA`.
- Estados de evidencia: `EVIDENCIA_PENDIENTE` (foto sin confirmar), `EN_REVISION` (foto dudosa) y `EVIDENCIA_RESPALDADA` (foto aceptada).
- El panel provincial muestra **por separado** «JRV reportadas» y «JRV respaldadas» por recinto, más el **conteo de fotos pendientes y en revisión**, «Última actualización» y estado «Sin conexión».
- Los votos se calculan siempre en PostgreSQL desde las versiones vigentes; Realtime solo avisa y el cliente re-consulta (ADR-10, RNF-08).

## Por qué no contradice la línea base
Usa los mismos términos y reglas de S-04 y ADR-10 (cambia el rótulo anterior «JRV con resultados» por «JRV reportadas»).

## Consecuencias y pruebas
Dos actas con foto en espera → cuenta en «reportadas», no en «respaldadas». Foto dudosa → `EN_REVISION`, no respaldada. Corrección → no duplica votos.
