# DI-07: Resultado del spike de alta (Admin → OTP → cambio de clave → activación)

**Estado:** PENDIENTE (ejecutar spike en Fase 3 — hacerlo lo antes posible)
**Refina:** ADR-04, RF-01, RF-02

## Qué se debe probar
1. Edge Function (con service_role solo en el servidor) crea el usuario con Auth Admin y deja el perfil `PENDIENTE`.
2. El coordinador comunica la clave temporal al titular.
3. En el primer ingreso: verificación de correo por OTP → establecer clave nueva → el servidor activa (`ACTIVO`).
4. RLS deniega todo acceso electoral mientras el perfil esté `PENDIENTE`.
5. Recuperación de contraseña por correo, sin intervención del coordinador.
6. Entrega real de correos. **Ratificado:** Resend como proveedor SMTP configurado **dentro de Supabase Auth** (no lo sustituye, cumple `AGENTS.md`). Nota: sin dominio verificado, Resend suele permitir enviar solo a tu propio correo — probarlo en el spike y anotar el resultado.

## Registro de resultados (completar)
| Intento | Qué se hizo | Resultado | Adaptación |
|---|---|---|---|

## Decisión final (completar)
Flujo definitivo implementado: ___

## Por qué no contradice la línea base
Debe mantener: alta solo por jerarquía, correo verificado, clave temporal sustituida en el primer acceso, activación validada en servidor, sin secretos en el APK. Si el proveedor impide la secuencia exacta, ajustar solo el mecanismo interno y dejarlo escrito aquí.
