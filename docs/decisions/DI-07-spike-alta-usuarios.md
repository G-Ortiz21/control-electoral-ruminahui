# DI-07: Resultado del spike de alta (Admin → OTP → cambio de clave → activación)

**Estado:** PENDIENTE (ejecutar spike en Fase 3 — hacerlo lo antes posible)
**Refina:** ADR-04, RF-01, RF-02

## Qué se debe probar
1. Edge Function (con service_role solo en el servidor) crea el usuario con Auth Admin y deja el perfil `PENDIENTE`.
2. El coordinador comunica la clave temporal al titular.
3. En el primer ingreso: verificación de correo por OTP → establecer clave nueva → el servidor activa (`ACTIVO`).
4. RLS deniega todo acceso electoral mientras el perfil esté `PENDIENTE`.
5. Recuperación de contraseña por correo, sin intervención del coordinador.
6. Entrega real de correos (Resend o SMTP de Supabase para pruebas).

## Errores parciales que también hay que probar (ADR-04 final)
- Usuario creado en Auth pero sin perfil (la Edge Function debe compensar o permitir reintento).
- OTP vencido o incorrecto.
- Correo no entregado (reenvío posible sin duplicar el usuario).


## Registro de resultados (completar)
| Intento | Qué se hizo | Resultado | Adaptación |
|---|---|---|---|
| 1 | Primer ingreso con el mecanismo original (app: `updateUser({ password })` → `activar-perfil` acreditando `user_metadata`/`updated_at`) | Falló el primer ingreso: «Edge Function returned a non-2xx status code». Motivo: `user_metadata` lo escribe el cliente (falsificable), `updated_at` cambia con cualquier actualización y el servidor no se enteraba del cambio de clave | Mecanismo interno nuevo (sin tocar ADR-04): Edge Function `cambiar-clave-inicial` cambia la clave con `service_role` y marca `app_metadata.clave_inicial_cambiada`; `activar-perfil` solo acredita esa marca. App: OTP → `invoke cambiar-clave-inicial` → `signInWithPassword` (refresca token con la marca) → `invoke activar-perfil`. Migración `20261128000000` aclara el trigger de `profiles` para service_role |

## Mecanismo interno de acreditación del cambio de clave (corrección, sin tocar ADR-04)

**Problema detectado en el primer ingreso:** `activar-perfil` se apoyaba en
`user_metadata` (lo escribe el propio usuario desde el cliente) o en
`updated_at > email_confirmed_at` (cambia con cualquier actualización). Ambos
son falsificables o poco fiables, y la app cambiaba la clave con
`supabase.auth.updateUser({ password })`, operación que el servidor no podía
acreditar → el primer ingreso fallaba («Edge Function returned a non-2xx status code»).

**Solución adoptada (solo mecanismo interno):**
1. Nueva Edge Function **`cambiar-clave-inicial`** (`supabase/functions/cambiar-clave-inicial/index.ts`):
   valida el JWT con `admin.auth.getUser(token)`, exige `email_confirmed_at` no nulo
   (OTP verificado) y perfil `PENDIENTE`, recibe `{ password }` (mínimo 8 caracteres)
   y ejecuta `admin.auth.admin.updateUserById(user.id, { password, app_metadata: { ...app_metadata, clave_inicial_cambiada: true } })`.
   Responde siempre JSON: 401/403/404/400/500 según el caso; 200 con `status: "CLAVE_CAMBIADA"`.
2. **`activar-perfil`**: la comprobación pasa a exigir
   `authUser.app_metadata?.clave_inicial_cambiada === true` (si no → 403 `clave_temporal_no_sustituida`).
   Se eliminan `user_metadata`, `emailConfirmedAt` y `updatedAt`. Se mantienen
   `email_confirmed_at`, estado `PENDIENTE` y la respuesta `YA_ACTIVO`.
3. **App** (`src/modules/auth/data/supabase-auth-repository.ts` y
   `CompletarPrimerIngreso`): el flujo pasa a
   OTP (`verifyOtp`) → `invoke("cambiar-clave-inicial", { body: { password } })` →
   `signInWithPassword` con la clave nueva (refresca el token y el `app_metadata`) →
   `invoke("activar-perfil")`. `AuthRepository.cambiarClaveInicial` (antes
   `establecerClave`) **no** usa `supabase.auth.updateUser`. Los errores
   `FunctionsHttpError` se leen con `error.context.status` y
   `await error.context.json()` y se traducen a mensajes en español junto al
   campo/`StatusBadge` (sin `Alert.alert`, sin registrar claves ni correos).
4. **Trigger de `profiles`**: migración nueva
   `20261128000000_fase_3a_trigger_profiles_service_role.sql` —
   `fn_proteger_profile_sensible` reconoce `service_role` por claim JWT o por
   rol de BD y permite el contexto interno sin usuario, sin abrir la puerta a
   `anon`/`authenticated` (RLS intacta). Evita `profile_update_failed` (500)
   en la activación.

