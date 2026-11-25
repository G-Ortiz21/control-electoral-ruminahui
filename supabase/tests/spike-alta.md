# Spike Fase 3A — Alta de usuarios (Admin → OTP → cambio de clave → activación)

Cubre: RF-01, RF-02, RNF-03 · ADR-04 · DI-07.
Sin UI: se ejecuta con correos reales contra un proyecto Supabase desplegado.

## Prerrequisitos
1. Migraciones `fase_2a`, `fase_2b`, `fase_2c` aplicadas y `seed.sql` ejecutado.
2. Cuenta PROVINCIAL creada por panel de Supabase (correo confirmado) + `bootstrap_provincial.sql` (DI-06).
3. Edge Functions desplegadas:
   ```bash
   supabase functions deploy crear-usuario
   supabase functions deploy cambiar-clave-inicial
   supabase functions deploy activar-perfil
   ```
   Variables de entorno en el proyecto: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   (se inyectan automáticamente por Supabase; verificar en Dashboard → Functions).
4. Resend configurado como SMTP dentro de Supabase Auth (DI-07) o SMTP por defecto.
5. Variables de shell (no commitear):
   ```bash
   export SUPABASE_URL="https://<project>.supabase.co"
   export SUPABASE_ANON_KEY="<anon key>"
   export SUPABASE_SERVICE_ROLE_KEY="<service role key>"  # solo para comprobaciones SQL, no para la app
   export PROV_EMAIL="provincial@ejemplo.ec"
   export PROV_PASSWORD="<clave provincial>"
   ```

## Variables auxiliares
```bash
export NEW_EMAIL="nuevo.coordinador@ejemplo.ec"
export NEW_CEDULA="1712345675"   # cédula ecuatoriana válida (módulo 10)
```

## Paso 1 — Crear usuario (Edge Function crear-usuario)
Autenticarse como PROVINCIAL y crear un COORDINADOR.

```bash
# 1.1 Login provincial (obtener access_token)
curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$PROV_EMAIL\",\"password\":\"$PROV_PASSWORD\"}" \
  | tee /tmp/login.json

export PROV_TOKEN=$(node -e "const fs=require('fs');console.log(JSON.parse(fs.readFileSync('/tmp/login.json')).access_token)")

# 1.2 Crear coordinador
curl -s -X POST "$SUPABASE_URL/functions/v1/crear-usuario" \
  -H "Authorization: Bearer $PROV_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"cedula\":\"$NEW_CEDULA\",\"nombres\":\"Juan\",\"apellidos\":\"Perez\",\"telefono\":\"0999999999\",\"email\":\"$NEW_EMAIL\"}" \
  | tee /tmp/creado.json

cat /tmp/creado.json
```
Esperado: HTTP 201, `estado: "PENDIENTE"`, `temp_password` presente. Anotar `temp_password`.

```bash
export TEMP_PASS=$(node -e "const fs=require('fs');console.log(JSON.parse(fs.readFileSync('/tmp/creado.json')).temp_password)")
```

## Paso 2 — Comprobar que en PENDIENTE no hay acceso electoral
Con el usuario recién creado aún no ha verificado correo; intentar leer `profiles`/`recintos` debe fallar o devolver vacío.

```bash
# Intento de login con clave temporal (puede fallar si "Confirm email" está activo; anotar)
curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$NEW_EMAIL\",\"password\":\"$TEMP_PASS\"}" | tee /tmp/login_new.json

# Si obtuvo token, probar lectura de recintos (debe ser vacía por RLS: rol_actual() NULL al estar PENDIENTE)
export NEW_TOKEN=$(node -e "try{const fs=require('fs');console.log(JSON.parse(fs.readFileSync('/tmp/login_new.json')).access_token)}catch(e){console.log('')}")
curl -s "$SUPABASE_URL/rest/v1/recintos?select=id" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEW_TOKEN"
# Esperado: [] (sin filas) o error 401/403.
```

Verificación SQL (service_role, solo diagnóstico):
```sql
select id, rol, estado from public.profiles where email = 'nuevo.coordinador@ejemplo.ec';
-- estado = PENDIENTE
```

## Paso 3 — Primer ingreso: OTP por correo
El titular solicita el código OTP (no crea usuario: `shouldCreateUser: false`).

```js
// spike-otp.mjs (Node, requiere @supabase/supabase-js)
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { data, error } = await sb.auth.signInWithOtp({ email: process.env.NEW_EMAIL, options: { shouldCreateUser: false } });
console.log('signInWithOtp:', { data, error });
```
Ejecutar: `node spike-otp.mjs`. Debe llegar un correo con el código OTP (6 dígitos). Anotar si llega y en cuánto tiempo (DI-07: entrega real de correos).

## Paso 4 — Confirmar OTP
```js
// spike-verify.mjs
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const token = process.argv[2]; // código OTP recibido por correo
const { data, error } = await sb.auth.verifyOtp({ email: process.env.NEW_EMAIL, token, type: 'email' });
console.log('verifyOtp:', { session: !!data.session, error });
if (data.session) {
  // guardar access_token para los pasos siguientes
  console.log('ACCESS_TOKEN=' + data.session.access_token);
}
```
Ejecutar: `node spike-verify.mjs 123456`.

