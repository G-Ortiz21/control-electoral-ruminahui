# ADR-01: Clean Architecture por módulos y estado compartido con Zustand

> **Estado de la línea base:** OBLIGATORIO (ratificado).
>
> **Margen del implementador (decisión propia):** Nombres de carpetas dentro de cada módulo, estructura de stores Zustand, convenciones. Zustand solo para estado de presentación.
>
> Copia fiel del documento consolidado final. No editar el contenido bajo la línea `---`.

---

### Requerimientos relacionados

RF-05, RF-09, RF-12; RNF-01, RNF-02, RNF-05

### Contexto

El examen exige Clean Architecture, pero no fija cómo organizarla. Se comparó una organización por capas globales (domain, data y presentation para toda la aplicación) con una organización por funcionalidades. Se eligió la segunda porque la autenticación, el registro de actas y la sincronización cambian por separado: con módulos, cada flujo puede probarse y modificarse sin alterar los demás.

### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| Módulos por funcionalidad con domain/data/presentation internos y Zustand | Camila (módulos); Gelen y Mateo (Zustand); consenso V2-P1 | Cada función tiene sus casos de uso, contratos, adaptadores y pantallas próximos; Zustand queda limitado al estado de presentación. | Sin disciplina pueden duplicarse entidades y validadores; requiere módulo compartido para reglas comunes. |
| Capas globales domain, data y presentation | Gelen; Mateo inicialmente defendió capas; luego aceptó módulos | Dependencias visibles y reglas de dominio agrupadas. | Los directorios de datos y presentación crecen con funcionalidades distintas y se navega más entre carpetas. |
| Módulos con React Context y useReducer | Camila (alternativa individual previa) | Sin dependencia externa y API conocida de React. | Los contextos grandes pueden generar renders innecesarios y los procesos de sincronización requieren adaptadores claros. |

### Decisión

Se adopta Clean Architecture de forma independiente en cada módulo funcional del sistema: autenticación, territorio y asignaciones, actas, sincronización y seguimiento. Cada módulo organiza su propia lógica mediante domain, que contiene entidades, reglas de negocio, casos de uso e interfaces de repositorio; data, que implementa repositorios y adaptadores de servicios externos; y presentation, que contiene pantallas, componentes y hooks. Esta estructura permite desarrollar y mantener cada funcionalidad de manera independiente, conservando la separación de responsabilidades.

Se utiliza Zustand para gestionar el estado compartido de la aplicación, incluyendo la sesión, el rol del usuario, la conectividad y los estados temporales de la interfaz, sin incorporar reglas de negocio ni sustituir la persistencia de datos.

### Consecuencias

Se gana la posibilidad de probar las reglas electorales sin iniciar la aplicación y de localizar los cambios por módulo. Se pierde simplicidad inicial, porque hay que mantener contratos y mapeos entre capas sin duplicar reglas. Se asume el riesgo de que los módulos compartan entidades o validadores de forma descuidada. Durante el desarrollo, cada módulo debe respetar la regla de dependencia: domain no importa React, Expo, SQLite ni Supabase, y el estado de Zustand no sustituye al almacenamiento persistente.

### Minuto del video

Minuto de referencia del video final: 00:35:45
