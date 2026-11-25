import {
  validarCuadratura,
  calcularDistancia,
  evaluarGps,
  calcularNitidez,
  luminanciaMedia,
  analizarNitidez,
  estadoInicialValidacionFoto,
  limpiarResultadoFoto,
  puedeUsarFoto,
  registrarResultadoFoto,
  type ResultadoAnalisisFoto,
} from './index';
import { MAX_INTENTOS_FOTO } from '@/shared/domain/constantes';

describe('validarCuadratura', () => {
  it('acepta una cuadratura válida', () => {
    const res = validarCuadratura([10, 20, 30, 5, 5], 2, 3, 75);
    expect(res.ok).toBe(true);
  });

  it('rechaza suma menor', () => {
    const res = validarCuadratura([10, 20, 30, 5, 5], 2, 3, 80);
    expect(res.ok).toBe(false);
  });

  it('rechaza suma mayor', () => {
    const res = validarCuadratura([10, 20, 30, 5, 5], 2, 3, 70);
    expect(res.ok).toBe(false);
  });

  it('rechaza negativos', () => {
    const res = validarCuadratura([-1, 20, 30, 5, 5], 2, 3, 64);
    expect(res.ok).toBe(false);
  });

  it('rechaza decimales', () => {
    const res = validarCuadratura([10.5, 20, 30, 5, 5], 2, 3, 75.5);
    expect(res.ok).toBe(false);
  });

  it('rechaza vacíos', () => {
    const res = validarCuadratura([], 2, 3, 5);
    expect(res.ok).toBe(false);
  });

  it('acepta objeto', () => {
    const res = validarCuadratura({ votos: [1, 2, 3, 4, 5], blancos: 1, nulos: 1, sufragantes: 17 });
    expect(res.ok).toBe(true);
  });

  it('acepta posicionales de 8 números', () => {
    const res = validarCuadratura(1, 2, 3, 4, 5, 1, 1, 17);
    expect(res.ok).toBe(true);
  });
});

describe('calcularDistancia', () => {
  it('calcula distancia haversine aproximada', () => {
    const d = calcularDistancia(0, 0, 0, 0);
    expect(d).toBe(0);
  });
});

describe('evaluarGps', () => {
  it('sin precisión -> BORRADOR', () => {
    const r = evaluarGps({ lat: 1, lon: 2, accuracy: null }, { lat: 1, lon: 2 });
    expect(r.estado).toBe('BORRADOR');
    expect(r.sinLecturaValida).toBe(true);
  });

  it('precisión peor o fuera de radio -> ADVERTIR sin bloquear', () => {
    const r = evaluarGps({ lat: 0, lon: 0, accuracy: 200 }, { lat: 0.01, lon: 0, accuracy: 0 });
    // recinto coords approx 1km away
    const r2 = evaluarGps(0, 0, 200, 0.01, 0);
    expect(r2.bloquear).toBe(false);
    expect(['ADVERTIR', 'OK']).toContain(r2.estado);
  });

  it('GPS sin lectura válida por lat nula', () => {
    const r = evaluarGps(null as any, 0, 10, 0, 0);
    expect(r.estado).toBe('BORRADOR');
  });
});

describe('calcularNitidez', () => {
  it('matriz uniforme -> borrosa (varianza 0)', () => {
    const uniforme = new Array(100).fill(128);
    const v = calcularNitidez(uniforme);
    expect(v).toBe(0);
  });

  it('tablero -> nítida (varianza alta)', () => {
    const tablero: number[] = [];
    for (let i = 0; i < 100; i++) tablero.push(i % 2 === 0 ? 0 : 255);
    const v = calcularNitidez(tablero);
    expect(v).toBeGreaterThan(100);
  });

  it('luminancia media', () => {
    expect(luminanciaMedia([10, 20, 30])).toBe(20);
  });
});

