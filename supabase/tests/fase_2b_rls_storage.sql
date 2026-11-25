-- ============================================================================
-- Fase 2B — Pruebas NEGATIVAS de RLS y Storage (RF-10, RNF-03)
-- Archivo: supabase/tests/fase_2b_rls_storage.sql
--
-- Cómo correr (migraciones 2A + 2B aplicadas):
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/fase_2b_rls_storage.sql
--   Recomendado en Supabase local: supabase db reset && psql ... -f ...
--
-- Estrategia:
--   * Todo corre en UNA transacción terminada en ROLLBACK.
--   * Se crean usuarios de prueba en auth.users + profiles, territorio, JRV,
--     asignaciones, actas y una operación recibida.
--   * Para simular un usuario autenticado se usa:
--       SET LOCAL ROLE authenticated;
--       SELECT set_config('request.jwt.claim.sub', '<auth.uid>', true);
--       SELECT set_config('request.jwt.claim.role', 'authenticated', true);
--     y se vuelve a RESET ROLE / superuser antes de preparar el siguiente caso.
--   * Los helpers f2b_espera_rechazo / f2b_espera_ok ejecutan SQL dinámico como
--     el usuario autenticado y verifican que falle o pase.
--
-- NOTA: INSERT en auth.users es SOLO para pruebas locales (DI-06 prohíbe
-- hacerlo en producción por SQL).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f2b_como_usuario(p_auth_uid uuid, p_sql text, p_esperado text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_msg text;
BEGIN
  -- Ejecuta como authenticated con JWT claims del usuario indicado.
  PERFORM set_config('request.jwt.claim.sub', p_auth_uid::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('role', 'authenticated', true);

  BEGIN
    EXECUTE p_sql;
    IF p_esperado = 'ERROR' THEN
      -- Volver a rol de test antes de fallar
      PERFORM set_config('role', 'none', true);
      RESET ROLE;
      RAISE EXCEPTION 'FALLA: debía ser rechazado y fue aceptado: %', p_sql;
    END IF;
    PERFORM set_config('role', 'none', true);
    RESET ROLE;
    RAISE NOTICE 'OK (aceptado): %', left(p_sql, 120);
  EXCEPTION
    WHEN insufficient_privilege OR raise_exception OR check_violation OR unique_violation
      OR foreign_key_violation OR not_null_violation THEN
      PERFORM set_config('role', 'none', true);
      RESET ROLE;
      IF SQLERRM LIKE 'FALLA:%' THEN
        RAISE;
      END IF;
      IF p_esperado = 'OK' THEN
        RAISE EXCEPTION 'FALLA: debía ser aceptado: % => %', left(p_sql, 120), SQLERRM;
      END IF;
      RAISE NOTICE 'OK (rechazado): % => %', left(p_sql, 120), SQLERRM;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.f2b_afirmar(p_nombre text, p_ok boolean)
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
-- Datos base
-- ----------------------------------------------------------------------------
INSERT INTO public.provincias (id, codigo, nombre)
VALUES ('10000000-0000-4000-8000-000000000001', 'P1', 'PROVINCIA TEST 1')
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO public.provincias (id, codigo, nombre)
VALUES ('10000000-0000-4000-8000-000000000002', 'P2', 'PROVINCIA TEST 2')
ON CONFLICT (codigo) DO NOTHING;

-- Usuarios auth (solo pruebas locales)
INSERT INTO auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'prov1@test.local',  'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'coord1@test.local', 'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'coord2@test.local', 'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'veed1@test.local',  'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'veed2@test.local',  'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'pend@test.local',   'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'desac@test.local',  'x', now(), '{}', '{}', now(), now());

-- Profiles
INSERT INTO public.profiles (id, id_auth, cedula, nombres, apellidos, telefono, email, rol, estado, provincia_id)
VALUES
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '1710034065', 'Prov', 'Uno', '0990000001', 'prov1@test.local', 'PROVINCIAL', 'ACTIVO', '10000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '1710034073', 'Coord', 'Uno', '0990000002', 'coord1@test.local', 'COORDINADOR', 'ACTIVO', '10000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', '1710034081', 'Coord', 'Dos', '0990000003', 'coord2@test.local', 'COORDINADOR', 'ACTIVO', '10000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', '1710034099', 'Veedor', 'Uno', '0990000004', 'veed1@test.local', 'VEEDOR', 'ACTIVO', '10000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000005', '1710034107', 'Veedor', 'Dos', '0990000005', 'veed2@test.local', 'VEEDOR', 'ACTIVO', '10000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000006', '1710034115', 'Perfil', 'Pend', '0990000006', 'pend@test.local', 'VEEDOR', 'PENDIENTE', '10000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000007', '1710034123', 'Perfil', 'Desac', '0990000007', 'desac@test.local', 'VEEDOR', 'DESACTIVADO', '10000000-0000-4000-8000-000000000001');

-- Territorio: 2 recintos en provincia 1, 1 recinto en provincia 2
INSERT INTO public.recintos (id, provincia_id, canton, parroquia, nombre, lat, lon)
VALUES
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'C1', 'P1', 'RECINTO R1', -0.1, -78.1),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'C1', 'P1', 'RECINTO R2', -0.2, -78.2),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'C2', 'P2', 'RECINTO R3 OTRO', -0.3, -78.3);

