/**
 * Validador de cédula ecuatoriana — regla pura, sin React/Expo/SQLite/Supabase (RNF-02).
 * Algoritmo módulo 10 (docs/plan/03-acceso.md):
 *  - 10 dígitos;
 *  - provincia = dos primeros dígitos, entre 01 y 24;
 *  - tercer dígito entre 0 y 5 (serie de persona natural);
 *  - dígito verificador sobre los primeros 9 dígitos con coeficientes [2,1,2,1,2,1,2,1,2]:
 *    producto > 9 se resta 9; verificador = (10 - suma % 10) % 10.
 */
import { ERRORES_DOMINIO } from './errores';
import { err, ok, type Resultado } from './resultado';

const COEFICIENTES = [2, 1, 2, 1, 2, 1, 2, 1, 2] as const;

/** Quita espacios y guiones que la gente suele escribir ("17 1234567-8"). */
export function normalizarCedula(entrada: string): string {
  return entrada.replace(/[\s-]/g, '');
}

export function esCedulaValida(entrada: string): boolean {
  return validarCedula(entrada).ok;
}

/** Devuelve la cédula normalizada si es válida, o el motivo del rechazo. */
export function validarCedula(entrada: string): Resultado<string> {
  const cedula = normalizarCedula(entrada);

  if (!/^\d{10}$/.test(cedula)) return err(ERRORES_DOMINIO.CEDULA_LONGITUD);

  const provincia = Number(cedula.slice(0, 2));
  if (provincia < 1 || provincia > 24) return err(ERRORES_DOMINIO.CEDULA_PROVINCIA);

  if (Number(cedula[2]) > 5) return err(ERRORES_DOMINIO.CEDULA_SERIE);

  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let producto = Number(cedula[i]) * COEFICIENTES[i];
    if (producto > 9) producto -= 9;
    suma += producto;
  }
  const verificador = (10 - (suma % 10)) % 10;
  if (verificador !== Number(cedula[9])) return err(ERRORES_DOMINIO.CEDULA_VERIFICADOR);

  return ok(cedula);
}
