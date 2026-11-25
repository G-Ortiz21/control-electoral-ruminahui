# DI-01: Territorio y fuente del catálogo

**Estado:** PENDIENTE (hay que cargar recintos REALES; ver «Cambio respecto a la versión anterior»)
**Refina:** S-01, ADR-03, RF-14

## Contexto
La versión final de **S-01** fija Pichincha / Rumiñahui y exige un catálogo con **recintos y JRV del territorio, con fuente y fecha verificables**; añade: «No se considerará suficiente un catálogo ficticio o parcial presentado como definitivo». **ADR-03** agrega: «No se presentarán datos ficticios como padrón real». El examen exige además recintos precargados de la provincia y el cantón elegidos.

## Cambio respecto a la versión anterior
La versión anterior de esta DI aprobaba un «catálogo de prueba» (8 recintos genéricos tipo «Recinto de prueba 01 – Sangolquí», coordenadas aproximadas). Eso **entra en tensión con el texto final de S-01 y ADR-03** y queda reemplazado por esta decisión.

## Alternativas consideradas
| Alternativa | Ventajas | Desventajas |
|---|---|---|
| Catálogo de prueba con nombres genéricos | Rápido | Contradice el espíritu de S-01/ADR-03; riesgo de penalización en la defensa |
| Recintos reales de Rumiñahui (nombre oficial del establecimiento, parroquia, nº de JRV) con fuente y fecha | Cumple S-01 y ADR-03 | Hay que conseguir y depurar los datos |
| Catálogo real PARCIAL, declarado como tal | Mejor que uno ficticio si no se logra el total | S-01 advierte que un catálogo parcial no se presente como definitivo; hay que declararlo con precisión |

## Decisión
1. Territorio: **Pichincha / Rumiñahui** (definitivo en S-01).
2. Cargar recintos y JRV **reales** del cantón: nombre del establecimiento, parroquia, número de JRV y latitud/longitud (si la fuente no publica coordenadas, geocodificarlas y documentar el método como «ubicación aproximada del establecimiento»).
3. Cabecera de `supabase/seed.sql` y README con: fuente exacta, fecha de consulta, cantidad de recintos y JRV cargados. Nunca la frase «padrón oficial» si no lo es.
4. Si no se logra el total antes de la entrega, se carga lo verificable, se declara «catálogo real parcial: N recintos de M conocidos, fuente X, fecha Y» y se explica en la defensa como limitación conocida (riesgo aceptado conscientemente).
5. Organizaciones y candidaturas: 5 organizaciones con candidato a alcaldía y a prefectura cada una; pueden ser ficticias, documentado. Evitar personas reales.
6. `catalogo_version` se incrementa; el seed sigue siendo idempotente (`INSERT … ON CONFLICT`) y se ejecuta dos veces sin duplicar.
7. Los recintos de prueba anteriores no se borran si tienen actas o asignaciones: se desactivan.

## Por qué no contradice la línea base
Es la lectura literal de S-01 y ADR-03 finales.

## Consecuencias y pruebas
- Seed dos veces sin duplicar; conteo de recintos/JRV coincide con la cabecera.
- Cada dignidad con 5 candidaturas.
- Ninguna sincronización elimina recintos/JRV referenciados por actas locales (ADR-03).
