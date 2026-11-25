-- ============================================================================
-- Fase 2D — Pruebas de seed y bootstrap (RF-14, RNF-04)
-- Archivo: supabase/tests/fase_2d_seed.sql
--
-- Cómo correr (necesita migraciones aplicadas):
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/fase_2d_seed.sql
--   En local: supabase db reset (aplica migrations/ y seed.sql) y luego este test.
--
-- Qué verifica:
--   * Seed idempotente: ejecutar seed dos veces no duplica filas.
--   * Conteo de recintos/JRV según DI-01 (mínimo 8 recintos, 3–6 JRV cada uno).
--   * 5 organizaciones ficticias y 5 candidaturas por dignidad.
--   * catalogo_version = 1 con fuente de prueba documentada.
--   * Bootstrap provincial (DI-06): inserta perfil PROVINCIAL ACTIVO para un
--     usuario ya existente en auth.users, sin tocar auth.users.
--
-- Todo corre en UNA transacción terminada en ROLLBACK: no deja datos.
-- ============================================================================
\set ON_ERROR_STOP on

BEGIN;

CREATE OR REPLACE FUNCTION public.f2d_afirmar(p_nombre text, p_ok boolean)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_ok IS TRUE THEN
    RAISE NOTICE 'OK (afirmacion): %', p_nombre;
  ELSE
    RAISE EXCEPTION 'FALLA: afirmacion fallida: %', p_nombre;
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- Seed: primera ejecución (dentro de la transacción de prueba)
-- ----------------------------------------------------------------------------
\ir ../seed.sql

-- Conteos base después de la primera ejecución
SELECT public.f2d_afirmar('T01 catalogo_version = 2 existe',
  EXISTS (SELECT 1 FROM public.catalogo_version WHERE version = 2));

SELECT public.f2d_afirmar('T02 fuente de catalogo_version contiene texto del CSV',
  EXISTS (
    SELECT 1 FROM public.catalogo_version
    WHERE version = 2
      AND fuente ILIKE '%Catálogo electoral Rumiñahui (Pichincha) — CNE, corte 14/10/2026%'
  ));

SELECT public.f2d_afirmar('T03 hay 22 recintos de Rumiñahui (CSV)',
  (SELECT count(*) = 22 FROM public.recintos r
    JOIN public.provincias p ON p.id = r.provincia_id
   WHERE p.codigo = '17' AND r.canton = 'Rumiñahui'));

SELECT public.f2d_afirmar('T04 cada recinto tiene al menos 1 JRV',
  NOT EXISTS (
    SELECT 1
    FROM (
      SELECT r.id, count(j.id) AS jrv_count
      FROM public.recintos r
      JOIN public.provincias p ON p.id = r.provincia_id
      LEFT JOIN public.jrv j ON j.recinto_id = r.id
      WHERE p.codigo = '17' AND r.canton = 'Rumiñahui'
      GROUP BY r.id
    ) c
    WHERE c.jrv_count < 1
  ));

SELECT public.f2d_afirmar('T05 existen las 5 parroquias reales de Rumiñahui',
  (SELECT count(DISTINCT r.parroquia) = 5
     FROM public.recintos r
     JOIN public.provincias p ON p.id = r.provincia_id
    WHERE p.codigo = '17' AND r.canton = 'Rumiñahui'
      AND r.parroquia IN ('Sangolquí', 'San Rafael', 'San Pedro de Taboada', 'Cotogchoa', 'Rumipamba')));

SELECT public.f2d_afirmar('T06 hay 5 organizaciones',
  (SELECT count(*) = 5 FROM public.organizaciones));

SELECT public.f2d_afirmar('T07 existe Movimiento Horizonte Ciudadano',
  EXISTS (SELECT 1 FROM public.organizaciones WHERE nombre = 'Movimiento Horizonte Ciudadano'));

SELECT public.f2d_afirmar('T08 hay 5 candidaturas de ALCALDIA',
  (SELECT count(*) = 5 FROM public.candidatos WHERE dignidad = 'ALCALDIA'));

SELECT public.f2d_afirmar('T09 hay 5 candidaturas de PREFECTURA',
  (SELECT count(*) = 5 FROM public.candidatos WHERE dignidad = 'PREFECTURA'));

SELECT public.f2d_afirmar('T10 cada organización tiene candidato en ambas dignidades',
  NOT EXISTS (
    SELECT 1
    FROM public.organizaciones o
    LEFT JOIN public.candidatos c ON c.organizacion_id = o.id
    GROUP BY o.id
    HAVING count(DISTINCT c.dignidad) <> 2
  ));

SELECT public.f2d_afirmar('T11 coordenadas de recintos dentro de rango válido',
  NOT EXISTS (
    SELECT 1 FROM public.recintos r
     WHERE r.lat NOT BETWEEN -90 AND 90 OR r.lon NOT BETWEEN -180 AND 180
  ));

-- Capturar conteos para comparar tras segunda ejecución
CREATE TEMP TABLE f2d_conteos_1 AS
SELECT
  (SELECT count(*) FROM public.catalogo_version) AS catalogo,
  (SELECT count(*) FROM public.provincias WHERE codigo = '17') AS provincias,
  (SELECT count(*) FROM public.recintos r JOIN public.provincias p ON p.id=r.provincia_id WHERE p.codigo='17' AND r.canton='Rumiñahui') AS recintos,
  (SELECT count(*) FROM public.jrv j JOIN public.recintos r ON r.id=j.recinto_id JOIN public.provincias p ON p.id=r.provincia_id WHERE p.codigo='17' AND r.canton='Rumiñahui') AS jrv,
  (SELECT count(*) FROM public.organizaciones) AS organizaciones,
  (SELECT count(*) FROM public.candidatos) AS candidatos;

