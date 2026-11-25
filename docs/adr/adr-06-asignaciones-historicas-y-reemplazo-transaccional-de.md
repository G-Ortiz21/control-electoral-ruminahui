# ADR-06: Asignaciones históricas y reemplazo transaccional de veedores

> **Estado de la línea base:** OBLIGATORIO (ratificado). Reemplazo por JRV (S-03).
>
> **Margen del implementador (decisión propia):** Nombres de funciones/RPC. La revocación aplica a toda escritura futura, incluso capturada offline.
>
> Copia fiel del documento consolidado final. No editar el contenido bajo la línea `---`.

---

### Requerimientos relacionados

RF-03, RF-04, RF-08, RF-10; RNF-04; S-03, S-08

### Contexto

El coordinador de recinto debe asignar un responsable por mesa y sustituir ausentes durante la jornada; una persona puede cubrir varias JRV. Guardar únicamente el identificador actual eliminaría la trazabilidad necesaria para comprobar quién pudo registrar o corregir una acta.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| Tablas de asignación histórica, unicidad de vigente y operación transaccional | Alternativa documentada en la reunión; criterio adoptado para implementación | Permite consultar vigencias y evitar duplicidad de responsables al reemplazar. | Requiere restricciones parciales y tratamiento de escrituras antiguas almacenadas offline. |
| Guardar únicamente veedor_id en JRV | Camila (alternativa comparada) | Actualización de una columna, CRUD simple. | Sobrescribe la relación anterior y dificulta reconstruir quién tenía la mesa al registrar una acta. |
| Control de asignaciones solo en Zustand/cliente | Alternativa descartada por exigencia de confidencialidad | Interfaz rápida y sin transacciones remotas. | Dos teléfonos pueden presentar responsables incompatibles. |

### Decisión

Se conserva asignaciones_veedor(jrv_id, veedor_id, desde, hasta, motivo, asignado_por) y una restricción UNIQUE parcial WHERE hasta IS NULL para impedir dos veedores vigentes en la misma JRV. Cada recinto mantiene, asimismo, un único coordinador vigente, con su historial separado. Un veedor puede estar activo en varias JRV sin límite artificial.

El reemplazo se realiza para una JRV determinada mediante transacción de servidor: validar rol y recinto, comprobar asignación vigente, cerrarla, registrar la nueva y confirmar; ante error se revierte todo. Se conservan las asignaciones de otras JRV del veedor sustituido y la autoría de actas anteriores. La revocación se aplica a toda escritura futura no autorizada, incluso si se capturó offline.

### Consecuencias

Se gana un único responsable vigente por JRV y un historial que permite reconstruir quién registró o corrigió cada acta. Se pierde la simplicidad de un campo único de veedor. Se asume el riesgo de concurrencia durante el reemplazo y de capturas pendientes del veedor sustituido. Durante el desarrollo, el reemplazo debe ejecutarse en una transacción y comprobarse que no quedan dos asignaciones vigentes en la misma JRV.

### Minuto del video

Minuto de referencia del video final: 01:17:24
