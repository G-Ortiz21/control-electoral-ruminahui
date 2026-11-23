import { esCedulaValida, normalizarCedula, validarCedula } from './validador-cedula';

describe('validarCedula (regla pura, sin Expo)', () => {
  it('acepta una cédula válida (1712345675)', () => {
    expect(esCedulaValida('1712345675')).toBe(true);
  });

  it('acepta el caso borde cuyo verificador es 0 (1800000000)', () => {
    expect(esCedulaValida('1800000000')).toBe(true);
  });

  it('normaliza espacios y guiones antes de validar', () => {
    expect(normalizarCedula('17 1234567-5')).toBe('1712345675');
    expect(validarCedula('17 1234567-5')).toEqual({ ok: true, valor: '1712345675' });
  });

  it('rechaza longitud distinta de 10', () => {
    expect(validarCedula('171234567').ok).toBe(false);
  });

  it('rechaza provincia fuera de 01–24', () => {
    expect(validarCedula('2512345675').ok).toBe(false);
  });

  it('rechaza tercer dígito mayor que 5 (no es persona natural)', () => {
    expect(validarCedula('0162345675').ok).toBe(false);
  });

  it('rechaza dígito verificador incorrecto', () => {
    expect(validarCedula('1712345678').ok).toBe(false);
  });

  it('rechaza letras o caracteres no numéricos', () => {
    expect(esCedulaValida('171234567A')).toBe(false);
  });

  it('devuelve mensaje de error en español', () => {
    const resultado = validarCedula('1712345678');
    if (!resultado.ok) expect(resultado.error).toBe('El dígito verificador de la cédula no es válido.');
  });
});
