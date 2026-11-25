# Diseño e interfaz (rúbrica: 4 pts) — completar en Fase 1 y refinar en Fase 8

## Identidad visual (DI-05)
- Organización política elegida: Movimiento Horizonte Ciudadano (ficticia, ver DI-05)
- Paleta (tokens Uniwind, ver DI-05): primario #1E3A8A · secundario #F59E0B · acento #0EA5E9 · éxito #15803D · advertencia #B45309 · error #B91C1C
- Tipografía: sans-serif legible, base 18 px (DI-05)
- Tono: usuarios mayores y con poca experiencia → botones grandes, una acción principal por pantalla, textos cortos y explícitos.

## Navegación por rol (ADR-12)
| Rol | Pantallas principales |
|---|---|
| Sin sesión | Login · Primer ingreso (OTP + nueva clave) · Recuperar contraseña |
| Veedor | Mis mesas · Registrar acta (alcaldía/prefectura) · Captura de foto · Detalle del acta (coordenadas, distancia) · Estado de envíos |
| Coordinador de recinto | Mis mesas y veedores · Asignar/reemplazar veedor · Crear veedor · Actas del recinto · Corregir acta |
| Provincial | Recintos (consultar/agregar) · Coordinadores · Avance por recinto · Resultados por dignidad · Revisión de acta (con ubicación) |

## Estados visibles (siempre con texto, no solo animación)
`Guardada localmente` · `Sincronizando…` · `Resultado recibido` · `Evidencia pendiente` · `En revisión` · `Evidencia respaldada` · `Error — reintentar` · `Conflicto de versión` · `Permiso revocado — en revisión`
Panel provincial: «JRV reportadas» y «JRV respaldadas» por separado, más fotos pendientes y en revisión; «Última actualización hh:mm» y aviso «Sin conexión».
Cada estado: ícono/Lottie + texto + color. Errores de validación junto al campo. Sin `Alert.alert`.

## Animaciones (Lottie / Reanimated)
Lottie: cargando, éxito, fallo, sin conexión. Reanimated: transición de estados, aparición de errores, avance de progreso.

## Datos de prueba para la defensa (≤ 6 min)
Ver `docs/plan/09-defensa.md`.
