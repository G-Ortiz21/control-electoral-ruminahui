-- ============================================================================
-- Fase 2A — Pruebas de esquema (RF-03, RF-04, RF-05, RNF-04)
-- Archivo: supabase/tests/fase_2a_esquema.sql
--
-- Cómo correr (necesita la migración aplicada):
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/fase_2a_esquema.sql
--   En local: supabase db reset (aplica migrations/) y luego el psql al puerto local.
--
-- Cómo funciona:
--   * Todo corre en UNA transacción terminada en ROLLBACK: no deja datos,
--     usuarios de prueba ni funciones (las funciones f2a_* se crean aquí y se
--     descartan con el ROLLBACK). Se puede repetir cuantas veces se quiera.
--   * `f2a_ejecutar(nombre, sentencias, 'ERROR'|'OK')` fuerza los triggers
--     diferidos con SET CONSTRAINTS: 'ERROR' exige que la sentencia sea
--     rechazada por una restricción; 'OK' exige que pase.
--   * `f2a_afirmar(nombre, condicion)` comprueba una condición de datos.
--   * Si una prueba falla se lanza un error que empieza por «FALLA:» y psql
--     termina con código distinto de cero (ON_ERROR_STOP=1).
--   * Limitación: un test 'ERROR' da por bueno cualquier violación de las
--     restricciones esperadas (unicidad, CHECK, FK, enum), no distingue cuál.
--
-- NOTA: el INSERT mínimo en auth.users es SOLO para pruebas locales. En
-- producción el alta de usuarios es desde el panel de Supabase / Edge Function
-- (DI-06): nunca se inserta en auth.users por SQL.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Helpers de prueba (se descartan con el ROLLBACK final)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f2a_ejecutar(p_nombre text, p_sentencias text[], p_esperado text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  s text;
BEGIN
  -- Construye con los triggers diferidos en pausa y los dispara al final, para
  -- poder armar un acta completa (acta + 5 votos) antes de validarla (ADR-07).
  SET CONSTRAINTS ALL DEFERRED;
  FOREACH s IN ARRAY p_sentencias LOOP
    EXECUTE s;
  END LOOP;
  SET CONSTRAINTS ALL IMMEDIATE;

  IF p_esperado = 'ERROR' THEN
    RAISE EXCEPTION 'FALLA: % — debía ser rechazada y fue aceptada', p_nombre;
  END IF;
  RAISE NOTICE 'OK (aceptado): %', p_nombre;
EXCEPTION
  WHEN check_violation OR unique_violation OR foreign_key_violation
    OR not_null_violation OR invalid_text_representation OR raise_exception THEN
    IF SQLERRM LIKE 'FALLA:%' THEN
      RAISE;  -- es el propio fallo del test: no lo enmascara
    END IF;
    IF p_esperado = 'OK' THEN
      RAISE EXCEPTION 'FALLA: % — debía ser aceptada: %', p_nombre, SQLERRM;
    END IF;
    RAISE NOTICE 'OK (rechazado): % => %', p_nombre, SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.f2a_afirmar(p_nombre text, p_ok boolean)
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
-- Datos base de prueba
-- ----------------------------------------------------------------------------
INSERT INTO public.provincias (codigo, nombre) VALUES ('PI', 'Pichincha');

INSERT INTO auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  (gen_random_uuid(), '00000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'f2a-prov@test.local',  'no-usar', now(), '{}', '{}', now(), now()),
  (gen_random_uuid(), '00000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated', 'f2a-coord@test.local', 'no-usar', now(), '{}', '{}', now(), now()),
  (gen_random_uuid(), '00000000-0000-4000-8000-0000000000f3', 'authenticated', 'authenticated', 'f2a-ve1@test.local',   'no-usar', now(), '{}', '{}', now(), now()),
  (gen_random_uuid(), '00000000-0000-4000-8000-0000000000f4', 'authenticated', 'authenticated', 'f2a-ve2@test.local',   'no-usar', now(), '{}', '{}', now(), now()),
  (gen_random_uuid(), '00000000-0000-4000-8000-0000000000f5', 'authenticated', 'authenticated', 'f2a-pend@test.local',  'no-usar', now(), '{}', '{}', now(), now()),
  (gen_random_uuid(), '00000000-0000-4000-8000-0000000000f6', 'authenticated', 'authenticated', 'f2a-dup@test.local',   'no-usar', now(), '{}', '{}', now(), now());

INSERT INTO public.profiles (id_auth, cedula, nombres, apellidos, telefono, email, rol, estado, provincia_id)
SELECT id, '1712345675', 'Prueba', 'Provincial', '0991110001', email, 'PROVINCIAL', 'ACTIVO',
       (SELECT id FROM public.provincias WHERE codigo = 'PI')
FROM auth.users WHERE email = 'f2a-prov@test.local';

INSERT INTO public.profiles (id_auth, cedula, nombres, apellidos, telefono, email, rol, estado)
SELECT id, '1712345683', 'Prueba', 'Coordinadora', '0991110002', email, 'COORDINADOR', 'ACTIVO'
FROM auth.users WHERE email = 'f2a-coord@test.local';

INSERT INTO public.profiles (id_auth, cedula, nombres, apellidos, telefono, email, rol, estado)
SELECT id, '1712345691', 'Prueba', 'Veedor Uno', '0991110003', email, 'VEEDOR', 'ACTIVO'
FROM auth.users WHERE email = 'f2a-ve1@test.local';

INSERT INTO public.profiles (id_auth, cedula, nombres, apellidos, telefono, email, rol, estado)
SELECT id, '1712345709', 'Prueba', 'Veedor Dos', '0991110004', email, 'VEEDOR', 'ACTIVO'
FROM auth.users WHERE email = 'f2a-ve2@test.local';

INSERT INTO public.profiles (id_auth, cedula, nombres, apellidos, telefono, email, rol, estado)
SELECT id, '1712345717', 'Prueba', 'Pendiente', '0991110005', email, 'VEEDOR', 'PENDIENTE'
FROM auth.users WHERE email = 'f2a-pend@test.local';

INSERT INTO public.recintos (provincia_id, canton, parroquia, nombre, lat, lon)
SELECT id, 'Ruminahui', 'Sangolqui', 'RECINTO TEST F2A 01', -0.1234, -78.4567
FROM public.provincias WHERE codigo = 'PI';

INSERT INTO public.recintos (provincia_id, canton, parroquia, nombre, lat, lon)
SELECT id, 'Ruminahui', 'Sangolqui', 'RECINTO TEST F2A 02', -0.1500, -78.4700
FROM public.provincias WHERE codigo = 'PI';

INSERT INTO public.jrv (recinto_id, numero)
SELECT r.id, n.num
FROM public.recintos r
CROSS JOIN (VALUES (1), (2)) AS n(num)
WHERE r.nombre = 'RECINTO TEST F2A 01';

INSERT INTO public.jrv (recinto_id, numero)
SELECT r.id, 1 FROM public.recintos r WHERE r.nombre = 'RECINTO TEST F2A 02';

INSERT INTO public.organizaciones (nombre, color) VALUES
  ('ORG TEST F2A A', '#1E3A8A'),
  ('ORG TEST F2A B', '#F59E0B'),
  ('ORG TEST F2A C', '#0EA5E9'),
  ('ORG TEST F2A D', '#15803D'),
  ('ORG TEST F2A E', '#B91C1C');

INSERT INTO public.candidatos (organizacion_id, dignidad, nombre)
SELECT o.id, d.dignidad::public.dignidad, 'Candidato ' || o.nombre || ' ' || d.dignidad
FROM public.organizaciones o
CROSS JOIN (VALUES ('ALCALDIA'), ('PREFECTURA')) AS d(dignidad)
WHERE o.nombre LIKE 'ORG TEST F2A%';

INSERT INTO public.coordinadores_recinto (recinto_id, coordinador_id, motivo, asignado_por)
SELECT r.id, p.id, 'Designacion inicial', a.id
FROM public.recintos r
JOIN public.profiles p ON p.cedula = '1712345683'
JOIN public.profiles a ON a.cedula = '1712345675'
WHERE r.nombre = 'RECINTO TEST F2A 01';

INSERT INTO public.asignaciones_veedor (jrv_id, veedor_id, motivo, asignado_por)
SELECT j.id, p.id, 'Designacion inicial', a.id
FROM public.jrv j
JOIN public.recintos r ON r.id = j.recinto_id AND r.nombre = 'RECINTO TEST F2A 01'
JOIN public.profiles p ON p.cedula = '1712345691'
JOIN public.profiles a ON a.cedula = '1712345675'
WHERE j.numero = 1;

-- Subconsultas reutilizadas en los tests (misma transacción: now() es constante)
-- J1  = JRV 1 del recinto 01   J2 = JRV 2 del recinto 01

-- ----------------------------------------------------------------------------
-- Cédula: paridad entre es_cedula_valida() y src/shared/domain/validador-cedula.ts
-- ----------------------------------------------------------------------------
SELECT public.f2a_afirmar('cédula válida aceptada por la función SQL',
  public.es_cedula_valida('1712345675'));
SELECT public.f2a_afirmar('verificador módulo 10 incorrecto rechazado',
  NOT public.es_cedula_valida('1712345670'));
SELECT public.f2a_afirmar('provincia 34 rechazada',
  NOT public.es_cedula_valida('3412345675'));
SELECT public.f2a_afirmar('serie de persona 6 rechazada',
  NOT public.es_cedula_valida('1762345675'));
SELECT public.f2a_afirmar('cédula de 9 dígitos rechazada',
  NOT public.es_cedula_valida('171234567'));

-- ----------------------------------------------------------------------------
-- RF-03 — territorio, JRV y coordinador vigente (ADR-02, ADR-06)
-- ----------------------------------------------------------------------------
SELECT public.f2a_ejecutar('T01 recinto duplicado (UNIQUE natural)', ARRAY[$$
  INSERT INTO public.recintos (provincia_id, canton, parroquia, nombre, lat, lon)
  SELECT id, 'Ruminahui', 'Sangolqui', 'RECINTO TEST F2A 01', -0.1234, -78.4567
  FROM public.provincias WHERE codigo = 'PI'
$$], 'ERROR');

SELECT public.f2a_ejecutar('T02 JRV duplicada (UNIQUE recinto, numero)', ARRAY[$$
  INSERT INTO public.jrv (recinto_id, numero)
  SELECT r.id, 1 FROM public.recintos r WHERE r.nombre = 'RECINTO TEST F2A 01'
$$], 'ERROR');

SELECT public.f2a_ejecutar('T03 JRV con numero 0 (CHECK)', ARRAY[$$
  INSERT INTO public.jrv (recinto_id, numero)
  SELECT r.id, 0 FROM public.recintos r WHERE r.nombre = 'RECINTO TEST F2A 02'
$$], 'ERROR');

SELECT public.f2a_ejecutar('T04 segundo coordinador vigente en el mismo recinto (UNIQUE parcial)', ARRAY[$$
  INSERT INTO public.coordinadores_recinto (recinto_id, coordinador_id, motivo, asignado_por)
  SELECT r.id, p.id, 'Segundo coordinador', a.id
  FROM public.recintos r
  JOIN public.profiles p ON p.cedula = '1712345709'
  JOIN public.profiles a ON a.cedula = '1712345675'
  WHERE r.nombre = 'RECINTO TEST F2A 01'
$$], 'ERROR');

SELECT public.f2a_ejecutar('T05 reemplazo de coordinador (cierra vigencia e inserta nueva)', ARRAY[$$
  UPDATE public.coordinadores_recinto ch
     SET hasta = now()
  FROM public.recintos r
  WHERE r.id = ch.recinto_id AND r.nombre = 'RECINTO TEST F2A 01' AND ch.hasta IS NULL
$$, $$
  INSERT INTO public.coordinadores_recinto (recinto_id, coordinador_id, motivo, asignado_por)
  SELECT r.id, p.id, 'Reemplazo coordinador', a.id
  FROM public.recintos r
  JOIN public.profiles p ON p.cedula = '1712345709'
  JOIN public.profiles a ON a.cedula = '1712345675'
  WHERE r.nombre = 'RECINTO TEST F2A 01'
$$], 'OK');

SELECT public.f2a_ejecutar('T06 vigencia con hasta anterior a desde (CHECK)', ARRAY[$$
  UPDATE public.coordinadores_recinto ch
     SET hasta = ch.desde - interval '1 hour'
  FROM public.recintos r
  WHERE r.id = ch.recinto_id AND r.nombre = 'RECINTO TEST F2A 01' AND ch.hasta IS NULL
$$], 'ERROR');

SELECT public.f2a_afirmar('T07 hay exactamente un coordinador vigente por recinto',
  (SELECT count(*) = 1 FROM public.coordinadores_recinto ch
    JOIN public.recintos r ON r.id = ch.recinto_id
   WHERE r.nombre = 'RECINTO TEST F2A 01' AND ch.hasta IS NULL));

-- ----------------------------------------------------------------------------
-- RF-04 — veedor vigente por JRV, varias JRV por persona, reemplazo (ADR-06, DI-06)
-- ----------------------------------------------------------------------------
SELECT public.f2a_ejecutar('T08 segundo veedor vigente en la misma JRV (UNIQUE parcial)', ARRAY[$$
  INSERT INTO public.asignaciones_veedor (jrv_id, veedor_id, motivo, asignado_por)
  SELECT j.id, p.id, 'Duplicado', a.id
  FROM public.jrv j
  JOIN public.recintos r ON r.id = j.recinto_id AND r.nombre = 'RECINTO TEST F2A 01'
  JOIN public.profiles p ON p.cedula = '1712345709'
  JOIN public.profiles a ON a.cedula = '1712345675'
  WHERE j.numero = 1
$$], 'ERROR');

SELECT public.f2a_ejecutar('T09 una misma persona cubre dos JRV', ARRAY[$$
  INSERT INTO public.asignaciones_veedor (jrv_id, veedor_id, motivo, asignado_por)
  SELECT j.id, p.id, 'Segunda mesa', a.id
  FROM public.jrv j
  JOIN public.recintos r ON r.id = j.recinto_id AND r.nombre = 'RECINTO TEST F2A 01'
  JOIN public.profiles p ON p.cedula = '1712345691'
  JOIN public.profiles a ON a.cedula = '1712345675'
  WHERE j.numero = 2
$$], 'OK');

SELECT public.f2a_ejecutar('T10 reemplazo del veedor en UNA JRV (cierra e inserta)', ARRAY[$$
  UPDATE public.asignaciones_veedor a
     SET hasta = now()
  FROM public.jrv j
  WHERE a.jrv_id = j.id
    AND j.recinto_id = (SELECT id FROM public.recintos WHERE nombre = 'RECINTO TEST F2A 01')
    AND j.numero = 1 AND a.hasta IS NULL
$$, $$
  INSERT INTO public.asignaciones_veedor (jrv_id, veedor_id, motivo, asignado_por)
  SELECT j.id, p.id, 'Reemplazo de ausente', a.id
  FROM public.jrv j
  JOIN public.recintos r ON r.id = j.recinto_id AND r.nombre = 'RECINTO TEST F2A 01'
  JOIN public.profiles p ON p.cedula = '1712345709'
  JOIN public.profiles a ON a.cedula = '1712345675'
  WHERE j.numero = 1
$$], 'OK');

SELECT public.f2a_afirmar('T11 el veedor reemplazado sigue vigente en sus demás JRV',
  (SELECT count(*) = 1 FROM public.asignaciones_veedor a
     JOIN public.profiles p ON p.id = a.veedor_id
    WHERE p.cedula = '1712345691' AND a.hasta IS NULL));

SELECT public.f2a_afirmar('T12 el veedor reemplazado ya no está vigente en la JRV reemplazada',
  (SELECT count(*) = 0 FROM public.asignaciones_veedor a
     JOIN public.profiles p ON p.id = a.veedor_id
     JOIN public.jrv j ON j.id = a.jrv_id
    WHERE p.cedula = '1712345691' AND j.numero = 1 AND a.hasta IS NULL));

SELECT public.f2a_afirmar('T13 el reemplazo conserva motivo y autor de ambas vigencias',
  (SELECT count(*) = 2 FROM public.asignaciones_veedor a
     JOIN public.jrv j ON j.id = a.jrv_id
    WHERE j.numero = 1
      AND a.motivo IS NOT NULL AND a.asignado_por IS NOT NULL));

-- ----------------------------------------------------------------------------
-- Perfiles: cédula, rol, estado y ámbito provincial (ADR-02, DI-06)
-- ----------------------------------------------------------------------------
SELECT public.f2a_ejecutar('T14 cédula duplicada (UNIQUE cedula)', ARRAY[$$
  INSERT INTO public.profiles (id_auth, cedula, nombres, apellidos, rol, estado)
  SELECT id, '1712345691', 'Dup', 'Cedula', 'VEEDOR', 'ACTIVO'
  FROM auth.users WHERE email = 'f2a-dup@test.local'
$$], 'ERROR');

SELECT public.f2a_ejecutar('T15 cédula con verificador incorrecto (CHECK módulo 10)', ARRAY[$$
  INSERT INTO public.profiles (id_auth, cedula, nombres, apellidos, rol, estado)
  SELECT id, '1712345670', 'Mala', 'Cedula', 'VEEDOR', 'ACTIVO'
  FROM auth.users WHERE email = 'f2a-dup@test.local'
$$], 'ERROR');

SELECT public.f2a_ejecutar('T16 cédula con formato inválido (CHECK)', ARRAY[$$
  INSERT INTO public.profiles (id_auth, cedula, nombres, apellidos, rol, estado)
  SELECT id, '123', 'Corta', 'Cedula', 'VEEDOR', 'ACTIVO'
  FROM auth.users WHERE email = 'f2a-dup@test.local'
$$], 'ERROR');

SELECT public.f2a_ejecutar('T17 rol PROVINCIAL sin provincia de ámbito (CHECK DI-06)', ARRAY[$$
  INSERT INTO public.profiles (id_auth, cedula, nombres, apellidos, rol, estado)
  SELECT id, '1712345725', 'Sin', 'Ambito', 'PROVINCIAL', 'ACTIVO'
  FROM auth.users WHERE email = 'f2a-dup@test.local'
$$], 'ERROR');

SELECT public.f2a_ejecutar('T18 rol fuera de enum (PROVINCIAL/COORDINADOR/VEEDOR)', ARRAY[$$
  INSERT INTO public.profiles (id_auth, cedula, nombres, apellidos, rol, estado)
  SELECT id, '1712345725', 'Rol', 'Invalido', 'ADMIN', 'ACTIVO'
  FROM auth.users WHERE email = 'f2a-dup@test.local'
$$], 'ERROR');

SELECT public.f2a_ejecutar('T19 estado de perfil fuera de enum (PENDIENTE/ACTIVO/DESACTIVADO)', ARRAY[$$
  INSERT INTO public.profiles (id_auth, cedula, nombres, apellidos, rol, estado)
  SELECT id, '1712345725', 'Estado', 'Invalido', 'VEEDOR', 'INACTIVO'
  FROM auth.users WHERE email = 'f2a-dup@test.local'
$$], 'ERROR');

SELECT public.f2a_ejecutar('T20 veedor sin provincia de ámbito es válido', ARRAY[$$
  INSERT INTO public.profiles (id_auth, cedula, nombres, apellidos, rol, estado)
  SELECT id, '1712345733', 'Veedor', 'Sin Provincia', 'VEEDOR', 'ACTIVO'
  FROM auth.users WHERE email = 'f2a-dup@test.local'
$$], 'OK');

-- ----------------------------------------------------------------------------
-- RF-05 — actas, votos y cuadratura completa (ADR-02, ADR-07)
-- ----------------------------------------------------------------------------
SELECT public.f2a_ejecutar('T21 acta PREFECTURA con 5 votos cuadrados (5*17+10+5=100)', ARRAY[$$
  INSERT INTO public.actas (jrv_id, dignidad, captured_at, lat, lon, accuracy,
                            distancia_recinto_m, capturado_por, sufragantes, blancos, nulos)
  VALUES (
    (SELECT j.id FROM public.jrv j
      JOIN public.recintos r ON r.id = j.recinto_id
     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 1),
    'PREFECTURA', now(), -0.1234, -78.4567, 8.5, 25,
    (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
    100, 10, 5)
$$, $$
  INSERT INTO public.votos_acta (acta_id, organizacion_id, votos)
  SELECT a.id, o.id, 17
  FROM public.actas a, public.organizaciones o
  WHERE a.jrv_id = (SELECT j.id FROM public.jrv j
                     JOIN public.recintos r ON r.id = j.recinto_id
                    WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 1)
    AND a.dignidad = 'PREFECTURA'
    AND o.nombre LIKE 'ORG TEST F2A%'
$$], 'OK');

SELECT public.f2a_afirmar('T22 el estado por defecto del acta remoto es RESULTADO_RECIBIDO',
  (SELECT estado = 'RESULTADO_RECIBIDO' FROM public.actas a
    WHERE a.dignidad = 'PREFECTURA'
      AND a.jrv_id = (SELECT j.id FROM public.jrv j
                       JOIN public.recintos r ON r.id = j.recinto_id
                      WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 1)));

SELECT public.f2a_ejecutar('T23 acta duplicada (UNIQUE jrv, dignidad)', ARRAY[$$
  INSERT INTO public.actas (jrv_id, dignidad, captured_at, lat, lon, accuracy,
                            distancia_recinto_m, capturado_por, sufragantes, blancos, nulos)
  VALUES (
    (SELECT j.id FROM public.jrv j
      JOIN public.recintos r ON r.id = j.recinto_id
     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 1),
    'PREFECTURA', now(), -0.1234, -78.4567, 8.5, 25,
    (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
    100, 10, 5)
$$], 'ERROR');

-- J1 / ALCALDIA: los tres intentos fallidos se descartan y luego el correcto.
SELECT public.f2a_ejecutar('T24 acta con solo 4 votos (cuadratura exige 5 organizaciones)', ARRAY[$$
  INSERT INTO public.actas (jrv_id, dignidad, captured_at, lat, lon, accuracy,
                            distancia_recinto_m, capturado_por, sufragantes, blancos, nulos)
  VALUES (
    (SELECT j.id FROM public.jrv j
      JOIN public.recintos r ON r.id = j.recinto_id
     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 1),
    'ALCALDIA', now(), -0.1234, -78.4567, 8.5, 25,
    (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
    100, 10, 5)
$$, $$
  INSERT INTO public.votos_acta (acta_id, organizacion_id, votos)
  SELECT a.id, o.id, 17
  FROM public.actas a, public.organizaciones o
  WHERE a.dignidad = 'ALCALDIA'
    AND a.jrv_id = (SELECT j.id FROM public.jrv j
                     JOIN public.recintos r ON r.id = j.recinto_id
                    WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 1)
    AND o.nombre LIKE 'ORG TEST F2A%'
  LIMIT 4
$$], 'ERROR');

SELECT public.f2a_ejecutar('T25 acta sin filas de votos (cuadratura sobre el acta completa)', ARRAY[$$
  INSERT INTO public.actas (jrv_id, dignidad, captured_at, lat, lon, accuracy,
                            distancia_recinto_m, capturado_por, sufragantes, blancos, nulos)
  VALUES (
    (SELECT j.id FROM public.jrv j
      JOIN public.recintos r ON r.id = j.recinto_id
     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 1),
    'ALCALDIA', now(), -0.1234, -78.4567, 8.5, 25,
    (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
    100, 10, 5)
$$], 'ERROR');

SELECT public.f2a_ejecutar('T26 acta con suma incorrecta (50 votos + 10 + 5 <> 100)', ARRAY[$$
  INSERT INTO public.actas (jrv_id, dignidad, captured_at, lat, lon, accuracy,
                            distancia_recinto_m, capturado_por, sufragantes, blancos, nulos)
  VALUES (
    (SELECT j.id FROM public.jrv j
      JOIN public.recintos r ON r.id = j.recinto_id
     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 1),
    'ALCALDIA', now(), -0.1234, -78.4567, 8.5, 25,
    (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
    100, 10, 5)
$$, $$
  INSERT INTO public.votos_acta (acta_id, organizacion_id, votos)
  SELECT a.id, o.id, 10
  FROM public.actas a, public.organizaciones o
  WHERE a.dignidad = 'ALCALDIA'
    AND a.jrv_id = (SELECT j.id FROM public.jrv j
                     JOIN public.recintos r ON r.id = j.recinto_id
                    WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 1)
    AND o.nombre LIKE 'ORG TEST F2A%'
$$], 'ERROR');

SELECT public.f2a_ejecutar('T27 acta ALCALDIA con 5 votos cuadrados (base de las siguientes pruebas)', ARRAY[$$
  INSERT INTO public.actas (jrv_id, dignidad, captured_at, lat, lon, accuracy,
                            distancia_recinto_m, capturado_por, sufragantes, blancos, nulos)
  VALUES (
    (SELECT j.id FROM public.jrv j
      JOIN public.recintos r ON r.id = j.recinto_id
     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 1),
    'ALCALDIA', now(), -0.1234, -78.4567, 8.5, 25,
    (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
    100, 10, 5)
$$, $$
  INSERT INTO public.votos_acta (acta_id, organizacion_id, votos)
  SELECT a.id, o.id, 17
  FROM public.actas a, public.organizaciones o
  WHERE a.dignidad = 'ALCALDIA'
    AND a.jrv_id = (SELECT j.id FROM public.jrv j
                     JOIN public.recintos r ON r.id = j.recinto_id
                    WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 1)
    AND o.nombre LIKE 'ORG TEST F2A%'
$$], 'OK');

SELECT public.f2a_ejecutar('T28 voto negativo (CHECK votos >= 0)', ARRAY[$$
  UPDATE public.votos_acta v SET votos = -5
  WHERE v.acta_id = (SELECT a.id FROM public.actas a
                      JOIN public.jrv j ON j.id = a.jrv_id
                      JOIN public.recintos r ON r.id = j.recinto_id
                     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 1
                       AND a.dignidad = 'ALCALDIA')
$$], 'ERROR');

SELECT public.f2a_ejecutar('T29 segunda fila de votos para la misma organización (UNIQUE)', ARRAY[$$
  INSERT INTO public.votos_acta (acta_id, organizacion_id, votos)
  SELECT a.id, o.id, 1
  FROM public.actas a, public.organizaciones o
  WHERE a.dignidad = 'ALCALDIA'
    AND a.jrv_id = (SELECT j.id FROM public.jrv j
                     JOIN public.recintos r ON r.id = j.recinto_id
                    WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 1)
    AND o.nombre = 'ORG TEST F2A A'
$$], 'ERROR');

SELECT public.f2a_ejecutar('T30 borrar un voto deja el acta con 4 organizaciones (cuadratura)', ARRAY[$$
  DELETE FROM public.votos_acta v
  WHERE v.acta_id = (SELECT a.id FROM public.actas a
                      JOIN public.jrv j ON j.id = a.jrv_id
                      JOIN public.recintos r ON r.id = j.recinto_id
                     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 1
                       AND a.dignidad = 'ALCALDIA')
    AND v.organizacion_id = (SELECT id FROM public.organizaciones WHERE nombre = 'ORG TEST F2A A')
$$], 'ERROR');

SELECT public.f2a_ejecutar('T31 subir un voto sin subir sufragantes descuadra el acta', ARRAY[$$
  UPDATE public.votos_acta v SET votos = votos + 10
  WHERE v.acta_id = (SELECT a.id FROM public.actas a
                      JOIN public.jrv j ON j.id = a.jrv_id
                      JOIN public.recintos r ON r.id = j.recinto_id
                     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 1
                       AND a.dignidad = 'ALCALDIA')
    AND v.organizacion_id = (SELECT id FROM public.organizaciones WHERE nombre = 'ORG TEST F2A A')
$$], 'ERROR');

SELECT public.f2a_ejecutar('T32 corrección coherente: subir voto y sufragantes en la misma transacción', ARRAY[$$
  UPDATE public.votos_acta v SET votos = votos + 10
  WHERE v.acta_id = (SELECT a.id FROM public.actas a
                      JOIN public.jrv j ON j.id = a.jrv_id
                      JOIN public.recintos r ON r.id = j.recinto_id
                     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 1
                       AND a.dignidad = 'ALCALDIA')
    AND v.organizacion_id = (SELECT id FROM public.organizaciones WHERE nombre = 'ORG TEST F2A A')
$$, $$
  UPDATE public.actas a SET sufragantes = sufragantes + 10
  WHERE a.dignidad = 'ALCALDIA'
    AND a.jrv_id = (SELECT j.id FROM public.jrv j
                     JOIN public.recintos r ON r.id = j.recinto_id
                    WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 1)
$$], 'OK');

-- J2 (sin actas): chequeos por fila del acta, enums y campos obligatorios.
SELECT public.f2a_ejecutar('T33 acta sin captured_at (NOT NULL)', ARRAY[$$
  INSERT INTO public.actas (jrv_id, dignidad, lat, lon, accuracy, distancia_recinto_m,
                            capturado_por, sufragantes, blancos, nulos)
  VALUES (
    (SELECT j.id FROM public.jrv j
      JOIN public.recintos r ON r.id = j.recinto_id
     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 2),
    'ALCALDIA', -0.1234, -78.4567, 8.5, 25,
    (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
    100, 10, 5)
$$], 'ERROR');

SELECT public.f2a_ejecutar('T34 sufragantes negativos (CHECK)', ARRAY[$$
  INSERT INTO public.actas (jrv_id, dignidad, captured_at, lat, lon, accuracy,
                            distancia_recinto_m, capturado_por, sufragantes, blancos, nulos)
  VALUES (
    (SELECT j.id FROM public.jrv j
      JOIN public.recintos r ON r.id = j.recinto_id
     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 2),
    'ALCALDIA', now(), -0.1234, -78.4567, 8.5, 25,
    (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
    -100, 10, 5)
$$], 'ERROR');

SELECT public.f2a_ejecutar('T35 blancos + nulos mayores que sufragantes (CHECK por fila)', ARRAY[$$
  INSERT INTO public.actas (jrv_id, dignidad, captured_at, lat, lon, accuracy,
                            distancia_recinto_m, capturado_por, sufragantes, blancos, nulos)
  VALUES (
    (SELECT j.id FROM public.jrv j
      JOIN public.recintos r ON r.id = j.recinto_id
     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 2),
    'ALCALDIA', now(), -0.1234, -78.4567, 8.5, 25,
    (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
    100, 80, 30)
$$], 'ERROR');

SELECT public.f2a_ejecutar('T36 latitud fuera de rango (CHECK)', ARRAY[$$
  INSERT INTO public.actas (jrv_id, dignidad, captured_at, lat, lon, accuracy,
                            distancia_recinto_m, capturado_por, sufragantes, blancos, nulos)
  VALUES (
    (SELECT j.id FROM public.jrv j
      JOIN public.recintos r ON r.id = j.recinto_id
     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 2),
    'ALCALDIA', now(), 123.0, -78.4567, 8.5, 25,
    (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
    100, 10, 5)
$$], 'ERROR');

SELECT public.f2a_ejecutar('T37 accuracy negativa (CHECK)', ARRAY[$$
  INSERT INTO public.actas (jrv_id, dignidad, captured_at, lat, lon, accuracy,
                            distancia_recinto_m, capturado_por, sufragantes, blancos, nulos)
  VALUES (
    (SELECT j.id FROM public.jrv j
      JOIN public.recintos r ON r.id = j.recinto_id
     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 2),
    'ALCALDIA', now(), -0.1234, -78.4567, -1, 25,
    (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
    100, 10, 5)
$$], 'ERROR');

SELECT public.f2a_ejecutar('T38 versión 0 (CHECK version >= 1)', ARRAY[$$
  INSERT INTO public.actas (jrv_id, dignidad, version, captured_at, lat, lon, accuracy,
                            distancia_recinto_m, capturado_por, sufragantes, blancos, nulos)
  VALUES (
    (SELECT j.id FROM public.jrv j
      JOIN public.recintos r ON r.id = j.recinto_id
     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 2),
    'ALCALDIA', 0, now(), -0.1234, -78.4567, 8.5, 25,
    (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
    100, 10, 5)
$$], 'ERROR');

SELECT public.f2a_ejecutar('T39 estado de acta fuera de enum (ux.md)', ARRAY[$$
  INSERT INTO public.actas (jrv_id, dignidad, estado, captured_at, lat, lon, accuracy,
                            distancia_recinto_m, capturado_por, sufragantes, blancos, nulos)
  VALUES (
    (SELECT j.id FROM public.jrv j
      JOIN public.recintos r ON r.id = j.recinto_id
     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 2),
    'ALCALDIA', 'VUELO', now(), -0.1234, -78.4567, 8.5, 25,
    (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
    100, 10, 5)
$$], 'ERROR');

SELECT public.f2a_ejecutar('T40 calidad de foto fuera de enum (NORMAL/CALIDAD_DUDOSA)', ARRAY[$$
  INSERT INTO public.actas (jrv_id, dignidad, calidad_foto, captured_at, lat, lon, accuracy,
                            distancia_recinto_m, capturado_por, sufragantes, blancos, nulos)
  VALUES (
    (SELECT j.id FROM public.jrv j
      JOIN public.recintos r ON r.id = j.recinto_id
     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 2),
    'ALCALDIA', 'MALA', now(), -0.1234, -78.4567, 8.5, 25,
    (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
    100, 10, 5)
$$], 'ERROR');

SELECT public.f2a_ejecutar('T41 dignidad fuera de enum (ALCALDIA/PREFECTURA)', ARRAY[$$
  INSERT INTO public.actas (jrv_id, dignidad, captured_at, lat, lon, accuracy,
                            distancia_recinto_m, capturado_por, sufragantes, blancos, nulos)
  VALUES (
    (SELECT j.id FROM public.jrv j
      JOIN public.recintos r ON r.id = j.recinto_id
     WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 2),
    'PRESIDENTE', now(), -0.1234, -78.4567, 8.5, 25,
    (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
    100, 10, 5)
$$], 'ERROR');

-- ----------------------------------------------------------------------------
-- ADR-08 — idempotencia de operaciones recibidas
-- ----------------------------------------------------------------------------
SELECT public.f2a_ejecutar('T42 registrar una operación recibida (OK)', ARRAY[$$
  INSERT INTO public.operaciones_recibidas (operation_id, autor, tipo, payload_hash, resultado)
  VALUES ('11111111-1111-4111-8111-111111111111',
          (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
          'REGISTRAR_ACTA', 'hash-de-prueba-01', 'ACEPTADO')
$$], 'OK');

SELECT public.f2a_ejecutar('T43 operation_id repetido (UNIQUE = idempotencia)', ARRAY[$$
  INSERT INTO public.operaciones_recibidas (operation_id, autor, tipo, payload_hash, resultado)
  VALUES ('11111111-1111-4111-8111-111111111111',
          (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
          'REGISTRAR_ACTA', 'hash-distinto-02', 'ACEPTADO')
$$], 'ERROR');

SELECT public.f2a_ejecutar('T44 payload_hash vacío (CHECK)', ARRAY[$$
  INSERT INTO public.operaciones_recibidas (operation_id, autor, tipo, payload_hash, resultado)
  VALUES ('22222222-2222-4222-8222-222222222222',
          (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
          'REGISTRAR_ACTA', '   ', 'ACEPTADO')
$$], 'ERROR');

SELECT public.f2a_ejecutar('T45 resultado fuera de catálogo (CHECK)', ARRAY[$$
  INSERT INTO public.operaciones_recibidas (operation_id, autor, tipo, payload_hash, resultado)
  VALUES ('33333333-3333-4333-8333-333333333333',
          (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
          'REGISTRAR_ACTA', 'hash-de-prueba-03', 'APROBADO')
$$], 'ERROR');

SELECT public.f2a_ejecutar('T46 tipo de operación fuera de catálogo (CHECK)', ARRAY[$$
  INSERT INTO public.operaciones_recibidas (operation_id, autor, tipo, payload_hash, resultado)
  VALUES ('44444444-4444-4444-8444-444444444444',
          (SELECT id FROM public.profiles WHERE cedula = '1712345691'),
          'BORRAR_TODO', 'hash-de-prueba-04', 'ACEPTADO')
$$], 'ERROR');

-- ----------------------------------------------------------------------------
-- ADR-03 / DI-01 — catálogo versionado; RF-08 — revisiones
-- ----------------------------------------------------------------------------
SELECT public.f2a_ejecutar('T47 insertar versión de catálogo (OK)', ARRAY[$$
  INSERT INTO public.catalogo_version (version, fuente) VALUES (999, 'Prueba F2A')
$$], 'OK');

SELECT public.f2a_ejecutar('T48 versión de catálogo duplicada (PRIMARY KEY)', ARRAY[$$
  INSERT INTO public.catalogo_version (version, fuente) VALUES (999, 'Prueba F2A repetida')
$$], 'ERROR');

SELECT public.f2a_ejecutar('T49 insertar una revisión del acta (append-only, OK)', ARRAY[$$
  INSERT INTO public.revisiones_acta (acta_id, version, autor, motivo, valores_anteriores)
  SELECT a.id, a.version,
         (SELECT id FROM public.profiles WHERE cedula = '1712345683'),
         'Correccion de prueba',
         jsonb_build_object('sufragantes', a.sufragantes, 'blancos', a.blancos, 'nulos', a.nulos)
  FROM public.actas a
  WHERE a.dignidad = 'PREFECTURA'
    AND a.jrv_id = (SELECT j.id FROM public.jrv j
                     JOIN public.recintos r ON r.id = j.recinto_id
                    WHERE r.nombre = 'RECINTO TEST F2A 01' AND j.numero = 1)
$$], 'OK');

-- ----------------------------------------------------------------------------
-- Afirmaciones globales
-- ----------------------------------------------------------------------------
SELECT public.f2a_afirmar('T50 toda acta remota tiene votos de exactamente 5 organizaciones',
  (SELECT count(*) = 0 FROM public.actas a
    WHERE (SELECT count(*) FROM public.votos_acta v WHERE v.acta_id = a.id) <> 5));

SELECT public.f2a_afirmar('T51 toda acta remota cuadra: votos + blancos + nulos = sufragantes',
  (SELECT bool_and(
            (SELECT COALESCE(SUM(v.votos), 0) FROM public.votos_acta v WHERE v.acta_id = a.id)
            + a.blancos + a.nulos = a.sufragantes)
     FROM public.actas a));

SELECT public.f2a_afirmar('T52 existen los 8 estados de acta de docs/ux.md',
  (SELECT count(*) = 8 FROM pg_enum e
     JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'estado_acta'));

SELECT public.f2a_afirmar('T53 existen los 3 roles (PROVINCIAL/COORDINADOR/VEEDOR)',
  (SELECT count(*) = 3 FROM pg_enum e
     JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'rol_usuario'));

SELECT public.f2a_afirmar('T54 existe el índice único parcial de veedor vigente por JRV',
  (SELECT count(*) = 1 FROM pg_indexes
    WHERE indexname = 'uq_veedor_vigente_jrv'));

SELECT public.f2a_afirmar('T55 existe el índice único parcial de coordinador vigente por recinto',
  (SELECT count(*) = 1 FROM pg_indexes
    WHERE indexname = 'uq_coordinador_vigente_recinto'));

SELECT public.f2a_afirmar('T56 no hay RLS en esta fase (se habilita en la fase 2B)',
  (SELECT count(*) = 0 FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity));

-- fn_marcar_actualizado: si el trigger no existiera, el valor volvería a quedar
-- en now() - 1 día y la afirmación fallaría.
UPDATE public.recintos
   SET actualizado_en = now() - interval '1 day'
 WHERE nombre = 'RECINTO TEST F2A 02';

SELECT public.f2a_afirmar('T57 el trigger fn_marcar_actualizado renueva actualizado_en en UPDATE',
  (SELECT actualizado_en > now() - interval '1 minute'
     FROM public.recintos WHERE nombre = 'RECINTO TEST F2A 02'));

-- ----------------------------------------------------------------------------
-- Nada de esto queda aplicado: todo se descarta.
-- ----------------------------------------------------------------------------
ROLLBACK;

SELECT 'FASE 2A: TODAS LAS PRUEBAS PASARON' AS resultado;
