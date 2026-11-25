-- ============================================================================
-- Bootstrap — Cuenta PROVINCIAL inicial (Fase 2D / DI-06)
--
-- Requerimientos: RF-01 (roles), RNF-03 (seguridad), RNF-04 (integridad).
-- Línea base: ADR-04 (alta controlada, sin signUp público), ADR-05 (ámbito).
-- Decisión: DI-06.
--
-- PROPÓSITO
--   Insertar/activar el perfil PROVINCIAL inicial para un usuario que YA fue
--   creado manualmente en el panel de Supabase (Authentication > Add user, con
--   correo confirmado). NO inserta en auth.users por SQL (prohibido por DI-06).
--
-- USO (psql / Supabase SQL Editor con variables psql)
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
--     -v email='provincial@ejemplo.ec' \
--     -v cedula='1712345675' \
--     -v nombres='Nombre' \
--     -v apellidos='Apellido' \
--     -f supabase/bootstrap_provincial.sql
--
-- PARÁMETROS (psql -v)
--   email     : correo del usuario ya creado en Supabase Auth (obligatorio).
--   cedula    : cédula ecuatoriana válida (10 dígitos, módulo 10). Obligatoria.
--   nombres   : nombres del perfil. Por defecto: 'Coordinador'.
--   apellidos : apellidos del perfil. Por defecto: 'Provincial'.
--
-- PRERREQUISITOS
--   - Ejecutar migraciones y seed (provincia Pichincha codigo '17' debe existir).
--   - El usuario debe existir en auth.users con correo confirmado.
--   - La cédula debe ser válida (misma regla que dominio TS / es_cedula_valida).
--
-- IDEMPOTENCIA
--   Si ya existe perfil para ese id_auth, actualiza rol/estado/provincia_id y
--   datos básicos sin crear duplicados (ON CONFLICT id_auth).
-- ============================================================================

\if :{?email}
\else
  \echo 'ERROR: falta -v email=...'
  \quit 1
\endif

\if :{?cedula}
\else
  \echo 'ERROR: falta -v cedula=... (cédula ecuatoriana válida, 10 dígitos)'
  \quit 1
\endif

\if :{?nombres}
\else
  \set nombres 'Coordinador'
\endif

\if :{?apellidos}
\else
  \set apellidos 'Provincial'
\endif

BEGIN;

DO $bootstrap$
DECLARE
  v_email text := :'email';
  v_cedula text := :'cedula';
  v_nombres text := :'nombres';
  v_apellidos text := :'apellidos';
  v_auth_id uuid;
  v_provincia_id uuid;
  v_profile_id uuid;
BEGIN
  SELECT u.id
    INTO v_auth_id
    FROM auth.users u
   WHERE lower(u.email) = lower(v_email)
   LIMIT 1;

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'No existe usuario en auth.users con email %. Cree el usuario primero en Supabase Authentication > Add user (correo confirmado).', v_email;
  END IF;

  SELECT p.id
    INTO v_provincia_id
    FROM public.provincias p
   WHERE p.codigo = '17';

  IF v_provincia_id IS NULL THEN
    RAISE EXCEPTION 'No existe la provincia Pichincha (codigo 17). Ejecute migraciones y supabase/seed.sql antes del bootstrap.';
  END IF;

  IF NOT public.es_cedula_valida(v_cedula) THEN
    RAISE EXCEPTION 'La cédula % no es válida según es_cedula_valida() (módulo 10).', v_cedula;
  END IF;

  INSERT INTO public.profiles (
    id_auth,
    cedula,
    nombres,
    apellidos,
    email,
    rol,
    estado,
    provincia_id,
    creado_por
  )
  VALUES (
    v_auth_id,
    v_cedula,
    v_nombres,
    v_apellidos,
    lower(v_email),
    'PROVINCIAL',
    'ACTIVO',
    v_provincia_id,
    NULL
  )
  ON CONFLICT (id_auth) DO UPDATE
  SET cedula = EXCLUDED.cedula,
      nombres = EXCLUDED.nombres,
      apellidos = EXCLUDED.apellidos,
      email = EXCLUDED.email,
      rol = 'PROVINCIAL',
      estado = 'ACTIVO',
      provincia_id = EXCLUDED.provincia_id
  RETURNING id INTO v_profile_id;

  RAISE NOTICE 'Perfil PROVINCIAL listo: profile_id=%, auth_id=%, email=%, provincia=Pichincha(17)', v_profile_id, v_auth_id, lower(v_email);
END;
$bootstrap$;

COMMIT;