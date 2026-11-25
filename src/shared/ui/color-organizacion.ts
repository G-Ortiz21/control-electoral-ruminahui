import { TOKENS } from './theme';

/**
 * Capa de presentación para `organizaciones.color` (DI-05 revisión 3).
 * El valor persistido NO se modifica: aquí se deriva una variante legible
 * cuando el color original no alcanza 3:1 sobre el vidrio real de las tarjetas.
 */
const FONDO_VIDRIO = '#FCFDFE'; // blanco 75 % sobre #F4F8FB

function luminancia(hex: string): number {
  const canales = [0, 2, 4].map((i) => parseInt(hex.slice(i + 1, i + 3), 16) / 255);
  const lineales = canales.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * lineales[0] + 0.7152 * lineales[1] + 0.0722 * lineales[2];
}

function contraste(a: string, b: string): number {
  const l1 = luminancia(a);
  const l2 = luminancia(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function normalizar(color: string | null | undefined): string | null {
  if (!color) return null;
  const texto = color.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(texto) ? texto : null;
}

function oscurecer(hex: string): string {
  let actual = hex;
  for (let paso = 0; paso < 12; paso++) {
    const rgb = [1, 3, 5].map((i) => {
      const valor = Math.round(parseInt(actual.slice(i, i + 2), 16) * 0.88);
      return Math.max(0, Math.min(255, valor)).toString(16).padStart(2, '0');
    });
    actual = `#${rgb.join('')}`;
    if (contraste(actual, FONDO_VIDRIO) >= 3) return actual;
  }
  return actual;
}

export function colorOrganizacionLegible(color: string | null | undefined): string {
  const original = normalizar(color);
  if (!original) return TOKENS.primario;
  return contraste(original, FONDO_VIDRIO) >= 3 ? original : oscurecer(original);
}
