# DI-06: Cuenta provincial inicial y reemplazo por JRV

**Estado:** DECIDIDO
**Refina:** S-02, S-03, S-08, ADR-04, ADR-06

## Decisión
1. **Cuenta provincial inicial:** se crea fuera del APK (script/SQL o panel de Supabase) con rol `PROVINCIAL`, estado `ACTIVO` y ámbito = provincia elegida. Documentar el procedimiento en el README. Alta, OTP, recuperación y primera descarga de catálogo requieren conexión (S-02).
2. **Reemplazo (S-03):** el reemplazo afecta **una JRV**: se cierra la asignación vigente (`hasta = now()`), se inserta la nueva y se confirma en una transacción; las demás JRV del veedor no cambian. El historial conserva motivo y quién asignó.
3. **Veedor reemplazado offline (S-08):** al recibir operaciones pendientes, el servidor revalida la vigencia; si terminó, guarda el intento para revisión y **no altera** el acta remota. La operación local queda en estado `PERMISO_REVOCADO` (S-08), no se reintenta automáticamente y la app la muestra como «Permiso revocado — en revisión».

## Por qué no contradice la línea base
Implementa literalmente las propuestas de S-02, S-03 y S-08 y ADR-06.

## Consecuencias y pruebas
Veedor con 3 JRV: reemplazar una; intentar dos titulares vigentes (falla); reemplazado sincroniza → rechazado y conservado.