**Por qué no contradice la línea base:** se conservan alta solo por jerarquía, correo
verificado por OTP, clave temporal sustituida en el primer acceso, activación validada
en servidor y sin secretos en el APK. `app_metadata` solo lo escribe `service_role`
(desde la Edge Function), por lo que el cliente ya no puede simular el cambio de clave.
La variación es únicamente **cómo se acredita** el cambio, y queda registrada aquí
antes de tocar el ADR-04 (que no se modifica).

## Decisión final (completar)
Flujo definitivo implementado: alta jerárquica (Edge Function `crear-usuario`) → `auth.signUp()` ejecutado **en el servidor con la clave anónima**, previa validación de rol/ámbito con `service_role`, pasando la clave temporal como `password` y `emailRedirectTo: 'controlelectoralruminahui://confirmar-correo'`. Supabase Auth envía la plantilla **Confirm signup** por el SMTP configurado (Resend) → deep link a `/(auth)/confirmar-correo` verifica `token_hash` y deja sesión → `primer-ingreso` (OTP solo si el correo no llegó verificado por enlace) → `cambiar-clave-inicial` → `signInWithPassword` → `activar-perfil`.

Se eligió `signUp` sobre `admin.createUser` (que no envía correo), `resend` (dependía de una solicitud de signup previa que no se generaba de forma fiable) e `inviteUserByEmail` (usa la plantilla «Invite user», no «Confirm signup»). No es autorregistro: la llama el servidor solo después de autorizar al creador. Si el proyecto tiene desactivada la confirmación de correo, `signUp` autoconfirma; la función detecta `email_confirmed_at`, compensa borrando la cuenta y exige activar la confirmación en el Dashboard. Cualquier fallo posterior al Alta compensa borrando la cuenta (el perfil se elimina por cascade). Nadie activa perfiles sin correo verificado y clave sustituida.

**Configuración manual indispensable:** añadir `controlelectoralruminahui://confirmar-correo` (o `controlelectoralruminahui://**`) en Authentication → URL Configuration → Redirect URLs, mantener **Confirm email** activado y usar la plantilla «Confirm signup» con `{{ .TokenHash }}` apuntando a ese esquema. Sin SMTP configurado en Supabase (Resend como transporte, según ADR-04) el correo no se entrega; verificar recepción real antes de declarar el spike terminado.

**Error original de `signUp()` y compensación:** el registro de `AUTH_SIGNUP` incluye `nombre_error`, `codigo_auth`, `status_auth`, `mensaje_sanitizado`, `mensaje_original_saneado` (solo si el texto fue clasificado; si no, se omite), `usuario_recibido`, `sesion_devuelta`, `identidades` y `motivo` (SMTP, rate limit, CAPTCHA, redirect, duplicidad o interno, solo si el código/texto original lo identifica). La compensación solo se ejecuta si se demuestra que la cuenta fue creada por esta operación (reciente, sin confirmar y con identidades); si no, se omite y se registra `compensacion_omitida`. Nunca se borra una cuenta preexistente devuelta de forma ofuscada por `signUp()`.

**Trazabilidad de fallos:** `crear-usuario` registra por etapa (`ENV_CONFIG`, `CLIENT_INIT`, `AUTH_TOKEN`, `CREATOR_PROFILE`, `SCOPE_CHECK`, `DUPLICATE_CHECK`, `AUTH_SIGNUP`, `AUTH_GET_USER`, `PROFILE_INSERT`, `COMPENSATION`, `UNEXPECTED`) con `console.error` de solo `etapa`, `codigo`, `status`, `compensated` y un mensaje fijo; nunca correo, cédula, teléfono, token, contraseña ni `user_id`. Las respuestas 500 incluyen `etapa` y `codigo` conservando el campo `error`.

**Detalles de implementación:** el Edge Function importa `@supabase/supabase-js@2.119.2` fijado (misma versión de `package.json`) para que `signUp`/`resend` coincidan con la documentación consultada. El reenvío posterior se ofrece desde `GestionUsuarios` con `auth.resend({ type: 'signup', emailRedirectTo })` (endpoint público de Auth, sin `service_role`, con rate-limiting de Supabase) solo para perfiles `PENDIENTE`; el flujo OTP existente (`signInWithOtp`) permanece intacto como alternativa.

## Por qué no contradice la línea base
Debe mantener: alta solo por jerarquía, correo verificado, clave temporal sustituida en el primer acceso, activación validada en servidor, sin secretos en el APK. Si una limitación real de Supabase obliga a variar el mecanismo, el ADR-04 final exige documentarlo y aprobarlo ANTES de modificar la ADR: ajustar solo el mecanismo interno y dejarlo escrito aquí.
