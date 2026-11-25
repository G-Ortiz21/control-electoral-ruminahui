# ADR-08: Persistencia offline y outbox idempotente con SQLite y NetInfo

> **Estado de la línea base:** OBLIGATORIO (ratificado).
>
> **Margen del implementador (decisión propia):** Política de reintentos (espera creciente), esquema de tablas locales, reconciliación de archivo sin fila / fila sin archivo. CONFLICTO_VERSION y PERMISO_REVOCADO detienen reintentos automáticos y conservan la operación local.
>
> Copia fiel del documento consolidado final. No editar el contenido bajo la línea `---`.

---

### Requerimientos relacionados

RF-05, RF-06, RF-07, RF-09, RF-12; RNF-04, RNF-05; S-02, S-04, S-08

### Contexto

La conectividad rural obliga a conservar votos, foto y GPS durante desconexiones y cierres forzados. Zustand no persiste las operaciones y un simple reintento sin identificador estable podría duplicar actas o correcciones. El diseño se vincula con la integridad, permisos y versiones fijados en las demás ADR.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| expo-sqlite + archivos locales de foto + outbox + NetInfo + UUID | Camila, Gelen y Mateo | Estados transaccionales, consultas por JRV y reintentos después del reinicio. | El equipo implementa cola, recuperación de fallos y manejo de conflictos. |
| AsyncStorage con lista de pendientes | Camila y Mateo (comparación) | Pocas dependencias y facilidad inicial. | Carece de las mismas herramientas relacionales y transaccionales para actas, versiones y cola. |
| WatermelonDB con sincronización especial | Mateo (comparación) | Motor reactivo con pautas de sincronización. | Requiere endpoints y protocolo adicional sin necesidad funcional en este examen. |

### Decisión

La fotografía se guarda primero en un archivo privado local; después, una transacción SQLite registra acta, ruta del archivo, metadatos originales y outbox (operation_id UUID, JRV, dignidad, payload, estado, intentos). Solo después del commit se muestra «guardada localmente». No se afirma atomicidad entre el sistema de archivos y SQLite: si hay un archivo sin referencia o una fila sin archivo, se detecta y recupera el caso.

NetInfo identifica conectividad y habilita reintentos controlados con espera creciente. PostgreSQL aplica unicidad de operation_id, autor y huella de payload: un duplicado idéntico recibe el resultado anterior y una carga distinta con el mismo UUID se rechaza. El envío de votos y la fotografía a Storage se confirman en etapas; EVIDENCIA_PENDIENTE no equivale a foto validada. La captura conserva GPS y hora originales.

Las correcciones incluyen expected_version; un CONFLICTO_VERSION o PERMISO_REVOCADO detiene reintentos automáticos y mantiene la operación local para revisión, sin sobrescritura. El archivo fotográfico solo se elimina después de confirmación del servidor y de su evidencia. Este mecanismo procura idempotencia, no entrega exactamente una vez.

### Consecuencias

Se gana la recuperación de registros tras una pérdida de red o un cierre de la aplicación, y se evitan duplicados mediante identificadores estables. Se pierde simplicidad, porque hay que programar la cola, la secuencia de estados y la resolución de conflictos. Se asume el riesgo de fotos huérfanas, permisos vencidos y conflictos entre votos y evidencia. Durante el desarrollo, deben probarse el modo avión, el cierre forzado, la reconexión y la repetición de un mismo identificador.

### Minuto del video

Minuto de referencia del video final: 01:33:00
