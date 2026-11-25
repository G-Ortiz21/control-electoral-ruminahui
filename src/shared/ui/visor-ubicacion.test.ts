import { construirPropsVisor, construirHtmlVisor } from './visor-ubicacion-html';

describe('visor-ubicacion', () => {
  const captura = { lat: -0.2, lon: -78.5, precisionM: 12, capturadaEn: '2026-01-01T10:00:00Z' };
  const recinto = { lat: -0.21, lon: -78.51, nombre: 'Recinto A' };

  it('construye props con radio por defecto 300 y conectado true', () => {
    const p = construirPropsVisor({ captura, recinto });
    expect(p.radioM).toBe(300);
    expect(p.conectado).toBe(true);
    expect(p.distanciaM).not.toBeNull();
  });

  it('respeta radioM y conectado', () => {
    const p = construirPropsVisor({ captura, recinto, radioM: 100, conectado: false });
    expect(p.radioM).toBe(100);
    expect(p.conectado).toBe(false);
  });

  it('construye HTML con los marcadores y sin CDN', () => {
    const p = construirPropsVisor({ captura, recinto });
    const html = construirHtmlVisor(p);
    expect(html).toContain('circleMarker');
    expect(html).not.toContain('unpkg.com');
    expect(html).not.toContain('cdn.');
  });
});