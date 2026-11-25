# ADR-10: Resultados preliminares consistentes con SQL y Supabase Realtime

> **Estado de la línea base:** OBLIGATORIO (ratificado). JRV REPORTADA = 2 actas RESULTADO_RECIBIDO; JRV RESPALDADA = 2 actas EVIDENCIA_RESPALDADA.
>
> **Margen del implementador (decisión propia):** Vistas/RPC de agregación, forma del panel. El panel muestra por separado avance numérico y documental, fotos pendientes o en revisión, última actualización y estado sin conexión. Realtime solo avisa; el cliente re-consulta.
>
> Copia fiel del documento consolidado final. No editar el contenido bajo la línea `---`.

---

### Requerimientos relacionados

RF-05, RF-08, RF-11; RNF-04, RNF-08; S-04, S-07

### Contexto

El provincial necesita seguimiento por recinto, mesa y dignidad sin esperar cifras oficiales. Los eventos Realtime no deben sumarse como votos nuevos: una corrección reemplaza valores de la versión vigente. También es necesario diferenciar datos numéricos recibidos de evidencia fotográfica validada para que el avance no sea engañoso.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| SQL agregado de actas vigentes + notificación Supabase Realtime | Camila, Gelen y Mateo | Una fuente de cálculo y cambios reflejados al insertar/corregir registros. | Se debe manejar reconexión y controlar permisos de funciones/vistas. |
| Polling periódico de totales | Mateo (comparación) | Sencillo de depurar, sin suscripciones permanentes. | Más solicitudes y actualización retrasada según intervalo. |
| Suma local de todos los registros descargados | Alternativa descartada | Funciona sobre caché disponible. | Resultados divergentes por permisos y desconexión; obliga a descargar información ajena. |

### Decisión

PostgreSQL calcula resultados por candidatura, recinto y dignidad desde las versiones vigentes de actas autorizadas. Supabase Realtime anuncia cambios; el cliente vuelve a consultar el agregado y, tras reconexión, refresca su estado. Nunca suma el historial ni incrementa totales directamente a partir de eventos.

Se establece que una JRV está REPORTADA cuando las dos actas, alcaldía y prefectura, tienen RESULTADO_RECIBIDO. Está RESPALDADA cuando ambas cuentan además con EVIDENCIA_RESPALDADA. El panel presenta por separado avance numérico y avance documental; muestra fotos pendientes o en revisión y actualiza votos tras correcciones sin doble conteo.

Las cifras se identifican como resultados preliminares de la organización, no como escrutinio oficial del CNE. Cada pantalla muestra última actualización y estado sin conexión. Las consultas agregadas respetan RLS y el alcance del coordinador provincial.

### Consecuencias

Se gana un cálculo de resultados preliminares consistente, que distingue las actas recibidas de la evidencia validada. Se pierde inmediatez cuando hay desconexión, porque el panel conserva el último dato hasta reconectar. Se asume el riesgo de permisos mal configurados en las consultas agregadas y de atrasos de Realtime. Durante el desarrollo, el panel debe mostrar el estado de cada foto y no sumar los eventos de cambio como votos nuevos.

### Minuto del video

Minuto de referencia del video final: 01:55:10
