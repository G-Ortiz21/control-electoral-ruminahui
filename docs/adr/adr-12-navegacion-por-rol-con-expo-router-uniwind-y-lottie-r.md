# ADR-12: Navegación por rol con Expo Router, Uniwind y Lottie/Reanimated

> **Estado de la línea base:** OBLIGATORIO (ratificado).
>
> **Margen del implementador (decisión propia):** Paleta, tipografía, pantallas, animaciones (DI-05). Verificar compatibilidad de Uniwind con la versión del SDK y cada rol en Android.
>
> Copia fiel del documento consolidado final. No editar el contenido bajo la línea `---`.

---

### Requerimientos relacionados

RF-02, RF-04, RF-09, RF-10; RNF-01, RNF-06

### Contexto

Los usuarios tienen distintas responsabilidades y pueden repetir operaciones por no comprender el estado del envío. La rúbrica exige navegación por rol, retroalimentación sin modales genéricos y una identidad visual clara. Los apuntes recogen Expo Router, Uniwind, Lottie y Reanimated como las herramientas de interfaz.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| Expo Router + tema Uniwind + Lottie/Reanimated | Camila (Router); propuesta en la reunión (Uniwind); los tres (Lottie) | Rutas por archivos, tema central reutilizable y feedback visual coherente. | Debe comprobarse la compatibilidad real de Uniwind y las animaciones con el SDK/compilación. |
| React Navigation + StyleSheet + Lottie/Reanimated | Mateo Piedra | Flujos por rol explícitos y estilos nativos sin capa adicional. | La configuración manual de rutas y pantallas es distinta a la anotada en el consenso. |
| Navegador único con Alert.alert genérico | Alternativa descartada por la rúbrica | Implementación inicial mínima. | No diferencia bien los roles ni ofrece la retroalimentación visual exigida. |

### Decisión

Expo Router organiza rutas de autenticación y grupos protegidos para provincial, coordinador de recinto y veedor. Las pantallas consumen casos de uso de presentación; los layouts verifican sesión y estado, pero la seguridad efectiva de datos sigue a cargo de RLS.

Uniwind centraliza los colores y componentes de la organización; Lottie expresa progreso, éxito y error, y Reanimated anima transiciones pertinentes. Cada animación acompaña textos comprensibles: guardada localmente, pendiente, sincronizando, evidencia en revisión, confirmada o error. No se utilizan modales genéricos como única respuesta a las operaciones.

### Consecuencias

Se gana una navegación separada por rol y un diseño coherente que reduce los reenvíos por incertidumbre. Se pierde simplicidad en la configuración de rutas y animaciones. Se asume el riesgo de incompatibilidad con la versión de Expo y de animaciones costosas en equipos modestos. Durante el desarrollo, debe confirmarse la compatibilidad de Uniwind con la versión del SDK y comprobarse cada rol en un dispositivo Android.

### Minuto del video

Minuto de referencia del video final: 02:02:45