INSERT INTO public.jrv (id, recinto_id, numero)
VALUES
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 1),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 2),
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', 1),
  ('50000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000003', 1);

-- Asignaciones vigentes
INSERT INTO public.coordinadores_recinto (id, recinto_id, coordinador_id, desde, hasta, motivo, asignado_por)
VALUES
  ('60000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', now(), NULL, 'test', '30000000-0000-4000-8000-000000000001'),
  ('60000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003', now(), NULL, 'test', '30000000-0000-4000-8000-000000000001');

INSERT INTO public.asignaciones_veedor (id, jrv_id, veedor_id, desde, hasta, motivo, asignado_por)
VALUES
  ('70000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', now(), NULL, 'test', '30000000-0000-4000-8000-000000000002'),
  ('70000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000005', now(), NULL, 'test', '30000000-0000-4000-8000-000000000003');

-- Catálogo mínimo para actas
INSERT INTO public.organizaciones (id, nombre, color)
VALUES
  ('80000000-0000-4000-8000-000000000001', 'ORG A', '#111111'),
  ('80000000-0000-4000-8000-000000000002', 'ORG B', '#222222'),
  ('80000000-0000-4000-8000-000000000003', 'ORG C', '#333333'),
  ('80000000-0000-4000-8000-000000000004', 'ORG D', '#444444'),
  ('80000000-0000-4000-8000-000000000005', 'ORG E', '#555555')
ON CONFLICT (nombre) DO NOTHING;

