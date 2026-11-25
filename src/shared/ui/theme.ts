/**
 * Constantes de diseño (DI-05 revisión 2) que NO son color.
 * Los colores viven en UN solo lugar: el tema Uniwind de src/global.css (@theme).
 * Ninguna pantalla usa colores sueltos: usar las clases de tema (bg-primary,
 * text-texto-secundario, etc.) o los helpers de esta clase.
 */
export const MEDIDAS = {
  /** DI-05: botones de mínimo 56 px de alto. */
  alturaBotonMinima: 56,
  /** DI-05: esquinas redondeadas amplias (rango 20–24). */
  radioRedondeado: 22,
  /** DI-05: radio de tarjetas de vidrio. */
  radioVidrio: 24,
  /** DI-05: tamaño base de tipografía 18 px (ver --text-base en global.css). */
  tamanoBase: 18,
  /** Mínimo de contraste exigido (DI-05). */
  contrasteMinimo: 4.5,
} as const;

/**
 * Clases de utilidad del tema. Centralizan los valores de color para que las
 * pantallas no escriban colores sueltos.
 */
export const CLASES = {
  /** Vidrio (DI-05): fondo blanco opaco ≥ 0.72, borde blanco 90 %, radio grande, sombra suave azul. */
  vidrio: 'bg-white/[0.72] border-white/[0.9] border rounded-24 shadow-suave-azul',
  /** Vidrio con texto: opacidad de fondo elevada para garantizar contraste. */
  vidrioTexto: 'bg-white/[0.75] border-white/[0.9] border rounded-22 shadow-suave-azul',
  /** Fondo base de la app (zona de lectura casi blanca). */
  fondoBase: 'bg-background',
  /** Texto principal y secundario del tema. */
  texto: 'text-foreground',
  textoSecundario: 'text-texto-secundario',
  textoSobreColor: 'text-texto-sobre-color',
} as const;

/** Acento de rol por chip, indicador de pestaña, tinte de cabecera y botón principal. */
export type RolAcento = 'PROVINCIAL' | 'COORDINADOR' | 'VEEDOR';

export const CLASE_ROL: Record<RolAcento, string> = {
  PROVINCIAL: 'bg-primary',
  COORDINADOR: 'bg-rol-coordinador',
  VEEDOR: 'bg-accent',
} as const;

export const TEXTO_ROL: Record<RolAcento, string> = {
  PROVINCIAL: 'text-white',
  COORDINADOR: 'text-white',
  VEEDOR: 'text-white',
} as const;
