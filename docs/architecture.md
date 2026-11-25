# Arquitectura (Clean Architecture por módulos — ADR-01, RNF-02)

## Estructura de carpetas

```
src/
├─ app/                          # Expo Router: SOLO rutas finas que llaman a presentation
│  ├─ _layout.tsx                # carga sesión, redirige por rol/estado
│  ├─ (auth)/                    # login, primer-ingreso (OTP + nueva clave), recuperar
│  ├─ (provincial)/              # recintos, personal, seguimiento
│  ├─ (coordinador)/             # mesas, asignación/reemplazo, actas del recinto
│  └─ (veedor)/                  # mis mesas, registrar/corregir acta, estado de envíos
├─ modules/
│  ├─ auth/            { domain, data, presentation }
│  ├─ territorio/      { domain, data, presentation }   # recintos, JRV, asignaciones
│  ├─ actas/           { domain, data, presentation }   # acta, votos, foto, GPS, correcciones
│  ├─ sync/            { domain, data, presentation }   # outbox, reintentos, conectividad
│  └─ seguimiento/     { domain, data, presentation }   # agregados, avance, realtime
├─ shared/
│  ├─ domain/          # Result, errores, validador de cédula, tipos comunes (sin dependencias)
│  ├─ infrastructure/  # cliente Supabase, apertura SQLite, Sentry, NetInfo, FileSystem
│  └─ ui/              # tema Uniwind, componentes (botones, campos, StatusBadge, LottieFeedback)
└─ composition/        # contenedor: crea adaptadores y los inyecta en casos de uso

supabase/
├─ migrations/         # esquema, restricciones, RLS, funciones/RPC
├─ functions/          # Edge Functions (alta de usuarios)
├─ seed.sql            # catálogo electoral idempotente (INSERT … ON CONFLICT)
└─ tests/              # pruebas negativas de RLS
```

## Regla de dependencias
```
presentation ──► domain ◄── data
      │                       │
      └───► composition ◄─────┘          shared/domain no depende de nada
```
- `domain/` contiene: entidades, **casos de uso**, **puertos** (interfaces de repositorio/servicios) y reglas puras (p. ej. `validarCuadratura`).
- `data/` implementa los puertos con Supabase, SQLite, expo-camera, etc. Convierte entre modelos externos y entidades.
- `presentation/` contiene pantallas, hooks y stores Zustand. Llama casos de uso a través de `composition/`.
- **Prohibido** en `domain/`: importar `react`, `react-native`, `expo-*`, `@supabase/*`, `zustand`.
- Zustand guarda estado de **presentación** (sesión, rol, conectividad, estado visible de operaciones). La fuente persistente de actas y pendientes es **SQLite**.

## Flujo de escritura de un acta (resumen de ADR-07/08)
1. Formulario (RHF + Zod) → caso de uso `RegistrarActa` → regla pura de cuadratura.
2. Foto en almacenamiento privado de la app + fila de acta + fila de outbox, **en una transacción SQLite**.
3. Solo entonces la UI dice «guardado localmente».
4. El motor de sync envía la operación (idempotente por `operation_id`), luego sube la foto; estados: `GUARDADA_LOCAL → SINCRONIZANDO → RESULTADO_RECIBIDO → EVIDENCIA_PENDIENTE → EVIDENCIA_RESPALDADA` (o `EN_REVISION` si la foto es dudosa, `ERROR`, `CONFLICTO_VERSION` o `PERMISO_REVOCADO`; estos dos últimos detienen los reintentos automáticos y conservan la operación local para revisión).
5. Al abrir la app se reconcilian archivos sin fila y filas sin archivo (ADR-08: no hay atomicidad entre sistema de archivos y SQLite).

## Visor de ubicación (ADR-09, DI-04)
Leaflet dentro de `react-native-webview`, EMPAQUETADO localmente (sin CDN). Muestra marcador de captura y de recinto aunque no haya red; solo el mapa base de calles necesita red o teselas en caché. Prohibido abrir mapas externos. Componente único `src/shared/ui/visor-ubicacion.tsx` reutilizado por veedor, coordinador y provincial.


## Pruebas mínimas
- Dominio sin Expo: cuadratura, cédula, estados, reglas de reemplazo.
- Backend: duplicados de acta/JRV, RLS negativa (veedor→otra JRV, coordinador→otro recinto, cambio de propio rol, foto ajena).
- Dispositivo real: modo avión → registrar → cerrar app → reabrir → reconectar.
