# ADR-03: Precarga versionada y catálogo offline en SQLite

> **Estado de la línea base:** OBLIGATORIO (ratificado). Jurisdicción FIJADA: Pichincha / Rumiñahui. Prohibido presentar datos ficticios como padrón real.
>
> **Margen del implementador (decisión propia):** Estrategia incremental (updated_at o versión). La copia SQLite incluye catálogo Y asignaciones autorizadas. Ninguna sincronización borra recintos/JRV referenciados por actas locales.
>
> Copia fiel del documento consolidado final. No editar el contenido bajo la línea `---`.

---

### Requerimientos relacionados

RF-03, RF-05, RF-12, RF-14; RNF-04, RNF-05; S-01, S-03

### Contexto

El examen obliga a precargar recintos, JRV y cinco organizaciones con candidatos para dos dignidades. La opción de conservar todo únicamente en la nube impide capturar actas sin red; por eso en V2-P1 y V2-P2 se compararon la precarga SQL, la copia SQLite y los catálogos fijos dentro del APK.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| Seed SQL de catálogo con versión y réplica por usuario en SQLite | Camila y Mateo; consenso anotado | Carga inicial auditada, índices únicos y consulta sin señal. | Se necesita una estrategia incremental para descargar recintos y asignaciones nuevas. |
| Script SQL solo remoto, sin copia local | Gelen (precarga SQL), alternativa de despliegue | Una sola base editable por el provincial. | El formulario no podrá cargar mesas ni candidatos en un recinto sin cobertura. |
| Catálogo fijo dentro del APK | Mateo (alternativa examinada) | Disponible desde la instalación sin sincronización inicial. | No recibe cambios de recintos ni asignaciones sin actualizar la aplicación. |

### Decisión

PostgreSQL es la fuente maestra de un catálogo versionado mediante script SQL idempotente (INSERT ... ON CONFLICT) con índices y claves únicas. Se define Pichincha, cantón Rumiñahui, como jurisdicción de implementación; la carga debe corresponder a recintos y JRV verificables de ese territorio y a cinco organizaciones con candidatos de alcaldía y prefectura. No se presentarán datos ficticios como padrón real.

Después de un acceso inicial con conexión, la aplicación descarga a SQLite el catálogo y las asignaciones autorizadas; los formularios consultan esa copia en modo avión. Los cambios remotos se actualizan por versión o updated_at sin borrar actas ni operaciones pendientes. Un recinto nuevo será visible localmente tras sincronizar.

### Consecuencias

Se gana disponibilidad del catálogo aunque no haya cobertura en el recinto. Se pierde tiempo en la preparación de datos verificables y en la sincronización incremental de los dispositivos desconectados. Se asume el riesgo de un catálogo incompleto o desactualizado. Durante el desarrollo, la carga debe ejecutarse dos veces sin duplicar registros, y ninguna sincronización puede eliminar recintos o JRV referenciados por actas locales.

### Minuto del video

Minuto de referencia del video final: 00:50:38
