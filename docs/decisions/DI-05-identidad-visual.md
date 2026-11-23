# DI-05: Organización política, paleta y tema

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
