# DI-04: Visor de ubicación del acta (Leaflet en WebView, dentro de la app)

**Estado:** DECIDIDO (alineada con el texto final de ADR-09 y RF-07)
**Refina:** ADR-09, RF-07

## Contexto
El texto final de ADR-09 ya no deja el visor abierto: se adopta **Leaflet dentro de WebView**, con marcadores de la posición de captura y del recinto, coordenadas, precisión, hora y distancia en texto; el visor **permanece dentro de la app, sin abrir mapas externos**. Los datos y marcadores deben poder recuperarse offline; no se garantiza el mapa base de calles sin teselas en caché. RF-07 pide consultar la ubicación de captura **y la del recinto** dentro de la aplicación.

## Cambio respecto a la versión anterior
Antes: «sin red se muestra solo el texto y “mapa no disponible sin conexión”». Ahora los marcadores deben verse también sin red.

## Decisión
1. Componente único `src/shared/ui/visor-ubicacion.tsx` basado en `react-native-webview`.
2. **Leaflet empaquetado localmente** (JS y CSS embebidos en el HTML del WebView; sin CDN). Marcadores con `L.circleMarker`/`divIcon` para no depender de imágenes externas.
3. Dos marcadores distintos (captura y recinto), círculo con el radio de 300 m (DI-03) y encuadre automático.
4. Capa base OpenStreetMap con atribución cuando haya red; sin red, fondo neutro con los marcadores visibles.
5. Texto debajo: latitud/longitud, precisión (m), hora de captura, distancia al recinto y advertencias (DI-03).
6. Prohibido `Linking.openURL`, `geo:` y cualquier mapa externo. El WebView bloquea navegación fuera del HTML local.
7. Se reutiliza en detalle del acta del veedor y en la revisión del coordinador y del provincial.

## Por qué no contradice la línea base
Es la lectura literal de ADR-09 final y RF-07 final.

## Consecuencias y pruebas
Modo avión: marcadores y texto visibles. Con red: base cartográfica. Las coordenadas mostradas coinciden con las capturadas. Nota: `react-native-webview` es un módulo nativo → exige un nuevo build de EAS.
