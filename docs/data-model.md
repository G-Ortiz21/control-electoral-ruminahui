# Modelo de datos (borrador — completar en Fase 2)

Fuente: ADR-02, ADR-03, ADR-05, ADR-06, ADR-08. Los nombres de las tablas listadas en ADR-02 son parte de la línea base; las columnas adicionales son decisión del implementador.

## PostgreSQL / Supabase
| Tabla | Columnas clave (según ADR) | Restricciones |
|---|---|---|
| profiles | id_auth, cedula, nombres, apellidos, telefono, email, rol, estado (PENDIENTE/ACTIVO/DESACTIVADO), creado_por | UNIQUE(cedula) |
| recintos | provincia_id, canton, parroquia, nombre, lat, lon | UNIQUE natural |
| jrv | recinto_id, numero | UNIQUE(recinto_id, numero) |
| coordinadores_recinto (o equivalente) | recinto_id, coordinador_id, desde, hasta | UNIQUE parcial `WHERE hasta IS NULL` |
| asignaciones_veedor | jrv_id, veedor_id, desde, hasta, motivo, asignado_por | UNIQUE parcial (jrv_id) `WHERE hasta IS NULL` |
| organizaciones | id, nombre, color… | — |
| candidatos | organizacion_id, dignidad, nombre | dignidad ∈ {ALCALDIA, PREFECTURA} |
| actas | jrv_id, dignidad, version, estado, captured_at, lat, lon, accuracy, foto_path, sufragantes, blancos, nulos | UNIQUE(jrv_id, dignidad); CHECK de no negativos |
| votos_acta | acta_id, organizacion_id, votos | CHECK(votos >= 0) |
| revisiones_acta | acta_id, version, autor, motivo, valores_anteriores, creado_en | no editable por usuarios ordinarios |
| operaciones_recibidas | operation_id (UNIQUE), autor, payload_hash, resultado | idempotencia (ADR-08) |
| catalogo_version | version, aplicado_en | seed idempotente (ADR-03) |

Storage: bucket **privado** `actas`; ruta sugerida `{recinto_id}/{jrv_id}/{dignidad}/{operation_id}.jpg`.

## SQLite local (decisión del implementador)
`catalogo_*` (réplica autorizada), `actas_locales`, `outbox` (operation_id, jrv, dignidad, tipo, payload, foto_path, intentos, estado), `errores_pendientes` (ADR-11).

## Funciones/RPC previstas
- `crear_usuario` (Edge Function, no RPC): valida creador/rol/ámbito (ADR-04).
- `registrar_acta(operation_id, …)`, `corregir_acta(operation_id, expected_version, …)`, `reemplazar_veedor(jrv_id, nuevo_veedor, motivo)` — transaccionales, validan ámbito del solicitante.
- `resultados_por_recinto(dignidad)`, `avance_por_recinto()` — agregan solo versión vigente (ADR-10).
