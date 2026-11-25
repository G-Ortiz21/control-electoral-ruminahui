import {
  validarReemplazo,
  validarAsignacion,
  veedorVigenteDe,
  otrasAsignacionesNoAfectadas,
  puedeVerRecinto,
  historialOrdenado,
  veedoresDisponiblesParaJrv,
  jrvsVigentesDelVeedor,
  validarDesignacionCoordinador,
  type VeedorDisponible,
  type JrvRecinto,
} from './index';

describe('validarReemplazo', () => {
  it('acepta reemplazo válido', () => {
    const r = validarReemplazo({ jrvId: 'j1', veedorActualId: 'v1', nuevoVeedorId: 'v2', motivo: 'motivo' });
    expect(r.ok).toBe(true);
  });
  it('rechaza sin motivo', () => {
    const r = validarReemplazo({ jrvId: 'j1', veedorActualId: 'v1', nuevoVeedorId: 'v2', motivo: '' });
    expect(r.ok).toBe(false);
  });
  it('rechaza mismo veedor', () => {
    const r = validarReemplazo({ jrvId: 'j1', veedorActualId: 'v1', nuevoVeedorId: 'v1', motivo: 'm' });
    expect(r.ok).toBe(false);
  });
});

describe('validarAsignacion', () => {
  it('acepta asignación válida', () => {
    const r = validarAsignacion({ jrvId: 'j1', veedorId: 'v1', motivo: 'm' });
    expect(r.ok).toBe(true);
  });
  it('rechaza sin veedor', () => {
    const r = validarAsignacion({ jrvId: 'j1', veedorId: '', motivo: 'm' });
    expect(r.ok).toBe(false);
  });
});

describe('veedorVigenteDe', () => {
  it('devuelve el vigente (hasta null)', () => {
    const asigs = [
      { id: 'a1', jrvId: 'j1', veedorId: 'v1', desde: '2024-01-01', hasta: '2024-02-01', motivo: null, asignadoPor: null },
      { id: 'a2', jrvId: 'j1', veedorId: 'v2', desde: '2024-02-01', hasta: null, motivo: null, asignadoPor: null },
    ];
    expect(veedorVigenteDe(asigs as any)?.veedorId).toBe('v2');
  });
});

describe('otrasAsignacionesNoAfectadas', () => {
  it('no incluye la JRV reemplazada', () => {
    const asigs = [
      { id: 'a1', jrvId: 'j1', veedorId: 'v1', desde: '', hasta: null, motivo: null, asignadoPor: null },
      { id: 'a2', jrvId: 'j2', veedorId: 'v1', desde: '', hasta: null, motivo: null, asignadoPor: null },
    ];
    const res = otrasAsignacionesNoAfectadas(asigs as any, 'j1');
    expect(res).toHaveLength(1);
    expect(res[0].jrvId).toBe('j2');
  });
});

describe('puedeVerRecinto', () => {
  it('permite mismo recinto', () => {
    expect(puedeVerRecinto('r1', 'r1')).toBe(true);
  });
  it('niega recinto distinto (negativa)', () => {
    expect(puedeVerRecinto('r1', 'r2')).toBe(false);
  });
  it('niega sin recinto del actor', () => {
    expect(puedeVerRecinto(null, 'r2')).toBe(false);
  });
});

describe('historialOrdenado', () => {
  it('ordena por desde', () => {
    const asigs = [
      { id: 'a2', jrvId: 'j1', veedorId: 'v2', desde: '2024-02-01', hasta: null, motivo: null, asignadoPor: null },
      { id: 'a1', jrvId: 'j1', veedorId: 'v1', desde: '2024-01-01', hasta: '2024-02-01', motivo: null, asignadoPor: null },
    ];
    const res = historialOrdenado(asigs as any);
    expect(res[0].id).toBe('a1');
  });
});

describe('validarDesignacionCoordinador', () => {
  it('acepta designación con motivo', () => {
    const r = validarDesignacionCoordinador({ recintoId: 'r1', coordinadorId: 'c1', motivo: 'Nuevo responsable' });
    expect(r.ok).toBe(true);
  });

  it('rechaza sin recinto, sin coordinador o sin motivo', () => {
    expect(validarDesignacionCoordinador({ recintoId: '', coordinadorId: 'c1', motivo: 'm' }).ok).toBe(false);
    expect(validarDesignacionCoordinador({ recintoId: 'r1', coordinadorId: '', motivo: 'm' }).ok).toBe(false);
    expect(validarDesignacionCoordinador({ recintoId: 'r1', coordinadorId: 'c1', motivo: '  ' }).ok).toBe(false);
  });

  it('rechaza al vigente de ese recinto', () => {
    const r = validarDesignacionCoordinador({ recintoId: 'r1', coordinadorId: 'c1', motivo: 'm', vigenteId: 'c1' });
    expect(r.ok).toBe(false);
  });
});

describe('veedoresDisponiblesParaJrv', () => {
  const veedores: VeedorDisponible[] = [
    { id: 'v1', nombres: 'Uno', apellidos: 'A', estado: 'ACTIVO' },
    { id: 'v2', nombres: 'Dos', apellidos: 'B', estado: 'ACTIVO' },
    { id: 'v3', nombres: 'Tres', apellidos: 'C', estado: 'DESACTIVADO' },
    { id: 'v4', nombres: 'Cuatro', apellidos: 'D', estado: 'PENDIENTE' },
  ];

  const jrv: JrvRecinto = {
    jrvId: 'j1', numero: 1, recintoId: 'r1', veedorVigenteId: 'v1', veedorVigenteNombre: 'Uno A',
  };

  it('solo ofrece perfiles ACTIVO', () => {
    const res = veedoresDisponiblesParaJrv(veedores, jrv);
    expect(res.map((v) => v.id)).toEqual(['v2']);
  });

  it('no excluye a quien ya está vigente en otra JRV', () => {
    const otraJrv: JrvRecinto = { ...jrv, jrvId: 'j2', numero: 2, veedorVigenteId: 'v2', veedorVigenteNombre: 'Dos B' };
    const res = veedoresDisponiblesParaJrv(veedores.slice(0, 2), otraJrv);
    expect(res.map((v) => v.id)).toEqual(['v1']);
  });

  it('excluye al responsable vigente de esa misma JRV', () => {
    const res = veedoresDisponiblesParaJrv(veedores.slice(0, 2), jrv);
    expect(res.map((v) => v.id)).toEqual(['v2']);
  });

  it('con un solo veedor disponible lo devuelve', () => {
    const res = veedoresDisponiblesParaJrv([veedores[1]], jrv);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('v2');
  });

  it('JRV sin responsable ofrece todos los ACTIVO', () => {
    const res = veedoresDisponiblesParaJrv(veedores, { ...jrv, veedorVigenteId: null });
    expect(res.map((v) => v.id)).toEqual(['v1', 'v2']);
  });
});

describe('jrvsVigentesDelVeedor', () => {
  it('muestra solo las JRV donde el veedor es vigente', () => {
    const jrvs: JrvRecinto[] = [
      { jrvId: 'j1', numero: 1, recintoId: 'r1', veedorVigenteId: 'v1', veedorVigenteNombre: 'Uno A' },
      { jrvId: 'j2', numero: 2, recintoId: 'r1', veedorVigenteId: 'v2', veedorVigenteNombre: 'Dos B' },
      { jrvId: 'j3', numero: 3, recintoId: 'r1', veedorVigenteId: 'v1', veedorVigenteNombre: 'Uno A' },
    ];
    expect(jrvsVigentesDelVeedor(jrvs, 'v1').map((j) => j.numero)).toEqual([1, 3]);
  });
});
