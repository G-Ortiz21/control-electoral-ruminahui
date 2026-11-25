-- ============================================================================
-- Fase 2C — Pruebas SQL de RPC (RF-04, RF-05, RF-08, RF-09, RNF-04)
-- Archivo: supabase/tests/fase_2c_rpc.sql
--
-- Cómo correr (migraciones 2A + 2B + 2C aplicadas):
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/fase_2c_rpc.sql
--
-- Todo corre en UNA transacción terminada en ROLLBACK.
-- NOTA: INSERT en auth.users es SOLO para pruebas locales (DI-06).
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.f2c_afirmar(p_nombre text, p_ok boolean)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_ok IS TRUE THEN
    RAISE NOTICE 'OK: %', p_nombre;
  ELSE
    RAISE EXCEPTION 'FALLA: %', p_nombre;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.f2c_como(p_auth_uid uuid, p_sql text, p_esperado text DEFAULT 'OK')
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_auth_uid::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('role', 'authenticated', true);
  BEGIN
    EXECUTE p_sql;
    PERFORM set_config('role', 'none', true);
    RESET ROLE;
    IF p_esperado = 'ERROR' THEN
      RAISE EXCEPTION 'FALLA: debía rechazar: %', left(p_sql, 160);
    END IF;
    RAISE NOTICE 'OK (aceptado): %', left(p_sql, 120);
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM set_config('role', 'none', true);
      RESET ROLE;
      IF SQLERRM LIKE 'FALLA:%' THEN RAISE; END IF;
      IF p_esperado = 'OK' THEN
        RAISE EXCEPTION 'FALLA: debía aceptar: % => %', left(p_sql, 160), SQLERRM;
      END IF;
      RAISE NOTICE 'OK (rechazado): % => %', left(p_sql, 120), SQLERRM;
  END;
END;
$$;

