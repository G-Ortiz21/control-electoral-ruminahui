import {
  evaluarCuadratura,
  ordenarPorVotos,
  porcentaje,
  porcentajeRedondeado,
  redondear,
} from './calculos';

describe('porcentaje', () => {
  it('calcula porcentaje normal', () => {
    expect(porcentaje(25, 100)).toBe(25);
  });
  it('división entre cero devuelve 0', () => {
    expect(porcentaje(25, 0)).toBe(0);
    expect(porcentaje(25, -5)).toBe(0);
  });
  it('parte negativa devuelve 0', () => {
    expect(porcentaje(-10, 100)).toBe(0);
  });
});

describe('redondear', () => {
  it('redondea a 2 decimales por defecto', () => {
    expect(redondear(25.555)).toBe(25.56);
  });
  it('respeta la cantidad de decimales pedida', () => {
    expect(redondear(25.555, 1)).toBe(25.6);
    expect(redondear(25.555, 0)).toBe(26);
  });
  it('no rompe con valores no finitos', () => {
    expect(redondear(Number.NaN)).toBe(0);
  });
});

describe('ordenarPorVotos', () => {
  it('ordena por votos descendente sin mutar el origen', () => {
    const candidatos = [
      { organizacionId: 'a', organizacionNombre: 'Alfa', color: '#1D4ED8', votos: 10 },
      { organizacionId: 'b', organizacionNombre: 'Beta', color: '#0E7490', votos: 30 },
      { organizacionId: 'c', organizacionNombre: 'Gamma', color: '#F59E0B', votos: 20 },
    ];
    const origen = [...candidatos];
    const orden = ordenarPorVotos(candidatos);
    expect(orden.map((c) => c.votos)).toEqual([30, 20, 10]);
    expect(candidatos).toEqual(origen);
  });
  it('desempata por nombre', () => {
    const candidatos = [
      { organizacionId: 'a', organizacionNombre: 'Beta', color: '#1D4ED8', votos: 10 },
      { organizacionId: 'b', organizacionNombre: 'Alfa', color: '#0E7490', votos: 10 },
    ];
    const orden = ordenarPorVotos(candidatos);
    expect(orden.map((c) => c.organizacionNombre)).toEqual(['Alfa', 'Beta']);
  });
});

describe('evaluarCuadratura', () => {
  it('cuadra cuando la suma es igual', () => {
    expect(evaluarCuadratura({ votos: [10, 20, 30, 5, 5], blancos: 2, nulos: 3, sufragantes: 75 })).toEqual({
      diferencia: 0,
      estado: 'CUADRA',
    });
  });
  it('falta cuando la suma es menor', () => {
    expect(evaluarCuadratura({ votos: [10, 20, 30, 5, 5], blancos: 0, nulos: 0, sufragantes: 80 })).toEqual({
      diferencia: -10,
      estado: 'FALTA',
    });
  });
  it('sobra cuando la suma es mayor', () => {
    expect(evaluarCuadratura({ votos: [10, 20, 30, 5, 5], blancos: 5, nulos: 5, sufragantes: 70 })).toEqual({
      diferencia: 10,
      estado: 'SOBRA',
    });
  });
});