-- Acta en JRV 1 (recinto R1) - visible para veedor1/coordinador1/provincial1
INSERT INTO public.actas (id, jrv_id, dignidad, version, estado, captured_at, lat, lon, accuracy, distancia_recinto_m, calidad_foto, foto_path, sufragantes, blancos, nulos, capturado_por)
VALUES
  ('90000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'ALCALDIA', 1, 'RESULTADO_RECIBIDO', now(), -0.1, -78.1, 10, 5, 'NORMAL', '40000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000001/ALCALDIA/aaaaaaaa-0000-4000-8000-000000000001.jpg', 100, 5, 5, '30000000-0000-4000-8000-000000000004');

INSERT INTO public.votos_acta (acta_id, organizacion_id, votos)
SELECT '90000000-0000-4000-8000-000000000001', id, 18 FROM public.organizaciones WHERE id IN (
  '80000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000003','80000000-0000-4000-8000-000000000004','80000000-0000-4000-8000-000000000005'
);

-- Acta en JRV 3 (recinto R2) - fuera del ámbito de veedor1 y coordinador1
INSERT INTO public.actas (id, jrv_id, dignidad, version, estado, captured_at, lat, lon, accuracy, distancia_recinto_m, calidad_foto, foto_path, sufragantes, blancos, nulos, capturado_por)
VALUES
  ('90000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000003', 'ALCALDIA', 1, 'RESULTADO_RECIBIDO', now(), -0.2, -78.2, 10, 5, 'NORMAL', '40000000-0000-4000-8000-000000000002/50000000-0000-4000-8000-000000000003/ALCALDIA/aaaaaaaa-0000-4000-8000-000000000002.jpg', 100, 5, 5, '30000000-0000-4000-8000-000000000005');

INSERT INTO public.votos_acta (acta_id, organizacion_id, votos)
SELECT '90000000-0000-4000-8000-000000000002', id, 18 FROM public.organizaciones WHERE id IN (
  '80000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000003','80000000-0000-4000-8000-000000000004','80000000-0000-4000-8000-000000000005'
);

INSERT INTO public.revisiones_acta (id, acta_id, version, autor, motivo, valores_anteriores)
VALUES ('a0000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', 1, '30000000-0000-4000-8000-000000000002', 'test', '{"sufragantes":100}'::jsonb);

INSERT INTO public.operaciones_recibidas (id, operation_id, autor, tipo, payload_hash, resultado)
VALUES ('b0000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000099', '30000000-0000-4000-8000-000000000004', 'REGISTRAR_ACTA', 'hash-test', 'ACEPTADO');

-- ----------------------------------------------------------------------------
-- Pruebas negativas requeridas
-- ----------------------------------------------------------------------------

-- Helper para contar filas visibles como usuario autenticado
CREATE OR REPLACE FUNCTION public.f2b_count_como(p_auth_uid uuid, p_sql text)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE v bigint;
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

-- Veedor -> otra JRV (no debe ver acta de JRV 3)
SELECT public.f2b_afirmar('veedor no ve acta de otra JRV', public.f2b_count_como('20000000-0000-4000-8000-000000000004', $q$SELECT count(*) FROM public.actas WHERE id = '90000000-0000-4000-8000-000000000002'$q$) = 0);
SELECT public.f2b_afirmar('veedor sí ve su acta', public.f2b_count_como('20000000-0000-4000-8000-000000000004', $q$SELECT count(*) FROM public.actas WHERE id = '90000000-0000-4000-8000-000000000001'$q$) = 1);

-- Coordinador -> otro recinto (coord1 tiene R1, no debe ver acta de R2/JRV3)
SELECT public.f2b_afirmar('coordinador no ve acta de otro recinto', public.f2b_count_como('20000000-0000-4000-8000-000000000002', $q$SELECT count(*) FROM public.actas WHERE id = '90000000-0000-4000-8000-000000000002'$q$) = 0);
SELECT public.f2b_afirmar('coordinador ve acta de su recinto', public.f2b_count_como('20000000-0000-4000-8000-000000000002', $q$SELECT count(*) FROM public.actas WHERE id = '90000000-0000-4000-8000-000000000001'$q$) = 1);

-- Perfil creado por coord1 (R1) y aún sin asignación: debe ser visible para él
-- para poder asignarlo, pero no para coord2 (R2). ADR-04/ADR-05/RF-04.
UPDATE public.profiles
   SET creado_por = '30000000-0000-4000-8000-000000000002'
 WHERE id = '30000000-0000-4000-8000-000000000006';

SELECT public.f2b_afirmar(
  'coordinador ve veedor creado por él sin asignación',
  public.f2b_count_como('20000000-0000-4000-8000-000000000002', $q$SELECT count(*) FROM public.profiles WHERE id = '30000000-0000-4000-8000-000000000006'$q$) = 1
);
SELECT public.f2b_afirmar(
  'coordinador no ve veedor creado por otro coordinador',
  public.f2b_count_como('20000000-0000-4000-8000-000000000003', $q$SELECT count(*) FROM public.profiles WHERE id = '30000000-0000-4000-8000-000000000006'$q$) = 0
);

-- Auto-cambio de rol/estado/provincia
SELECT public.f2b_como_usuario(
  '20000000-0000-4000-8000-000000000004',
  $sql$UPDATE public.profiles SET rol = 'PROVINCIAL' WHERE id_auth = '20000000-0000-4000-8000-000000000004'$sql$,
  'ERROR'
);
SELECT public.f2b_como_usuario(
  '20000000-0000-4000-8000-000000000004',
  $sql$UPDATE public.profiles SET estado = 'DESACTIVADO' WHERE id_auth = '20000000-0000-4000-8000-000000000004'$sql$,
  'ERROR'
);
SELECT public.f2b_como_usuario(
  '20000000-0000-4000-8000-000000000004',
  $sql$UPDATE public.profiles SET provincia_id = '10000000-0000-4000-8000-000000000002' WHERE id_auth = '20000000-0000-4000-8000-000000000004'$sql$,
  'ERROR'
);

-- Perfil PENDIENTE sin acceso electoral
SELECT public.f2b_afirmar('perfil PENDIENTE no ve recintos', public.f2b_count_como('20000000-0000-4000-8000-000000000006', $q$SELECT count(*) FROM public.recintos$q$) = 0);
SELECT public.f2b_afirmar('perfil PENDIENTE no ve jrv', public.f2b_count_como('20000000-0000-4000-8000-000000000006', $q$SELECT count(*) FROM public.jrv$q$) = 0);
SELECT public.f2b_afirmar('perfil PENDIENTE no ve actas', public.f2b_count_como('20000000-0000-4000-8000-000000000006', $q$SELECT count(*) FROM public.actas$q$) = 0);
SELECT public.f2b_afirmar('perfil DESACTIVADO no ve actas', public.f2b_count_como('20000000-0000-4000-8000-000000000007', $q$SELECT count(*) FROM public.actas$q$) = 0);

-- JRV duplicada (restricción de integridad; debe fallar)
RESET ROLE;
DO $$
BEGIN
  INSERT INTO public.jrv (id, recinto_id, numero)
  VALUES ('50000000-0000-4000-8000-000000000099', '40000000-0000-4000-8000-000000000001', 1);
  RAISE EXCEPTION 'FALLA: JRV duplicada aceptada';
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'OK (rechazado): JRV duplicada => %', SQLERRM;
END;
$$;

-- Acta duplicada (misma jrv+dignidad; restricción de integridad)
RESET ROLE;
DO $$
BEGIN
  INSERT INTO public.actas (id, jrv_id, dignidad, version, estado, captured_at, lat, lon, accuracy, distancia_recinto_m, calidad_foto, sufragantes, blancos, nulos, capturado_por)
  VALUES ('90000000-0000-4000-8000-000000000099','50000000-0000-4000-8000-000000000001','ALCALDIA',1,'RESULTADO_RECIBIDO',now(),-0.1,-78.1,10,5,'NORMAL',100,5,5,'30000000-0000-4000-8000-000000000004');
  -- si pasa el insert, la cuadratura diferida fallará al commit; forzamos aquí
  SET CONSTRAINTS ALL IMMEDIATE;
  RAISE EXCEPTION 'FALLA: acta duplicada aceptada';
EXCEPTION WHEN unique_violation OR check_violation OR integrity_constraint_violation THEN
  RAISE NOTICE 'OK (rechazado): acta duplicada/rechazada => %', SQLERRM;
END;
$$;

-- revisiones/operaciones: usuarios ordinarios no pueden escribir
SELECT public.f2b_como_usuario(
  '20000000-0000-4000-8000-000000000004',
  $sql$INSERT INTO public.revisiones_acta (acta_id, version, autor, motivo, valores_anteriores) VALUES ('90000000-0000-4000-8000-000000000001',1,'30000000-0000-4000-8000-000000000004','x','{}'::jsonb)$sql$,
  'ERROR'
);
SELECT public.f2b_como_usuario(
  '20000000-0000-4000-8000-000000000004',
  $sql$INSERT INTO public.operaciones_recibidas (operation_id, autor, tipo, payload_hash, resultado) VALUES ('aaaaaaaa-0000-4000-8000-000000000088','30000000-0000-4000-8000-000000000004','REGISTRAR_ACTA','h','ACEPTADO')$sql$,
  'ERROR'
);
SELECT public.f2b_como_usuario(
  '20000000-0000-4000-8000-000000000004',
  $sql$INSERT INTO public.operaciones_rechazadas (operation_id, autor, motivo) VALUES ('aaaaaaaa-0000-4000-8000-000000000077','30000000-0000-4000-8000-000000000004','motivo')$sql$,
  'ERROR'
);
SELECT public.f2b_como_usuario(
  '20000000-0000-4000-8000-000000000004',
  $sql$UPDATE public.revisiones_acta SET motivo = 'hack' WHERE id = 'a0000000-0000-4000-8000-000000000001'$sql$,
  'ERROR'
);

-- Foto ajena: veedor1 intenta leer/insertar objeto de JRV3 (otro recinto)
-- Solo si existe schema storage (Supabase). Se prueba de forma condicional.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    -- Simular inserción de objeto ajeno por veedor1
    PERFORM set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000004', true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('role', 'authenticated', true);
    BEGIN
      INSERT INTO storage.objects (bucket_id, name, owner, metadata)
      VALUES ('actas', '40000000-0000-4000-8000-000000000002/50000000-0000-4000-8000-000000000003/ALCALDIA/aaaaaaaa-0000-4000-8000-0000000000aa.jpg', '20000000-0000-4000-8000-000000000004', '{}'::jsonb);
      PERFORM set_config('role', 'none', true);
      RESET ROLE;
      RAISE EXCEPTION 'FALLA: veedor pudo subir foto ajena';
    EXCEPTION
      WHEN insufficient_privilege OR raise_exception THEN
        PERFORM set_config('role', 'none', true);
        RESET ROLE;
        IF SQLERRM LIKE 'FALLA:%' THEN RAISE; END IF;
        RAISE NOTICE 'OK (rechazado): foto ajena no permitida => %', SQLERRM;
    END;

    -- Veedor1 sí puede subir a su JRV (ruta coherente)
    PERFORM set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000004', true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('role', 'authenticated', true);
    BEGIN
      INSERT INTO storage.objects (bucket_id, name, owner, metadata)
      VALUES ('actas', '40000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000001/ALCALDIA/aaaaaaaa-0000-4000-8000-0000000000bb.jpg', '20000000-0000-4000-8000-000000000004', '{}'::jsonb);
      PERFORM set_config('role', 'none', true);
      RESET ROLE;
      RAISE NOTICE 'OK (aceptado): veedor sube foto en su JRV';
    EXCEPTION WHEN OTHERS THEN
      PERFORM set_config('role', 'none', true);
      RESET ROLE;
      RAISE EXCEPTION 'FALLA: veedor no pudo subir foto propia: %', SQLERRM;
    END;

    -- Veedor1 no puede leer foto ajena ya insertada por service context
    RESET ROLE;
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES ('actas', '40000000-0000-4000-8000-000000000002/50000000-0000-4000-8000-000000000003/ALCALDIA/aaaaaaaa-0000-4000-8000-0000000000cc.jpg', NULL, '{}'::jsonb)
    ON CONFLICT DO NOTHING;

    PERFORM set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000004', true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('role', 'authenticated', true);
    PERFORM 1 FROM storage.objects WHERE bucket_id = 'actas' AND name = '40000000-0000-4000-8000-000000000002/50000000-0000-4000-8000-000000000003/ALCALDIA/aaaaaaaa-0000-4000-8000-0000000000cc.jpg';
    IF FOUND THEN
      PERFORM set_config('role', 'none', true);
      RESET ROLE;
      RAISE EXCEPTION 'FALLA: veedor pudo leer foto ajena';
    END IF;
    PERFORM set_config('role', 'none', true);
    RESET ROLE;
    RAISE NOTICE 'OK (rechazado por filtro RLS): veedor no ve foto ajena';
  ELSE
    RAISE NOTICE 'SKIP: schema storage no existe en este entorno; prueba de foto ajena omitida';
  END IF;
END;
$$;

ROLLBACK;