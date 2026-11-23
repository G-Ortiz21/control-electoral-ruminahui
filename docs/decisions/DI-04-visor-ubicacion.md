# DI-04: Visor de ubicación del acta

**Estado:** DECIDIDO
**Refina:** ADR-09, RF-07

## Contexto
ADR-09 deja sin ratificar el visor definitivo (Leaflet/WebView, react-native-maps o enlace externo) y pide no prometer mapa de calles offline.

## Alternativas consideradas
| Alternativa | Ventajas | Desventajas |
|---|---|---|
| Leaflet en WebView | Sin clave de Google; sin configuración nativa; rápido de integrar | Teselas requieren red |
| react-native-maps | Mapa nativo | Requiere clave/proveedor en Android y más riesgo en APK |

## Decisión
Línea base mínima: en el detalle del acta se muestran **coordenadas, precisión, momento de captura y distancia al recinto** (texto). Sobre eso, un visor **Leaflet/WebView** con marcadores de acta y recinto; si no hay red se muestra el texto y un aviso «mapa no disponible sin conexión».

`react-native-webview` queda **autorizado en `AGENTS.md`** como soporte de ADR-09. Si falla en el APK, el visor se degrada al texto de coordenadas más un enlace externo al mapa (sin prometer mapa offline).

## Por qué no contradice la línea base
Cumple «consultar coordenadas y distancia en el detalle del acta» y no promete mapa offline.

## Consecuencias y pruebas
Revisar detalle con y sin conexión; las coordenadas mostradas coinciden con las capturadas.
