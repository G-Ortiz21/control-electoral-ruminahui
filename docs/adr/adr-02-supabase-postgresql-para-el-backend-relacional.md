# ADR-02: Supabase/PostgreSQL para el backend relacional

> **Estado de la línea base:** OBLIGATORIO (ratificado).
>
> **Margen del implementador (decisión propia):** Columnas y tablas auxiliares, índices, vistas y funciones SQL, respetando las tablas y UNIQUE/CHECK descritas. La cuadratura se verifica con una operación íntegra del servidor, no solo con CHECK por fila.
>
> Copia fiel del documento consolidado final. No editar el contenido bajo la línea `---`.

---

### Requerimientos relacionados

RF-01, RF-03, RF-05, RF-08, RF-10, RF-11; RNF-03, RNF-04

### Contexto

La relación entre usuarios, recintos, JRV, asignaciones, candidaturas, actas y correcciones requiere integridad referencial y control de acceso. En V2-P1 se contrastó Supabase/PostgreSQL con Firebase y otras alternativas; la elección permite manejar restricciones relacionales y consultas agregadas desde una fuente común.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| Supabase: PostgreSQL + Auth + Storage + Realtime | Camila, Gelen y Mateo; propuesta en la reunión V2-P1 | Claves foráneas, restricciones UNIQUE/CHECK, consultas agregadas y servicios administrados bajo un proveedor. | Se debe diseñar el esquema y probar políticas; el servicio remoto no reemplaza la persistencia offline. |
| Firebase Auth + Firestore + Storage | Gelen y Mateo (comparación) | Servicios móviles integrados y actualizaciones en tiempo real. | La relación asignación vigente → JRV → recinto y las agregaciones requieren más diseño específico. |
| Appwrite o API propia | Gelen y Mateo (comparación) | Mayor flexibilidad de despliegue o control de endpoints. | La gestión de permisos y agregaciones para este alcance añade trabajo al equipo. |

### Decisión

Se utiliza Supabase con Auth para identidad, PostgreSQL para perfiles, territorio, recintos, JRV, asignaciones vigentes e históricas, organizaciones, candidatos por dignidad, actas, votos y revisiones; Storage privado para fotografías y Realtime para avisos de cambios. Se establecen claves foráneas, unicidad de cédula, UNIQUE(recinto_id, numero) en JRV y UNIQUE(jrv_id, dignidad) para el acta vigente. La cuadratura de votos se verifica con una operación íntegra del servidor, no solo con CHECK por fila.

El servidor registra transaccionalmente cada revisión del acta y conserva la versión vigente para las consultas. Las operaciones privilegiadas verifican identidad, rol y ámbito; ninguna clave service_role se incorpora al APK. Las consultas agregadas y las fotografías respetan las mismas restricciones de autorización territorial.

### Consecuencias

Se gana integridad relacional, auditoría y totales únicos para el seguimiento, con un solo proveedor para datos, autenticación y archivos. Se pierde independencia respecto de ese proveedor y se asume el costo de diseñar el esquema y las políticas de acceso. Durante el desarrollo, las migraciones deben versionarse, las restricciones de unicidad deben probarse y la clave service_role debe permanecer fuera de la aplicación.

### Minuto del video

Minuto de referencia del video final: 00:44:29
