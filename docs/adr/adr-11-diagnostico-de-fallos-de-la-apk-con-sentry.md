# ADR-11: Diagnóstico de fallos de la APK con Sentry

> **Estado de la línea base:** OBLIGATORIO (ratificado).
>
> **Margen del implementador (decisión propia):** Qué errores no fatales se reportan, códigos de error, política de retención local. Verificar con compilación Android real.
>
> Copia fiel del documento consolidado final. No editar el contenido bajo la línea `---`.

---

### Requerimientos relacionados

RF-13; RNF-01, RNF-07, RNF-05

### Contexto

Se requiere registrar errores técnicos sin depender de la explicación del usuario, incluso si el fallo ocurre sin conectividad. Sentry permite observar fallos fatales y no fatales; el almacenamiento local de errores operativos es independiente de la cola de actas para no mezclar datos electorales con telemetría.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| Sentry para React Native/Expo | Camila, Gelen y Mateo (alternativa seleccionada) | Agrupa excepciones, muestra release, pantalla, dispositivo y errores no fatales. | Requiere configurar compilación, símbolos/source maps, privacidad y probar reportes offline. |
| Firebase Crashlytics | Gelen y Mateo (comparación) | Análisis sólido de fallos nativos. | Añade segundo proveedor y exige evaluar el tratamiento de errores JS y Expo. |
| Enviar errores a una tabla de Supabase | Alternativa comparada | Registra fallos no fatales si hay conexión. | No aporta automáticamente el diagnóstico de cierres ni almacenamiento ante desconexión. |

### Decisión

Se integra Sentry para React Native/Expo con identificación de versión, entorno, pantalla y tipo de dispositivo, además de source maps según el SDK. Se reportan fallos fatales y excepciones no fatales relevantes, como fallos de subida o sincronización. Se omiten datos personales, fotos, coordenadas, tokens y votos en mensajes, contexto y breadcrumbs.

Los errores no fatales que deban persistir sin red se registran en SQLite.errores_pendientes (UUID local, código, pantalla, versión, fecha, intentos), separada de outbox de actas. Al recuperar conexión se envían mediante el SDK y se aplica una política acotada de reintento/retención. El eventId local no prueba recepción remota; la demostración exigida consiste en provocar el fallo y constatarlo en el panel de Sentry.

Los fallos fatales se dejan al mecanismo compatible del SDK para su persistencia y envío, sin prometer garantías que no ofrece. La configuración se verifica con una compilación Android real al final del desarrollo.

### Consecuencias

Se gana un diagnóstico de cierres y errores operativos sin depender de lo que informe el usuario. Se pierde parte de la privacidad de la telemetría, por lo que hay que filtrar los datos personales y electorales. Se asume el riesgo de eventos no recibidos, duplicados y datos sensibles en los breadcrumbs. Durante el desarrollo, debe comprobarse un error provocado en el panel de Sentry y revisar que ningún reporte contenga cédulas, fotos, coordenadas ni votos.

### Minuto del video

Minuto de referencia del video final: 01:59:22
