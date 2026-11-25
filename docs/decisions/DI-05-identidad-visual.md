# DI-05: Organización política, paleta y tema

**Estado:** DECIDIDO (revisión 3; las revisiones 2 y 1 se conservan más abajo como historial)  
**Refina:** RNF-06, RNF-08, ADR-12  
**Depende de:** DI-11 (dependencias de presentación: expo-linear-gradient, react-native-svg)

## Revisión 3 — Franja de identidad y acentos por rol

### Contexto

Se solicita una referencia cromática inspirada en los siete colores de la bandera de Pachakutik para reforzar la identidad visual, sin reproducir símbolos oficiales ni presentarla como identidad oficial de esa organización. **No se dispone de una fuente verificable adicional que acredite los códigos hexadecimales como una reproducción exacta**: se trata de una interpretación cromática aproximada, declarada como tal. Si se requiere una réplica oficial, debe encargarse una investigación documental antes de afirmarla.

### Decisión (revisión 3)

- Se incorpora el componente compartido `src/shared/ui/franja-identidad.tsx`: **4 px de alto**, siete segmentos de igual proporción, sin texto, iconos, estado ni interacción. Es **exclusivamente decorativa** y nunca es el único indicador de estado, error o alerta.
- Paleta exacta de la franja (tokens en `@theme` de `src/global.css`):
  - Rojo `#D32F2F` · Naranja `#F57C00` · Amarillo `#FBC02D` · Verde `#2E9E4F` · Turquesa `#0E7490` · Azul `#1D4ED8` · Violeta `#6D28D9`.
- Ubicaciones: debajo de la cabecera compartida de los tres roles (`CabeceraRol`), en el borde de `AnillosAvance` (sin tocar sus cálculos, SVG ni animaciones) y en la pantalla de arranque (`src/app/index.tsx`). La pantalla «Coordinadores» usa la franja en lugar de una franja ámbar anterior para evitar duplicación.
- Acentos por rol: provincial azul `#1D4ED8`, coordinador violeta `#6D28D9` (antes `#4338CA`), veedor turquesa `#0E7490`. No cambia la navegación, la jerarquía ni los permisos.
- Contraste verificado: texto blanco sobre azul (6.70:1), violeta (7.10:1) y turquesa (5.36:1). Texto `#0B1F4B` se conserva sobre naranja y amarillo; la franja no lleva texto.
- Se conserva el logotipo propio del **sol naciente** (SVG local). No se reproducen la bandera de Pachakutik, el churo, la wiphala ni logotipos o símbolos oficiales de organizaciones políticas.
- Pie informativo «Datos de prueba — no corresponde a resultados reales» en login y panel provincial, como pie no superpuesto que respeta el área segura.
- `organizaciones.color` **no se modifica en Supabase**. Sobre el fondo real del vidrio (`#FCFDFE`, blanco 75 % sobre `#F4F8FB`), `#0EA5E9` (2.72:1) y `#F59E0B` (2.11:1) no alcanzan 3:1; `colorOrganizacionLegible()` deriva variantes presentacionales más oscuras (`#0C91CD`, 3.47:1 y `#BE7A09`, 3.45:1). Los otros tres colores del seed (`#1E3A8A`, `#15803D`, `#B91C1C`) sí cumplen.

### Por qué no contradice la línea base

Solo afecta a presentación y documentación: Uniwind, componentes compartidos y tokens existentes. No se modifica dominio, casos de uso, repositorios, RPC, Edge Functions, RLS, tablas, autenticación ni reglas electorales. ADR-12 y la revisión 2 de DI-05 dejan la identidad visual al implementador.

---

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
