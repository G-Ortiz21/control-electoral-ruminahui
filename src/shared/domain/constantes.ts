/**
 * Constantes compartidas del dominio (decisiones DI-03, DI-08, DI-09).
 * Sin dependencias externas (RNF-02).
 */
export const RADIO_MAX_M = 300;
export const PRECISION_MAX_M = 100;
export const MAX_INTENTOS_FOTO = 3;
/** Umbral orientativo de varianza del Laplaciano (DI-09, calibrar en dispositivo). */
export const UMBRAL_NITIDEZ = 100;
/** Luminancia media m��nima para no considerar la foto muy oscura (DI-09). */
export const UMBRAL_LUMINANCIA_MIN = 50;