-- Helper: ejecuta como usuario y devuelve jsonb (para inspeccionar respuestas RPC)
CREATE OR REPLACE FUNCTION public.f2c_rpc_como(p_auth_uid uuid, p_sql text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_auth_uid::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('role', 'authenticated', true);
  EXECUTE p_sql INTO v;
  PERFORM set_config('role', 'none', true);
  RESET ROLE;
  RETURN v;
END;
$$;

-- ----------------------------------------------------------------------------
-- Datos base
-- ----------------------------------------------------------------------------
INSERT INTO public.provincias (id, codigo, nombre)
VALUES ('c1000000-0000-4000-8000-000000000001', 'PC', 'PROVINCIA F2C')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'c2000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'f2c-prov@test.local', 'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c2000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'f2c-coord@test.local', 'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c2000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'f2c-v1@test.local', 'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c2000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'f2c-v2@test.local', 'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c2000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'f2c-v3@test.local', 'x', now(), '{}', '{}', now(), now());

INSERT INTO public.profiles (id, id_auth, cedula, nombres, apellidos, telefono, email, rol, estado, provincia_id)
VALUES
  ('c3000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000001', '1710034065', 'Prov', 'F2C', '0990001001', 'f2c-prov@test.local', 'PROVINCIAL', 'ACTIVO', 'c1000000-0000-4000-8000-000000000001'),
  ('c3000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000002', '1710034073', 'Coord', 'F2C', '0990001002', 'f2c-coord@test.local', 'COORDINADOR', 'ACTIVO', 'c1000000-0000-4000-8000-000000000001'),
  ('c3000000-0000-4000-8000-000000000003', 'c2000000-0000-4000-8000-000000000003', '1710034099', 'Veedor', 'Uno', '0990001003', 'f2c-v1@test.local', 'VEEDOR', 'ACTIVO', 'c1000000-0000-4000-8000-000000000001'),
  ('c3000000-0000-4000-8000-000000000004', 'c2000000-0000-4000-8000-000000000004', '1710034107', 'Veedor', 'Dos', '0990001004', 'f2c-v2@test.local', 'VEEDOR', 'ACTIVO', 'c1000000-0000-4000-8000-000000000001'),
  ('c3000000-0000-4000-8000-000000000005', 'c2000000-0000-4000-8000-000000000005', '1710034115', 'Veedor', 'Tres', '0990001005', 'f2c-v3@test.local', 'VEEDOR', 'ACTIVO', 'c1000000-0000-4000-8000-000000000001');

INSERT INTO public.recintos (id, provincia_id, canton, parroquia, nombre, lat, lon)
VALUES ('c4000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'RUMI', 'SAN', 'RECINTO F2C', -0.1, -78.1);

INSERT INTO public.jrv (id, recinto_id, numero)
VALUES
  ('c5000000-0000-4000-8000-000000000001', 'c4000000-0000-4000-8000-000000000001', 1),
  ('c5000000-0000-4000-8000-000000000002', 'c4000000-0000-4000-8000-000000000001', 2),
  ('c5000000-0000-4000-8000-000000000003', 'c4000000-0000-4000-8000-000000000001', 3),
  ('c5000000-0000-4000-8000-000000000004', 'c4000000-0000-4000-8000-000000000001', 4);

INSERT INTO public.organizaciones (id, nombre, color)
VALUES
  ('c8000000-0000-4000-8000-000000000001', 'ORG F2C A', '#111111'),
  ('c8000000-0000-4000-8000-000000000002', 'ORG F2C B', '#222222'),
  ('c8000000-0000-4000-8000-000000000003', 'ORG F2C C', '#333333'),
  ('c8000000-0000-4000-8000-000000000004', 'ORG F2C D', '#444444'),
  ('c8000000-0000-4000-8000-000000000005', 'ORG F2C E', '#555555')
ON CONFLICT (nombre) DO NOTHING;

-- Coordinador vigente en recinto
INSERT INTO public.coordinadores_recinto (id, recinto_id, coordinador_id, desde, hasta, motivo, asignado_por)
VALUES ('c6000000-0000-4000-8000-000000000001', 'c4000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-000000000002', now(), NULL, 'test', 'c3000000-0000-4000-8000-000000000001');

-- Veedor 1 vigente en JRV 1,2,3 para prueba de reemplazo en una sola JRV
INSERT INTO public.asignaciones_veedor (id, jrv_id, veedor_id, desde, hasta, motivo, asignado_por)
VALUES
  ('c7000000-0000-4000-8000-000000000001', 'c5000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-000000000003', now(), NULL, 'inicial', 'c3000000-0000-4000-8000-000000000001'),
  ('c7000000-0000-4000-8000-000000000002', 'c5000000-0000-4000-8000-000000000002', 'c3000000-0000-4000-8000-000000000003', now(), NULL, 'inicial', 'c3000000-0000-4000-8000-000000000001'),
  ('c7000000-0000-4000-8000-000000000003', 'c5000000-0000-4000-8000-000000000003', 'c3000000-0000-4000-8000-000000000003', now(), NULL, 'inicial', 'c3000000-0000-4000-8000-000000000001'),
  ('c7000000-0000-4000-8000-000000000004', 'c5000000-0000-4000-8000-000000000004', 'c3000000-0000-4000-8000-000000000003', now(), NULL, 'inicial', 'c3000000-0000-4000-8000-000000000001');

-- ----------------------------------------------------------------------------
-- Caso 1: reintento idempotente (ADR-08, RNF-04)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v1 jsonb;
  v2 jsonb;
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'c2000000-0000-4000-8000-000000000003', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('role', 'authenticated', true);

  v1 := public.registrar_acta(
    'c0000001-0000-4000-8000-000000000001'::uuid,
    'c5000000-0000-4000-8000-000000000001'::uuid,
    'ALCALDIA'::public.dignidad,
    '[{"organizacion_id":"c8000000-0000-4000-8000-000000000001","votos":20},{"organizacion_id":"c8000000-0000-4000-8000-000000000002","votos":20},{"organizacion_id":"c8000000-0000-4000-8000-000000000003","votos":20},{"organizacion_id":"c8000000-0000-4000-8000-000000000004","votos":20},{"organizacion_id":"c8000000-0000-4000-8000-000000000005","votos":10}]'::jsonb,
    5, 5, 100,
    now(), -0.1, -78.1, 10.0,
    'NORMAL'::public.calidad_foto,
    25.0
  );

  v2 := public.registrar_acta(
    'c0000001-0000-4000-8000-000000000001'::uuid,
    'c5000000-0000-4000-8000-000000000001'::uuid,
    'ALCALDIA'::public.dignidad,
    '[{"organizacion_id":"c8000000-0000-4000-8000-000000000001","votos":20},{"organizacion_id":"c8000000-0000-4000-8000-000000000002","votos":20},{"organizacion_id":"c8000000-0000-4000-8000-000000000003","votos":20},{"organizacion_id":"c8000000-0000-4000-8000-000000000004","votos":20},{"organizacion_id":"c8000000-0000-4000-8000-000000000005","votos":10}]'::jsonb,
    5, 5, 100,
    now(), -0.1, -78.1, 10.0,
    'NORMAL'::public.calidad_foto,
    25.0
  );

  PERFORM set_config('role', 'none', true);
  RESET ROLE;

  IF v1->>'status' <> 'ACEPTADO' THEN
    RAISE EXCEPTION 'FALLA: primer registrar_acta debía ACEPTADO, got %', v1;
  END IF;
  IF v2->>'status' <> 'ACEPTADO' OR (v2->>'idempotent')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'FALLA: reintento debía ser ACEPTADO idempotente, got %', v2;
  END IF;

  SELECT count(*) INTO v_count FROM public.actas
   WHERE jrv_id = 'c5000000-0000-4000-8000-000000000001' AND dignidad = 'ALCALDIA';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FALLA: reintento idempotente no debe duplicar acta, count=%', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.votos_acta va
   JOIN public.actas a ON a.id = va.acta_id
   WHERE a.jrv_id = 'c5000000-0000-4000-8000-000000000001' AND a.dignidad = 'ALCALDIA';
  IF v_count <> 5 THEN
    RAISE EXCEPTION 'FALLA: reintento idempotente no debe duplicar votos, count=%', v_count;
  END IF;

  RAISE NOTICE 'OK: reintento idempotente devuelve resultado anterior sin duplicar';
END;
$$;

-- ----------------------------------------------------------------------------
-- Caso 2: mismo operation_id, hash distinto => error (ADR-08)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_msg text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'c2000000-0000-4000-8000-000000000003', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('role', 'authenticated', true);

  BEGIN
    PERFORM public.registrar_acta(
      'c0000001-0000-4000-8000-000000000001'::uuid, -- mismo operation_id
      'c5000000-0000-4000-8000-000000000001'::uuid,
      'ALCALDIA'::public.dignidad,
      '[{"organizacion_id":"c8000000-0000-4000-8000-000000000001","votos":21},{"organizacion_id":"c8000000-0000-4000-8000-000000000002","votos":19},{"organizacion_id":"c8000000-0000-4000-8000-000000000003","votos":20},{"organizacion_id":"c8000000-0000-4000-8000-000000000004","votos":20},{"organizacion_id":"c8000000-0000-4000-8000-000000000005","votos":10}]'::jsonb,
      5, 5, 100,
      now(), -0.1, -78.1, 10.0,
      'NORMAL'::public.calidad_foto,
      25.0
    );
    PERFORM set_config('role', 'none', true);
    RESET ROLE;
    RAISE EXCEPTION 'FALLA: hash distinto debía ser rechazado';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM set_config('role', 'none', true);
      RESET ROLE;
      IF SQLERRM LIKE 'FALLA:%' THEN RAISE; END IF;
      RAISE NOTICE 'OK: hash distinto rechazado => %', SQLERRM;
  END;
END;
$$;

-- ----------------------------------------------------------------------------
-- Caso 3: reemplazo con 3 JRV — afecta SOLO esa JRV (ADR-06, DI-06)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v jsonb;
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'c2000000-0000-4000-8000-000000000001', true); -- provincial
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('role', 'authenticated', true);

  v := public.reemplazar_veedor(
    'c5000000-0000-4000-8000-000000000001'::uuid,
    'c3000000-0000-4000-8000-000000000004'::uuid, -- veedor 2
    'Ausencia reportada'
  );

  PERFORM set_config('role', 'none', true);
  RESET ROLE;

  IF v->>'status' <> 'ACEPTADO' THEN
    RAISE EXCEPTION 'FALLA: reemplazar_veedor debía ACEPTAR, got %', v;
  END IF;

  -- JRV 1: veedor 2 vigente
  SELECT count(*) INTO v_count FROM public.asignaciones_veedor
   WHERE jrv_id = 'c5000000-0000-4000-8000-000000000001'
     AND veedor_id = 'c3000000-0000-4000-8000-000000000004'
     AND hasta IS NULL;
  IF v_count <> 1 THEN RAISE EXCEPTION 'FALLA: veedor 2 debía quedar vigente en JRV 1'; END IF;

  -- JRV 1: veedor 1 ya no vigente
  SELECT count(*) INTO v_count FROM public.asignaciones_veedor
   WHERE jrv_id = 'c5000000-0000-4000-8000-000000000001'
     AND veedor_id = 'c3000000-0000-4000-8000-000000000003'
     AND hasta IS NULL;
  IF v_count <> 0 THEN RAISE EXCEPTION 'FALLA: veedor 1 no debía seguir vigente en JRV 1'; END IF;

  -- JRV 2 y 3: veedor 1 sigue vigente (afecta SOLO esa JRV)
  SELECT count(*) INTO v_count FROM public.asignaciones_veedor
   WHERE jrv_id IN ('c5000000-0000-4000-8000-000000000002', 'c5000000-0000-4000-8000-000000000003')
     AND veedor_id = 'c3000000-0000-4000-8000-000000000003'
     AND hasta IS NULL;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'FALLA: veedor 1 debía seguir vigente en JRV 2 y 3, count=%', v_count;
  END IF;

  -- Historial conserva motivo y asignado_por
  SELECT count(*) INTO v_count FROM public.asignaciones_veedor
   WHERE jrv_id = 'c5000000-0000-4000-8000-000000000001'
     AND motivo IS NOT NULL AND asignado_por IS NOT NULL;
  IF v_count < 2 THEN RAISE EXCEPTION 'FALLA: historial de reemplazo incompleto'; END IF;

  RAISE NOTICE 'OK: reemplazo con 3 JRV afecta solo la JRV indicada';
END;
$$;

-- ----------------------------------------------------------------------------
-- Caso 4: dos correcciones con la misma expected_version (DI-08/S-07)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_acta_id uuid;
  v1 jsonb;
  v2 jsonb;
  v_sufragantes integer;
BEGIN
  SELECT id INTO v_acta_id FROM public.actas
   WHERE jrv_id = 'c5000000-0000-4000-8000-000000000001' AND dignidad = 'ALCALDIA';

  -- Primera corrección: expected_version = 1, válida (coordinador en su recinto)
  PERFORM set_config('request.jwt.claim.sub', 'c2000000-0000-4000-8000-000000000002', true); -- coord
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('role', 'authenticated', true);

  v1 := public.corregir_acta(
    'c0000002-0000-4000-8000-000000000001'::uuid,
    v_acta_id,
    1,
    jsonb_build_object(
      'sufragantes', 101,
      'blancos', 5,
      'nulos', 5,
      'votos', jsonb_build_array(
        jsonb_build_object('organizacion_id','c8000000-0000-4000-8000-000000000001','votos',21),
        jsonb_build_object('organizacion_id','c8000000-0000-4000-8000-000000000002','votos',20),
        jsonb_build_object('organizacion_id','c8000000-0000-4000-8000-000000000003','votos',20),
        jsonb_build_object('organizacion_id','c8000000-0000-4000-8000-000000000004','votos',20),
        jsonb_build_object('organizacion_id','c8000000-0000-4000-8000-000000000005','votos',10)
      )
    ),
    'Corrección de conteo'
  );

  -- Segunda corrección: misma expected_version = 1 => CONFLICTO_VERSION
  v2 := public.corregir_acta(
    'c0000002-0000-4000-8000-000000000002'::uuid,
    v_acta_id,
    1,
    jsonb_build_object(
      'sufragantes', 102,
      'blancos', 5,
      'nulos', 5,
      'votos', jsonb_build_array(
        jsonb_build_object('organizacion_id','c8000000-0000-4000-8000-000000000001','votos',22),
        jsonb_build_object('organizacion_id','c8000000-0000-4000-8000-000000000002','votos',20),
        jsonb_build_object('organizacion_id','c8000000-0000-4000-8000-000000000003','votos',20),
        jsonb_build_object('organizacion_id','c8000000-0000-4000-8000-000000000004','votos',20),
        jsonb_build_object('organizacion_id','c8000000-0000-4000-8000-000000000005','votos',10)
      )
    ),
    'Otra corrección'
  );

  PERFORM set_config('role', 'none', true);
  RESET ROLE;

  IF v1->>'status' <> 'ACEPTADO' THEN
    RAISE EXCEPTION 'FALLA: primera corrección debía ACEPTAR, got %', v1;
  END IF;
  IF v2->>'status' <> 'CONFLICTO_VERSION' THEN
    RAISE EXCEPTION 'FALLA: segunda corrección con misma expected_version debía dar CONFLICTO_VERSION, got %', v2;
  END IF;

  SELECT sufragantes INTO v_sufragantes FROM public.actas WHERE id = v_acta_id;
  IF v_sufragantes <> 101 THEN
    RAISE EXCEPTION 'FALLA: el acta no debía cambiar tras CONFLICTO_VERSION, sufragantes=%', v_sufragantes;
  END IF;

  IF (SELECT count(*) FROM public.revisiones_acta WHERE acta_id = v_acta_id) <> 1 THEN
    RAISE EXCEPTION 'FALLA: solo la corrección válida debe insertar revisión';
  END IF;

  RAISE NOTICE 'OK: segunda corrección con misma expected_version => CONFLICTO_VERSION sin cambios';
END;
$$;

-- ----------------------------------------------------------------------------
-- Caso 5: veedor reemplazado sincroniza => rechazado y conservado (DI-06/S-08)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v jsonb;
  v_rechazos integer;
  v_actas integer;
BEGIN
  -- Veedor 1 fue reemplazado en JRV 1 en Caso 3. Intenta registrar PREFECTURA en JRV 1.
  PERFORM set_config('request.jwt.claim.sub', 'c2000000-0000-4000-8000-000000000003', true); -- veedor 1
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('role', 'authenticated', true);

  v := public.registrar_acta(
    'c0000003-0000-4000-8000-000000000001'::uuid,
    'c5000000-0000-4000-8000-000000000001'::uuid,
    'PREFECTURA'::public.dignidad,
    '[{"organizacion_id":"c8000000-0000-4000-8000-000000000001","votos":20},{"organizacion_id":"c8000000-0000-4000-8000-000000000002","votos":20},{"organizacion_id":"c8000000-0000-4000-8000-000000000003","votos":20},{"organizacion_id":"c8000000-0000-4000-8000-000000000004","votos":20},{"organizacion_id":"c8000000-0000-4000-8000-000000000005","votos":10}]'::jsonb,
    5, 5, 100,
    now(), -0.1, -78.1, 10.0,
    'NORMAL'::public.calidad_foto,
    25.0
  );

  PERFORM set_config('role', 'none', true);
  RESET ROLE;

  IF v->>'status' <> 'RECHAZADO' THEN
    RAISE EXCEPTION 'FALLA: veedor reemplazado debía ser RECHAZADO, got %', v;
  END IF;

  SELECT count(*) INTO v_rechazos FROM public.operaciones_rechazadas
   WHERE operation_id = 'c0000003-0000-4000-8000-000000000001'
     AND autor = 'c3000000-0000-4000-8000-000000000003';
  IF v_rechazos <> 1 THEN
    RAISE EXCEPTION 'FALLA: intento rechazado debía conservarse en operaciones_rechazadas, count=%', v_rechazos;
  END IF;

  SELECT count(*) INTO v_actas FROM public.actas
   WHERE jrv_id = 'c5000000-0000-4000-8000-000000000001' AND dignidad = 'PREFECTURA';
  IF v_actas <> 0 THEN
    RAISE EXCEPTION 'FALLA: el acta remota NO debe alterarse por veedor reemplazado';
  END IF;

  RAISE NOTICE 'OK: veedor reemplazado => rechazado, conservado en operaciones_rechazadas, sin alterar acta';
END;
$$;

ROLLBACK;

SELECT 'FASE 2C: PRUEBAS RPC PASARON' AS resultado;
