# ADR-05: Autorización territorial con RLS y Storage privado

> **Estado de la línea base:** OBLIGATORIO (ratificado).
>
> **Margen del implementador (decisión propia):** Forma exacta de las políticas y funciones de ámbito; fotos por política de Storage o URL firmada de corta duración. Cada política requiere prueba negativa. La copia local NO se considera protegida por RLS.
>
> Copia fiel del documento consolidado final. No editar el contenido bajo la línea `---`.

---

### Requerimientos relacionados

RF-01, RF-04, RF-08, RF-10; RNF-03, RNF-04; S-03, S-08

### Contexto

El alcance territorial no puede protegerse solo ocultando pantallas: un cliente modificado podría solicitar registros ajenos directamente a Supabase. En V2-P2 se debatió la autorización RLS sobre tablas y fotografías, y se distinguió esta defensa remota de la protección física de los archivos locales del teléfono.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| RLS sobre tablas y políticas para objetos de Storage | Camila, Gelen y Mateo; debatido V2-P2 | El servidor comprueba el alcance vigente para leer o modificar, independientemente de la interfaz. | Las políticas cruzan perfiles, JRV y asignaciones; necesitan funciones y pruebas negativas. |
| Filtrar datos únicamente en la aplicación | Camila y Mateo (alternativa descartada) | Menos reglas SQL y menús fáciles de mostrar. | Un cliente modificado podría solicitar información de otros recintos. |
| API propia con autorización por endpoint | Mateo (comparación) | Criterios de seguridad concentrados en un backend administrado por el equipo. | Duplica infraestructura, pruebas y código respecto al modelo seleccionado. |

### Decisión

Se habilita RLS en tablas electorales y políticas equivalentes en Storage privado. Cada solicitud se autoriza con auth.uid(), perfil ACTIVO, rol y territorio vigente: el veedor accede solo a sus JRV asignadas; el coordinador de recinto, solo a las de su recinto; el provincial, solo a su jurisdicción. Edge Functions y operaciones RPC privilegiadas repiten la validación en servidor.

Las fotos se consultan por permisos sobre objetos privados o URLs firmadas de corta duración; ningún usuario puede otorgarse otro rol. La baja o reemplazo revoca escrituras remotas posteriores, incluidas las enviadas desde una outbox offline. La copia local conserva exclusivamente datos previamente autorizados; no se considera protegida únicamente por RLS.

### Consecuencias

Se gana una protección en el servidor que impide consultar datos ajenos aunque la aplicación se modifique. Se pierde facilidad de depuración, porque cada política debe escribirse y probarse por separado. Se asume el riesgo de que una política mal escrita abra el acceso. Durante el desarrollo, cada política debe tener una prueba negativa que confirme que un usuario de otro recinto no obtiene filas.

### Minuto del video

Minuto de referencia del video final: 01:10:35
