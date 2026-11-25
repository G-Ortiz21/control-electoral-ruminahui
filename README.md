# Control Electoral Rumiñahui

App móvil Android (React Native + Expo, TypeScript) para el escrutinio de una organización política en Ecuador. Roles: **provincial → coordinador de recinto → veedor**.

## Requisitos y línea base

- Requisitos: `docs/requirements.md`
- Supuestos: `docs/assumptions.md`
- ADRs: `docs/adr/`
- Decisiones del implementador: `docs/decisions/`
- Trazabilidad: `docs/traceability.md`

## Desarrollo

1. Instalar dependencias

   ```bash
   npm install
   ```

2. Iniciar la app (development build)

   ```bash
   npx expo start --dev-client
   ```

Comandos útiles:

- `npm test` — pruebas unitarias del dominio (sin Expo)
- `npx tsc --noEmit` — verificación de tipos
- `eas build -p android --profile preview` — APK de preview
- `supabase db reset` — aplica migraciones y seed en Supabase local
- `supabase db reset && psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/fase_2d_seed.sql` — ejemplo de prueba SQL local

## Catálogo electoral (DI-01, ADR-03, RF-14)

- **Jurisdicción:** Pichincha / Rumiñahui.
- **Fuente:** Distributivo de Recintos Electorales del CNE, corte al 14 de octubre de 2026 (data/catalogo-ruminahui.csv). **No corresponde al padrón oficial; se usa como catálogo electoral de prueba.**
- **Fuente consultada:** cne.gob.ec (Distributivo de Recintos Electorales).
- **Fecha de consulta:** 14 de octubre de 2026.
- **Versión del catálogo:** `catalogo_version = 2` (tabla `public.catalogo_version`).
- **Contenido:** 22 recintos del cantón Rumiñahui (5 parroquias: Sangolquí, San Rafael, San Pedro de Taboada, Cotogchoa, Rumipamba), 298 JRV en total; 5 organizaciones ficticias (incluye «Movimiento Horizonte Ciudadano») con un candidato de alcaldía y uno de prefectura por organización; coordenadas reales del distributivo CNE.
- **Seed:** `supabase/seed.sql` (idempotente, `INSERT ... ON CONFLICT`). Se puede ejecutar dos veces sin duplicar datos.
- **Reemplazo por listado oficial:** mantener la misma estructura de tablas/claves naturales y actualizar el seed con la fuente/fecha/versión correspondiente.

## Bootstrap de la cuenta PROVINCIAL inicial (DI-06, ADR-04, S-02)

La primera cuenta provincial **no** se crea desde el APK ni se inserta en `auth.users` por SQL.

### Procedimiento

1. **Crear el usuario en Supabase Auth (panel):**
   - Ir a **Supabase Dashboard > Authentication > Users > Add user**.
   - Ingresar correo y contraseña temporal/final según el entorno.
   - Marcar el correo como confirmado (o confirmar por el flujo correspondiente). La cuenta debe quedar con correo confirmado.
2. **Ejecutar el bootstrap SQL parametrizado por email:**
   - Archivo: `supabase/bootstrap_provincial.sql`.
   - Requiere que migraciones y `supabase/seed.sql` ya estén aplicados (la provincia Pichincha, código `17`, debe existir).
   - Ejemplo con `psql`:

   ```bash
   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
     -v email='provincial@organizacion.ec' \
     -v cedula='1712345675' \
     -v nombres='Nombre' \
     -v apellidos='Apellido' \
     -f supabase/bootstrap_provincial.sql
   ```

3. **Resultado esperado:** se inserta/actualiza una fila en `public.profiles` con `rol = PROVINCIAL`, `estado = ACTIVO`, `provincia_id` de Pichincha y `id_auth` del usuario creado en Auth.

### Reglas importantes

- **No insertar directamente en `auth.users` por SQL.** Solo el panel de Supabase / mecanismos controlados de Auth.
- Alta, verificación OTP, recuperación y primera descarga de catálogo requieren conexión (S-02).
- El script es idempotente por `id_auth` (si el perfil ya existe, lo actualiza a PROVINCIAL ACTIVO del ámbito Pichincha).
- La cédula debe ser válida según la misma regla de módulo 10 usada por dominio TS y PostgreSQL (`es_cedula_valida`).

## Pruebas SQL

Las pruebas SQL viven en `supabase/tests/` y siguen el patrón de transacción + `ROLLBACK`.

- Fase 2A: `supabase/tests/fase_2a_esquema.sql`
- Fase 2B: `supabase/tests/fase_2b_rls_storage.sql`
- Fase 2C: `supabase/tests/fase_2c_rpc.sql`
- Fase 2D: `supabase/tests/fase_2d_seed.sql` (seed idempotente, conteos DI-01, bootstrap PROVINCIAL)
## RNF-08 - Tiempo de carga (Fase 7)
Medicion en APK preview: dispositivo Android, version Android y condiciones de red documentadas en la defensa. Panel provincial re-consulta agregados SQL; Realtime solo como aviso.


## Retencion de errores pendientes (Fase 8)
Tabla SQLite errores_pendientes separada de la outbox. Se entregan al SDK de Sentry al reconectar. Retencion: maximo 30 dias o 200 registros; los mas antiguos se descartan.

