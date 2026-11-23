/**
 * Códigos de error comunes del dominio con mensaje listo para la UI (en español).
 * El detalle va junto al campo (RNF-06); nada de mensajes genéricos.
 */
export const ERRORES_DOMINIO = {
  CEDULA_LONGITUD: 'La cédula debe tener 10 dígitos.',
  CEDULA_PROVINCIA: 'Los dos primeros dígitos deben corresponder a una provincia (01–24).',
  CEDULA_SERIE: 'El tercer dígito debe estar entre 0 y 5 (persona natural).',
  CEDULA_VERIFICADOR: 'El dígito verificador de la cédula no es válido.',
} as const;

export type CodigoErrorDominio = keyof typeof ERRORES_DOMINIO;
