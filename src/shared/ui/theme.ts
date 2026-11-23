/**
 * Constantes de diseño (DI-05) que no son color.
 * Los colores viven en UN solo lugar: el tema Uniwind de src/global.css (@theme).
 * Ninguna pantalla usa colores sueltos.
 */
export const MEDIDAS = {
  /** DI-05: botones de mínimo 56 px de alto. */
  alturaBotonMinima: 56,
  /** DI-05: franja ámbar bajo la cabecera (6 px). */
  franjaCabecera: 6,
  /** DI-05: esquinas redondeadas amplias. */
  radioRedondeado: 16,
  /** DI-05: tamaño base de tipografía 18 px (ver --text-base en global.css). */
  tamanoBase: 18,
} as const;
