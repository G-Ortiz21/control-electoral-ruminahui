# ADR-09: Fotografía directa, nitidez y geolocalización de origen

> **Estado de la línea base:** OBLIGATORIO (ratificado). Visor = Leaflet dentro de WebView, DENTRO de la app (sin mapas externos).
>
> **Margen del implementador (decisión propia):** Algoritmo de nitidez (DI-09), advertir sin bloquear (DI-03). Marcadores de captura y recinto + coordenadas, precisión, hora y distancia en texto; deben recuperarse offline (Leaflet empaquetado localmente); el mapa base de calles solo con red o teselas en caché.
>
> Copia fiel del documento consolidado final. No editar el contenido bajo la línea `---`.

---

### Requerimientos relacionados

RF-06, RF-07, RF-12; RNF-04, RNF-05; S-05, S-06

### Contexto

La evidencia electoral debe ser legible y demostrar la ubicación original de captura. En V1 se discutieron tres intentos ante fotos borrosas y se propusieron umbrales GPS de 300 m y 100 m; se mantiene una advertencia ante lecturas imprecisas, sin atribuir fraude automáticamente. La visualización solicitada para el aplicativo es Leaflet integrado mediante WebView, no un mapa externo.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| Expo Camera + nitidez + Expo Location + mapa Leaflet integrado en WebView | Camila (alternativa seleccionada para la implementación) | Fotografía y GPS capturados en la app; ubicación y recinto visibles en el mapa interno sin salir de la aplicación. | El mapa base puede requerir red; deben comprobarse compatibilidad de WebView y calidad aproximada de las fotos. |
| Expo Camera + Expo Location + react-native-maps | Mateo (alternativa comparada) | Mapa nativo en la pantalla del acta, con marcadores de ubicación y recinto. | Configuración del proveedor cartográfico en Android y prueba en APK. |
| Captura simple, revisión visual y enlace a mapa externo | Gelen (alternativa comparada) | Menor desarrollo e inspección manual de la foto. | No permite la misma consulta contextual en la pantalla; la inspección manual puede dejar pasar desenfoques. |

### Decisión

Se utiliza Expo Camera para tomar la fotografía directamente dentro de la aplicación, mostrarla y realizar una comprobación orientativa de desenfoque/iluminación. Se permite repetir; tras tres intentos fallidos se conserva, si el usuario continúa, como CALIDAD_DUDOSA para revisión humana. Esa etiqueta no equivale a evidencia validada.

Expo Location registra latitud, longitud, precisión y hora en el momento de captura. Se calcula la distancia a las coordenadas precargadas del recinto y se preservan esos valores al sincronizar. Si la precisión supera 100 m o la distancia excede 300 m, se muestra una advertencia, sin rechazo automático. Sin GPS válido se conserva el acta como borrador, sin enviarla como evidencia completa.

Se adopta Leaflet dentro de WebView en el detalle del acta, con marcadores de la posición de captura y del recinto, además de coordenadas, precisión, hora y distancia en texto. El visor permanece dentro de la app, sin abrir mapas externos. Los datos y marcadores pueden recuperarse offline; no se garantiza el mapa base de calles sin teselas previamente disponibles en caché.

### Consecuencias

Se gana evidencia visual y geográfica consultable dentro de la aplicación, sin depender de servicios externos. Se pierde la posibilidad de que el mapa base cargue sin conexión, salvo que existan teselas en caché. Se asume el riesgo de mala iluminación, precisión GPS limitada en interiores y permisos denegados. Durante el desarrollo, las advertencias de distancia y precisión no deben bloquear la captura, y las coordenadas originales deben conservarse al sincronizar.

### Minuto del video

Minuto de referencia del video final: 01:42:38