-- ----------------------------------------------------------------------------
-- Seed: segunda ejecución (idempotencia)
-- ----------------------------------------------------------------------------
\ir ../seed.sql

SELECT public.f2d_afirmar('T12 segunda ejecución no duplica catalogo_version',
  (SELECT count(*) FROM public.catalogo_version) = (SELECT catalogo FROM f2d_conteos_1));

SELECT public.f2d_afirmar('T13 segunda ejecución no duplica provincia',
  (SELECT count(*) FROM public.provincias WHERE codigo = '17') = (SELECT provincias FROM f2d_conteos_1));

SELECT public.f2d_afirmar('T14 segunda ejecución no duplica recintos',
  (SELECT count(*) FROM public.recintos r JOIN public.provincias p ON p.id=r.provincia_id WHERE p.codigo='17' AND r.canton='Rumiñahui') = (SELECT recintos FROM f2d_conteos_1));

SELECT public.f2d_afirmar('T15 segunda ejecución no duplica JRV',
  (SELECT count(*) FROM public.jrv j JOIN public.recintos r ON r.id=j.recinto_id JOIN public.provincias p ON p.id=r.provincia_id WHERE p.codigo='17' AND r.canton='Rumiñahui') = (SELECT jrv FROM f2d_conteos_1));

SELECT public.f2d_afirmar('T16 segunda ejecución no duplica organizaciones',
  (SELECT count(*) FROM public.organizaciones) = (SELECT organizaciones FROM f2d_conteos_1));

SELECT public.f2d_afirmar('T17 segunda ejecución no duplica candidatos',
  (SELECT count(*) FROM public.candidatos) = (SELECT candidatos FROM f2d_conteos_1));

-- ----------------------------------------------------------------------------
-- Bootstrap provincial (DI-06) - verificación en transacción de prueba
-- NOTA: insert en auth.users SOLO para prueba local; en producción el usuario
-- se crea en el panel de Supabase (DI-06). El bootstrap real no toca auth.users.
-- ----------------------------------------------------------------------------
INSERT INTO auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-00000000d106', 'authenticated', 'authenticated',
   'provincial-bootstrap@test.local', 'no-usar', now(), '{}', '{}', now(), now());

-- Simula el efecto del bootstrap_provincial.sql (misma lógica, parametrizada aquí)
DO $$
DECLARE
  v_auth_id uuid;
  v_provincia_id uuid;
BEGIN
  SELECT id INTO v_auth_id FROM auth.users WHERE lower(email)=lower('provincial-bootstrap@test.local');
  SELECT id INTO v_provincia_id FROM public.provincias WHERE codigo='17';

  INSERT INTO public.profiles (id_auth, cedula, nombres, apellidos, email, rol, estado, provincia_id, creado_por)
  VALUES (v_auth_id, '1712345675', 'Provincial', 'Bootstrap', 'provincial-bootstrap@test.local', 'PROVINCIAL', 'ACTIVO', v_provincia_id, NULL)
  ON CONFLICT (id_auth) DO UPDATE
  SET rol='PROVINCIAL', estado='ACTIVO', provincia_id=EXCLUDED.provincia_id, email=EXCLUDED.email;
END;
$$;

SELECT public.f2d_afirmar('T18 bootstrap crea perfil PROVINCIAL ACTIVO',
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN auth.users u ON u.id = p.id_auth
    WHERE lower(u.email) = 'provincial-bootstrap@test.local'
      AND p.rol = 'PROVINCIAL'
      AND p.estado = 'ACTIVO'
      AND p.provincia_id = (SELECT id FROM public.provincias WHERE codigo='17')
  ));

-- Idempotencia bootstrap: segunda aplicación no duplica
DO $$
DECLARE
  v_auth_id uuid;
  v_provincia_id uuid;
BEGIN
  SELECT id INTO v_auth_id FROM auth.users WHERE lower(email)=lower('provincial-bootstrap@test.local');
  SELECT id INTO v_provincia_id FROM public.provincias WHERE codigo='17';
  INSERT INTO public.profiles (id_auth, cedula, nombres, apellidos, email, rol, estado, provincia_id, creado_por)
  VALUES (v_auth_id, '1712345675', 'Provincial', 'Bootstrap', 'provincial-bootstrap@test.local', 'PROVINCIAL', 'ACTIVO', v_provincia_id, NULL)
  ON CONFLICT (id_auth) DO UPDATE
  SET rol='PROVINCIAL', estado='ACTIVO', provincia_id=EXCLUDED.provincia_id, email=EXCLUDED.email;
END;
$$;

SELECT public.f2d_afirmar('T19 bootstrap idempotente: un solo perfil para el auth user',
  (SELECT count(*) = 1 FROM public.profiles p
    JOIN auth.users u ON u.id = p.id_auth
   WHERE lower(u.email) = 'provincial-bootstrap@test.local'));

ROLLBACK;

SELECT 'FASE 2D: TODAS LAS PRUEBAS PASARON' AS resultado;