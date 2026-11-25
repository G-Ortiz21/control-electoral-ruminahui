# DI-05: Organización política, paleta y tema

**Estado:** DECIDIDO (revisión 2; la revisión 1 se conserva más abajo como historial)  
**Refina:** RNF-06, RNF-08, ADR-12  
**Depende de:** DI-11 (dependencias de presentación: expo-linear-gradient, react-native-svg)

## Contexto (revisión 2)

La rúbrica de diseño pide consistencia visual con los colores de la organización, futurismo suave +
glassmorfismo + minimalismo y visualización de datos interactiva, con una única fuente de tokens en el
tema Uniwind y sin colores sueltos en pantallas.

## Decisión (revisión 2)

- Organización política (ficticia, una de las 5 del catálogo de prueba): **Movimiento Horizonte Ciudadano**.
- Identidad: futurismo suave + glassmorfismo + minimalismo.
- Paleta (única fuente: `@theme` de `src/global.css`):
  - fondoBase `#F4F8FB`; degradado decorativo SOLO en la parte superior y en manchas de fondo:
    `#F4F8FB → #67E8F9 → #2563EB` con baja opacidad; la zona de lectura queda casi blanca.
  - vidrio: blanco con opacidad ≥ 0.72 (NUNCA menos donde haya texto), borde blanco 1px al 90 %,
    radio 20–24, sombra suave azul `rgba(30,64,175,0.12)`. Sin blur real: no se instala `expo-blur`.
  - texto `#0B1F4B`, textoSecundario `#3B4A78`, textoSobreColor `#FFFFFF` solo sobre azul/índigo/teal/éxito/error/advertencia.
  - primario `#1D4ED8` · acento `#0E7490` (texto/iconos) · cianDecorativo `#67E8F9` (solo decoración, nunca texto)
    · ámbar `#F59E0B` (solo fondo con texto `#0B1F4B`; nunca texto blanco) · éxito `#15803D` ·
    advertencia `#B45309` · error `#B91C1C`.
  - Acento por rol (chip, indicador de pestaña, tinte de cabecera, botón principal):
    provincial `#1D4ED8` · coordinador `#4338CA` · veedor `#0E7490`.
- Tipografía: Space Grotesk (títulos) y JetBrains Mono (cifras, porcentajes, JRV) como `.ttf` locales en
  `assets/fonts` con `expo-font`; cuerpo con fuente del sistema. Base 18 px, mínimo 16 px, botones ≥ 56 px,
  contraste ≥ 4.5:1.
- Movimiento: Reanimated suave (150–400 ms), entradas escalonadas, máximo 2 animaciones simultáneas por pantalla.
- Logotipo/ícono: un sol naciente estilizado sobre azul (original, creado con formas simples en SVG), usado en
  cabecera de rol y pantalla de arranque con Lottie.
- Elementos distintivos: tarjetas de vidrio, franja de identidad en cabecera, animaciones Lottie propias de
  carga/éxito/fallo/sin conexión con la paleta nueva.

## Por qué no contradice la línea base

ADR-12 fija Uniwind/Lottie/Reanimated y deja la identidad (paleta, tipografía, pantallas, animaciones) al
implementador. ADR-12 solo exige identidad de la organización y navegación por rol; este rediseño visual
cubre RNF-06 (identidad visual) y RNF-08 (conectividad/estado visible) sin tocar casos de uso, RPC, SQLite ni
lógica de sync. `expo-linear-gradient` y `react-native-svg` son dependencias puramente de presentación
(documentadas en DI-11).

## Consecuencias y pruebas

- Tokens definidos en un único tema Uniwind; ninguna pantalla usa colores sueltos.
- `npx tsc --noEmit` y `npm test` deben pasar tras cada grupo del rediseño.
- En la defensa se justifica: contexto → decisión → consecuencia.

---

## Revisión 1 (historial, conservada)

**Estado:** DECIDIDO (propuesta; cámbiala si prefieres otra identidad antes de la fase 1)  
**Refina:** RNF-06, ADR-12

## Contexto

La rúbrica pide consistencia visual con los colores de la organización y penaliza la app más genérica.

## Decisión

- Organización política (ficticia, una de las 5 del catálogo): **Movimiento Horizonte Ciudadano** (lista 5 en el catálogo de prueba). Las otras 4 también ficticias para no vincular la app con partidos reales.
- Colores. Reglas de contraste: texto blanco solo sobre primario, éxito, advertencia y error (≥ 4.5:1); secundario y acento se usan **solo como fondo con texto `#0F172A`**, nunca como texto sobre blanco: primario `#1E3A8A` (azul profundo) · secundario `#F59E0B` (ámbar) · acento `#0EA5E9` · éxito `#15803D` · advertencia `#B45309` · error `#B91C1C` · fondo `#F8FAFC` · texto `#0F172A`.
- Logotipo/ícono: un sol naciente estilizado sobre azul (original, creado con formas simples en SVG).
- Elementos distintivos: tipografía sans-serif legible con tamaño base 18 px, botones de mínimo 56 px de alto, esquinas redondeadas amplias, franja ámbar bajo la cabecera, animaciones Lottie propias de carga/éxito/fallo/sin conexión con la paleta anterior.

## Por qué no contradice la línea base

ADR-12 fija Uniwind/Lottie/Reanimated y deja la identidad al implementador.

## Consecuencias y pruebas

Tokens definidos en un único tema Uniwind; ninguna pantalla usa colores sueltos.