## Paso 4b — Falsificación de `user_metadata` desde el cliente (DEBE fallar)
Antes de cambiar la clave de verdad, el titular intenta simular el cambio
escribiendo `user_metadata` desde el cliente (operación permitida por Auth a
cualquier usuario autenticado). Sirve para probar que `activar-perfil` ya NO
se apoya en esa metadata (DI-07).

```bash
# 4b.1 El cliente escribe user_metadata (falsificación del cambio de clave)
curl -s -X PUT "$SUPABASE_URL/auth/v1/user" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":{"password_changed":true,"requires_password_change":false}}' \
  | tee /tmp/falsificado.json

# 4b.2 Intenta activar el perfil con esa metadata falsificada
curl -s -o /tmp/act_falso.json -w "HTTP %{http_code}\n" \
  -X POST "$SUPABASE_URL/functions/v1/activar-perfil" \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{}"
cat /tmp/act_falso.json
```
Esperado: HTTP **403** `{"error":"clave_temporal_no_sustituida"}` — la
falsificación no sirve porque `activar-perfil` solo acepta la marca
`app_metadata.clave_inicial_cambiada`, que solo escribe `service_role`.

## Paso 5 — Establecer contraseña definitiva (Edge Function cambiar-clave-inicial)
El cambio lo hace el SERVIDOR (DI-07): NO se usa `supabase.auth.updateUser`, porque
`activar-perfil` acredita la marca `app_metadata.clave_inicial_cambiada` que solo
escribe `service_role`.

```bash
# Usar el access_token del paso 4
export NEW_ACCESS_TOKEN="<access_token del paso 4>"

curl -s -X POST "$SUPABASE_URL/functions/v1/cambiar-clave-inicial" \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password":"ClaveDefinitiva-2026!"}' | tee /tmp/clave.json
cat /tmp/clave.json
```
Esperado: HTTP 200, `{ "status": "CLAVE_CAMBIADA" }`.
Negativos: clave < 8 caracteres → 400 `password_invalida`;
sin OTP verificado → 403 `email_no_verificado`; sin token → 401.

## Paso 6 — Activar perfil (Edge Function activar-perfil)
```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/activar-perfil" \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{}" | tee /tmp/activado.json
cat /tmp/activado.json
```
Esperado: `{ "status": "ACTIVADO", "estado": "ACTIVO" }`.

## Paso 7 — Verificar activación y acceso electoral
```sql
select id, rol, estado from public.profiles where email = 'nuevo.coordinador@ejemplo.ec';
-- estado = ACTIVO
```
Probar lectura de `recintos` con el token del usuario ahora ACTIVO: debe devolver las filas de su ámbito (o vacío si aún no asignado a recinto, pero sin error de RLS).

## Casos negativos a probar (anotar resultado)
1. Provincial intenta crear VEEDOR directamente → esperado 403 `forbidden_role` (el rol se deriva del creador).
2. Coordinador intenta crear COORDINADOR → 403.
3. Cédula inválida → 400 `cedula_invalida`.
4. Email con formato inválido → 400 `email_invalido`.
5. Teléfono con letras → 400 `telefono_invalido`.
6. Activar perfil sin verificar correo → 403 `email_no_verificado`.
7. Activar perfil sin cambiar clave → 403 `clave_temporal_no_sustituida` (la marca `app_metadata.clave_inicial_cambiada` solo la pone `cambiar-clave-inicial`).
7b. `cambiar-clave-inicial` con clave < 8 caracteres → 400 `password_invalida`; sin OTP verificado → 403 `email_no_verificado`.
7c. Escribir `user_metadata.password_changed=true` desde el cliente (paso 4b) e invocar `activar-perfil` → 403 `clave_temporal_no_sustituida`: la falsificación no activa la cuenta.
7d. Tras el flujo completo (OTP → `cambiar-clave-inicial` → `activar-perfil`) → 200 `ACTIVADO`: la cuenta sí se activa con la marca del servidor.
8. Usuario PENDIENTE intenta leer `actas`/`recintos` → sin filas (RLS).
9. Compensación: forzar fallo de inserción de perfil (p. ej. cédula duplicada tras crear auth user) → el usuario de Auth debe ser eliminado.

## Entrega real de correos (DI-07)
Anotar: proveedor (Resend/SMTP), tiempo de entrega, si llegó a spam, si el dominio está verificado.
Sin dominio verificado, Resend suele enviar solo al propio correo: probar y anotar.

## Tabla de resultados (completar por intento)
| Intento | Qué se hizo | Resultado | Adaptación |
|---|---|---|---|
| 1 | crear-usuario (provincial → coordinador) |  |  |
| 2 | PENDIENTE sin acceso electoral |  |  |
| 3 | signInWithOtp + entrega de correo |  |  |
| 4 | verifyOtp |  |  |
| 4b | Falsificación: user_metadata desde cliente → activar-perfil | esperado 403 `clave_temporal_no_sustituida` | la metadata del cliente ya no acredita nada (DI-07) |
| 5 | cambiar-clave-inicial (nueva clave) |  |  |
| 6 | activar-perfil (tras flujo completo) | esperado 200 `ACTIVADO` |  |
| 7 | ACTIVO con acceso |  |  |
| 8 | Casos negativos |  |  |

## Decisión final (completar tras el spike)
Flujo definitivo implementado: ___

Estado de DI-07: PENDIENTE hasta confirmación final del responsable.