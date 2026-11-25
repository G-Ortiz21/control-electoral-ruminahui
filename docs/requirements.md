# Requerimientos acordados (línea base del equipo) — versión final (PDF consolidado)

> **Solo lectura.** Copiados del documento consolidado final. No se modifican ni se reinterpretan.
> Cada requerimiento debe quedar cubierto por código y por una prueba (ver `traceability.md`).

## Requerimientos funcionales

| Código | Requerimiento | Necesidad que lo origina |
|---|---|---|
| RF-01 | Crear y desactivar cuentas exclusivamente según jerarquía provincial → coordinador de recinto → veedor. Registrar cédula ecuatoriana válida y única, nombres, apellidos, teléfono y correo. Conservar historial de cuentas desactivadas. | Acceso de los usuarios: el autorregistro produjo datos incompletos y la organización exige que nadie ingrese sin habilitación. |
| RF-02 | Autenticar con correo y contraseña; exigir verificación de correo y sustitución de clave temporal en el primer acceso; permitir recuperación autónoma de contraseña. | Acceso de los usuarios: quien crea la cuenta conoce la clave inicial y el provincial no debe actuar como soporte de contraseñas. |
| RF-03 | Permitir al coordinador provincial consultar y agregar recintos con cantón, parroquia, nombre y JRV, y designar un único coordinador de recinto vigente. | Organización del territorio: el provincial administra recintos y existe un solo responsable por recinto. |
| RF-04 | Asignar un veedor vigente por JRV; una persona puede cubrir varias JRV. Permitir reemplazo de ausentes sin perder autoría ni historial de asignaciones. | Organización del personal: escasez de veedores y sustituciones imprevistas durante la jornada electoral. |
| RF-05 | Registrar por cada JRV dos actas (alcaldía y prefectura), con votos enteros no negativos para cinco organizaciones, blancos, nulos y sufragantes; validar que la suma de los siete valores coincida con los sufragantes. | Registro de resultados: números imposibles y sumas inconsistentes recibidas en elecciones anteriores. |
| RF-06 | Tomar con cámara una fotografía por acta, evaluar automáticamente indicios de desenfoque y permitir repetir la captura. Identificar de forma distinta las fotografías de calidad dudosa. | Registro de resultados: fotografías borrosas inutilizables para revisar o impugnar actas. |
| RF-07 | Capturar latitud, longitud, precisión y hora originales del acta; conservarlas al sincronizar y permitir consultar la ubicación de captura y la del recinto dentro de la aplicación. | Registro y seguimiento: cuestionamientos sobre el lugar de obtención de las fotografías. |
| RF-08 | Corregir actas según la responsabilidad vigente: veedor en sus JRV y coordinador en su recinto; registrar autor, hora, motivo y valores anteriores sin perder el historial. | Registro de resultados: errores frecuentes de transcripción y necesidad de ayuda de los coordinadores. |
| RF-09 | Mostrar el estado local/remoto de cada envío, reconocer reintentos y evitar registros duplicados de una misma JRV y dignidad. | Registro de resultados: usuarios repetían envíos al no conocer su resultado y provocaban duplicados. |
| RF-10 | Restringir consultas y modificaciones al territorio y responsabilidad vigentes de cada rol: veedor/JRV, coordinador/recinto y provincial/jurisdicción. | Confidencialidad: divulgación de información de mesas a personas no autorizadas. |
| RF-11 | Mostrar resultados preliminares por recinto, dignidad y candidatura, así como avance de JRV reportadas y respaldadas; reflejar actas nuevas y correcciones desde su versión vigente, sin duplicar votos. | Seguimiento del escrutinio: contar con información preliminar sin esperar al CNE. |
| RF-12 | Registrar votos, foto y coordenadas sin internet; recuperar pendientes después de cerrar la app y sincronizar cuando vuelva la conexión. | Conectividad electoral: recintos rurales sin señal y registros perdidos al transferirlos posteriormente. |
| RF-13 | Registrar fallos fatales y no fatales con datos técnicos suficientes para identificarlos, sin incorporar datos personales ni resultados electorales. | Estabilidad: cierres inesperados que el equipo técnico no pudo diagnosticar mediante mensajes de los usuarios. |
| RF-14 | Mantener precargado el catálogo de recintos, JRV, cinco organizaciones y candidaturas de alcaldía/prefectura para la jurisdicción elegida. | Restricción de datos precargados establecida expresamente en el examen. |

## Requerimientos no funcionales

| Código | Requerimiento | Necesidad que lo origina |
|---|---|---|
| RNF-01 | Entregar un APK React Native instalable y probado en un Android físico. La evaluación debe incluir cámara, GPS, almacenamiento local, navegación y reporte de fallos; registrar la versión de Android y las características del equipo. | Restricción obligatoria de plataforma y formato de entrega; penalización del examen por ausencia de APK. |
| RNF-02 | Aplicar Clean Architecture: el dominio no importa React, Expo, SQLite ni Supabase; las dependencias externas se conectan mediante contratos y adaptadores. | Restricción arquitectónica y defensa de código: demostrar separación de responsabilidades. |
| RNF-03 | Restringir desde servidor el acceso a filas y fotografías según rol, recinto y JRV vigentes; emplear transporte cifrado y no incorporar credenciales administrativas en el APK. | Filtración previa de datos y sensibilidad de cédulas, correos, fotos y resultados. |
| RNF-04 | Validar integridad tanto local como remotamente; aplicar unicidad de actas, idempotencia de operaciones y auditoría no editable por usuarios ordinarios. | Valores imposibles, actas duplicadas y necesidad de conocer el origen de cada cambio. |
| RNF-05 | No indicar «guardado» antes de persistir votos, metadatos y referencia a fotografía. Recuperar pendientes tras cierre forzado y tolerar pérdidas de conexión sin duplicaciones. | Jornada con conectividad irregular y equipos de recursos limitados. |
| RNF-06 | Presentar rutas por rol y estados de operación comprensibles, errores junto a los campos y mensajes explícitos, y mantener la identidad visual de la organización. | Usuarios de poca experiencia y criterios explícitos de diseño de la rúbrica. |
| RNF-07 | Distinguir fallos fatales y no fatales con versión, pantalla y tipo de dispositivo; suprimir cédulas, claves, fotos, ubicación y votos de todo reporte. | Necesidad de identificar el fallo y los dispositivos afectados sin depender del usuario. |
| RNF-08 | Calcular resultados desde la versión vigente de las actas en el servidor, actualizar mediante Supabase Realtime y refrescar tras reconexión; mostrar última actualización y distinguir avance numérico de evidencia respaldada. | Seguimiento del escrutinio en tiempo real y correcciones posteriores. |
