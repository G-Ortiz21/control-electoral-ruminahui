# ADR-07: Validación de formularios con React Hook Form, Zod y reglas SQL

> **Estado de la línea base:** OBLIGATORIO (ratificado). expected_version / CONFLICTO_VERSION (S-07).
>
> **Margen del implementador (decisión propia):** Mensajes de error y esquemas Zod. Las pruebas deben cubrir los mismos casos en dominio y en la base de datos.
>
> Copia fiel del documento consolidado final. No editar el contenido bajo la línea `---`.

---

### Requerimientos relacionados

RF-01, RF-05, RF-08; RNF-04, RNF-06; S-04, S-07

### Contexto

Un veedor sin señal debe detectar sumas imposibles antes de guardar; además, el servidor no puede confiar exclusivamente en el formulario. La corrección por parte del veedor o coordinador requiere conservar valores anteriores y resolver ediciones simultáneas sin sobrescribir información válida.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| React Hook Form + Zod en formulario, reglas puras del dominio y CHECK/trigger SQL | Camila y Mateo; función de dominio propuesta por Gelen | Mensajes por campo y validación offline; reglas importantes comprobables y defendibles en servidor. | Doble implementación exige pruebas para que JavaScript y PostgreSQL acepten los mismos casos. |
| Formulario controlado + validación TypeScript manual | Gelen Ortiz | Menos dependencias y lógica totalmente visible. | Incrementa código de estado, errores por campo, reinicio y validación cruzada. |
| Validar solo desde PostgreSQL | Alternativa comparada y descartada | Una implementación central remota. | No permite detectar números imposibles sin internet y genera reintentos evitables. |

### Decisión

Se utilizan React Hook Form y Zod en presentación para campos obligatorios, formato y errores visibles. Una función pura del dominio exige cinco votos por organizaciones, blancos, nulos y sufragantes como enteros no negativos; la suma de siete valores debe igualar a sufragantes. PostgreSQL vuelve a validar la operación completa en el servidor, incluso frente a clientes modificados.

Toda corrección autorizada exige motivo y conserva autor, hora del servidor, versión y valores previos. Se adopta expected_version: el servidor actualiza solo si coincide con la versión vigente y devuelve CONFLICTO_VERSION en caso contrario, sin sobrescribir. La propuesta local queda pendiente de revisión y puede rehacerse sobre la versión actual. Se descarta la regla de última escritura gana por riesgo de pérdida de correcciones.

### Consecuencias

Se gana una validación coherente en línea y sin conexión, con historial completo de correcciones. Se pierde simplicidad, porque las reglas se mantienen en TypeScript y en PostgreSQL. Se asume el riesgo de divergencia entre ambas implementaciones y la necesidad de resolver los conflictos de edición. Durante el desarrollo, las pruebas deben cubrir los mismos casos en el dominio y en la base de datos, y toda corrección debe enviar la versión que modifica.

### Minuto del video

Minuto de referencia del video final: 01:23:53