describe('analizarNitidez (foto real con dimensiones)', () => {
  const ancho = 64;
  const alto = 64;

  function tablero(): number[] {
    const px: number[] = [];
    for (let y = 0; y < alto; y++) {
      for (let x = 0; x < ancho; x++) px.push((x + y) % 2 === 0 ? 0 : 255);
    }
    return px;
  }

  function plana(): number[] {
    return new Array(ancho * alto).fill(128);
  }

  const noProcesable: ResultadoAnalisisFoto = { analizado: false, motivo: 'IMAGEN_NO_PROCESABLE' };

  it('foto nítida: resultado válido y nitida=true', () => {
    const r = analizarNitidez(tablero(), ancho, alto);
    expect(r.analizado).toBe(true);
    if (r.analizado) {
      expect(r.nitida).toBe(true);
      expect(r.varianza).toBeGreaterThan(100);
    }
  });

  it('foto borrosa: resultado válido y nitida=false', () => {
    const r = analizarNitidez(plana(), ancho, alto);
    expect(r.analizado).toBe(true);
    if (r.analizado) expect(r.nitida).toBe(false);
  });

  it('foto que no puede procesarse: sin resultado válido', () => {
    expect(analizarNitidez([], ancho, alto)).toEqual(noProcesable);
    expect(analizarNitidez(plana(), ancho + 1, alto)).toEqual(noProcesable);
    expect(analizarNitidez(new Array(ancho * alto).fill(Number.NaN), ancho, alto)).toEqual(noProcesable);
  });

  it('dos intentos fallidos no bastan; el tercero permite foto dudosa', () => {
    let estado = estadoInicialValidacionFoto();
    const resultado = analizarNitidez(plana(), ancho, alto);
    estado = registrarResultadoFoto(estado, resultado);
    estado = registrarResultadoFoto(estado, resultado);
    expect(estado.calidad).toBe('NORMAL');
    expect(estado.intentosFallidos).toBe(2);
    expect(puedeUsarFoto(estado)).toBe(false);

    estado = registrarResultadoFoto(estado, resultado);
    expect(estado.intentosFallidos).toBe(MAX_INTENTOS_FOTO);
    expect(estado.calidad).toBe('CALIDAD_DUDOSA');
    expect(puedeUsarFoto(estado)).toBe(true);
  });

  it('los fallos consecutivos se reinician con una foto nítida', () => {
    let estado = estadoInicialValidacionFoto();
    const borrosaValida = analizarNitidez(plana(), ancho, alto);
    estado = registrarResultadoFoto(registrarResultadoFoto(estado, borrosaValida), borrosaValida);
    estado = registrarResultadoFoto(estado, analizarNitidez(tablero(), ancho, alto));
    expect(estado.intentosFallidos).toBe(0);
    expect(estado.calidad).toBe('NORMAL');
    expect(puedeUsarFoto(estado)).toBe(true);

    estado = registrarResultadoFoto(estado, borrosaValida);
    expect(estado.intentosFallidos).toBe(1);
    expect(estado.calidad).toBe('NORMAL');
    expect(puedeUsarFoto(estado)).toBe(false);
  });

  it('cambiar de foto tras un rechazo descarta el resultado anterior', () => {
    let estado = registrarResultadoFoto(
      estadoInicialValidacionFoto(),
      analizarNitidez(tablero(), ancho, alto),
    );
    expect(puedeUsarFoto(estado)).toBe(true);

    estado = limpiarResultadoFoto(estado);
    expect(estado.resultado).toBeNull();
    expect(puedeUsarFoto(estado)).toBe(false);

    estado = registrarResultadoFoto(estado, analizarNitidez(plana(), ancho, alto));
    expect(puedeUsarFoto(estado)).toBe(false);
    expect(estado.calidad).toBe('NORMAL');
  });

  it('un intento no procesable también cuenta como fallo consecutivo', () => {
    let estado = estadoInicialValidacionFoto();
    for (let i = 0; i < MAX_INTENTOS_FOTO; i++) estado = registrarResultadoFoto(estado, noProcesable);
    expect(estado.calidad).toBe('CALIDAD_DUDOSA');
    expect(puedeUsarFoto(estado)).toBe(true);
  });
});