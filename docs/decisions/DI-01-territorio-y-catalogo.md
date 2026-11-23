# DI-01: Territorio y fuente del catálogo

**Estado:** DECIDIDO (catálogo de prueba; se reemplaza por el listado oficial si se consigue)
**Refina:** S-01, ADR-03, RF-14

## Contexto
El examen deja a cada estudiante elegir provincia y cantón. S-01 recoge la propuesta del equipo (Pichincha / Rumiñahui) sin cierre explícito, y advierte que la precarga no debe limitarse arbitrariamente a una parte del cantón.

## Alternativas consideradas
| Alternativa | Ventajas | Desventajas |
|---|---|---|
| Pichincha / Rumiñahui (propuesta del grupo) | Coincide con S-01; cantón pequeño, volumen de recintos manejable | Debe conseguirse el padrón real o documentar que es de prueba |
| Otro cantón | Libertad individual | Se aleja de la propuesta del equipo y complica la defensa |

## Decisión
Usar **Pichincha / Rumiñahui**. Precargar **todos** los recintos y JRV del cantón disponibles en la fuente elegida. Registrar en `supabase/seed.sql` (comentario de cabecera) y en el README: fuente, fecha de consulta y versión del catálogo (`catalogo_version`).
Si no se consigue el listado oficial a tiempo, se documenta explícitamente como «catálogo de prueba basado en …» y se mantiene la misma estructura para poder reemplazarlo.
Organizaciones: 5 (nombres reales o ficticios, documentado), con candidato a alcaldía y a prefectura cada una.

## Fuente de datos adoptada
El CNE publica para Rumiñahui solo mapas de circunscripciones y parroquias (p. ej. el mapa «Seccionales 2027 – Parroquias rurales», enero 2026), no un listado descargable de recintos con JRV. Por eso se adopta un **«catálogo de prueba basado en las parroquias reales de Rumiñahui»** (Sangolquí, San Rafael, San Pedro de Taboada, Cotogchoa, Rumipamba):
- Mínimo 8 recintos repartidos entre esas parroquias, con 3 a 6 JRV cada uno, nombres genéricos («Recinto de prueba 01 – Sangolquí») y **latitud/longitud aproximadas** dentro del cantón. Las coordenadas son obligatorias: DI-03 calcula la distancia al recinto. Las coordenadas son **aproximadas**; para la demo, un recinto de prueba lleva las coordenadas reales del lugar de la demostración y otro recinto queda lejos para mostrar la advertencia de distancia (DI-03).
- `catalogo_version = 1`, cabecera de `supabase/seed.sql` con: «Catálogo de prueba; no corresponde al padrón oficial; consultado en cne.gob.ec, noviembre 2026».
- La estructura permite reemplazarlo por el listado oficial sin tocar el código.

## Por qué no contradice la línea base
S-01 pide fijar provincia, cantón, recintos, fuente y fecha antes de entregar; esta DI lo hace. ADR-03 exige seed versionado e idempotente.

## Consecuencias y pruebas
Ejecutar el seed dos veces sin duplicar. Verificar conteo de recintos/JRV y que cada dignidad tenga 5 candidaturas.
