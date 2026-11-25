# ADR-04: Alta jerárquica con Supabase Auth, Edge Function y correo OTP

> **Estado de la línea base:** OBLIGATORIO (ratificado). El flujo creación → verificación OTP → cambio → activación debe ensayarse contra Auth real.
>
> **Margen del implementador (decisión propia):** Detalle de la Edge Function y pantallas. Debe resolver errores parciales (usuario Auth sin perfil, OTP vencido, correo no entregado). Si una limitación real de Supabase obliga a variar el mecanismo: documentarlo en DI-07 y aprobarlo ANTES de tocar el ADR. 
>
> Copia fiel del documento consolidado final. No editar el contenido bajo la línea `---`.

---

### Requerimientos relacionados

RF-01, RF-02, RF-04; RNF-03, RNF-06; S-02

### Contexto

La organización rechaza el autorregistro y requiere credenciales iniciales entregadas por un responsable, sin que este conserve acceso permanente a la cuenta. En V2-P2 se discutieron Supabase Auth, alta administrativa, correo OTP, cambio inicial de contraseña y Resend como opción de correo para pruebas. La integración debe comprobarse contra el flujo real de Auth.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| Supabase Auth Admin desde Edge Function protegida + OTP y nueva clave | Camila y Mateo (seed/copia); propuesta en la reunión V2-P1/V2-P2 | La función valida creador, rol y recinto sin exponer una clave privilegiada; permite alta asistida. | La secuencia de Auth Admin, verificación OTP y cambio obligatorio requiere prueba real y servicio de correo funcional. |
| Invitación por enlace de correo | Gelen y Mateo (comparación) | El titular elige contraseña sin que el creador la conozca. | Depende de apertura de enlaces y exige más pasos autónomos a usuarios con poca experiencia. |
| signUp público desde el móvil | Mateo (alternativa descartada) | Implementación inicial corta. | No controla el alta por jerarquía; puede modificar sesión del coordinador y contradice el enunciado. |

### Decisión

1) Una Edge Function autenticada comprueba rol, ámbito territorial, cédula válida y única, nombres, teléfono y correo. Solo el coordinador provincial crea coordinadores de recinto y solo el coordinador de recinto crea sus veedores. La función utiliza Auth Admin en el servidor, registra el perfil PENDIENTE y permite comunicar una clave temporal sin exponer credenciales privilegiadas en la app.

2) El titular inicia el primer acceso, verifica que controla su correo por el mecanismo OTP compatible con Supabase Auth y reemplaza la clave temporal. 3) El backend activa la cuenta únicamente cuando se acreditan correo verificado y cambio de clave, manteniendo RLS restringida mientras esté PENDIENTE. 4) El usuario recupera su contraseña mediante correo sin intervención del provincial.

La implementación debe ensayar el flujo completo de creación → verificación → cambio → activación y resolver errores parciales (usuario Auth sin perfil, OTP vencido o correo no entregado). Resend puede servir como transporte de correo en pruebas; no reemplaza Auth ni justifica habilitar signUp público. Si una limitación real de Supabase obliga a variar el mecanismo, esa variación deberá documentarse y aprobarse antes de modificar la ADR.

### Consecuencias

Se gana un alta jerárquica en la que cada titular define su propia clave y recupera su acceso sin intervención del coordinador provincial. Se pierde la sencillez de un registro directo, porque el proceso tiene varios pasos. Se asume el riesgo de cuentas creadas parcialmente, códigos OTP no entregados y activaciones prematuras. Durante el desarrollo, debe probarse el flujo completo de creación, verificación, cambio y activación, y el usuario pendiente no debe acceder a datos electorales.

### Minuto del video

Minuto de referencia del video final: 00:59:05
