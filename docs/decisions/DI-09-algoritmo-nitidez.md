# DI-09: Algoritmo de comprobación de nitidez

**Estado:** DECIDIDO (el umbral se calibra con fotos reales en el celular de pruebas)
**Refina:** ADR-09, RF-06, RNF-05

## Contexto
ADR-09 pide una «comprobación orientativa de desenfoque/iluminación sobre imagen reducida» y deja el algoritmo concreto como margen del implementador. Debe correr en un celular modesto, sin red y sin bloquear la interfaz.

## Alternativas consideradas
| Alternativa | Ventajas | Desventajas |
|---|---|---|
| Varianza del Laplaciano sobre imagen reducida a escala de grises | Método estándar, barato, implementable en TypeScript puro y probable sin Expo | Sensible a la iluminación; necesita umbral calibrado |
| Librería nativa de visión (OpenCV) | Más precisa | Dependencia fuera del stack cerrado y riesgo en el APK |
| Solo revisión humana | Sin código | No cumple «evaluar automáticamente» de RF-06 |

## Decisión
- Reducir la foto (p. ej. lado mayor de 480 px) con `expo-image-manipulator` y **decodificar sus píxeles con `jpeg-js`** (un reducir solo no basta: hay que leer los píxeles para medir la nitidez). Ambas librerías están **autorizadas en `AGENTS.md`** como soporte de ADR-09, únicamente para esta comprobación. El arreglo de luminancias resultante pasa a la función pura del dominio.
- **La fase 4 empieza con un mini-spike** para comprobar que reducir + decodificar funciona en el APK. Si no funciona, el agente se **DETIENE y pregunta** (regla 2/3 de `AGENTS.md`); no sustituye las librerías por su cuenta.
- Calcular la **varianza del Laplaciano** en una función pura de `modules/actas/domain` que recibe un arreglo de luminancias (sin importar Expo), de modo que se pruebe con Jest.
- Además, medir la **luminancia media** para avisar de «muy oscura».
- Constantes `UMBRAL_NITIDEZ` y `UMBRAL_LUMINANCIA_MIN` en `shared/domain`. Valor inicial a calibrar tomando 10 fotos nítidas y 10 borrosas de un acta con el celular de pruebas; el resultado se anota en esta ficha.
- El resultado es **orientativo**: nunca declara una foto «válida», solo «parece nítida» o «parece borrosa». Cuenta como intento fallido para DI-08.

## Por qué no contradice la línea base
ADR-09 pide exactamente una comprobación orientativa sobre imagen reducida y no fija el algoritmo. No añade dependencias fuera del stack.

## Consecuencias y pruebas
- Pruebas unitarias del dominio con matrices sintéticas: patrón de tablero (nítido) vs. matriz uniforme (borroso).
- Prueba en dispositivo: foto nítida, foto movida, foto en penumbra.

## Registro de calibración (completar)
| Foto | Varianza | Luminancia | Resultado esperado |
|---|---|---|---|
