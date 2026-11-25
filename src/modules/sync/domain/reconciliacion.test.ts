import { reconciliarFotos } from './reconciliacion';
import type { ArchivosPort, RepositorioOutbox, OperacionSync } from './sync';

function makeOutbox(initial: OperacionSync[]): RepositorioOutbox {
  const state = new Map(initial.map((o) => [o.operationId, o]));
  return {
    listarPendientes: async () => Array.from(state.values()),
    obtener: async (id) => state.get(id) ?? null,
    guardar: async (op) => { state.set(op.operationId, op); },
    actualizar: async (id, c) => { const cur = state.get(id); if (cur) state.set(id, { ...cur, ...c }); },
    eliminar: async (id) => { state.delete(id); },
  };
}

function makeArchivos(opts: { files: Record<string, number>; exists?: Record<string, boolean> }): ArchivosPort {
  const files = opts.files;
  return {
    copiarFoto: async (o, d) => d,
    eliminar: async (r) => { delete files[r]; },
    existe: async (r) => (opts.exists ? opts.exists[r] ?? (r in files) : r in files),
    listar: async (dir) => Object.keys(files).filter((f) => f.startsWith(dir)),
    info: async (r) => ({ existe: r in files, mtime: files[r] }),
  };
}

describe('reconciliarFotos', () => {
  it('elimina del outbox la operación cuya foto falta', async () => {
    const op: OperacionSync = {
      operationId: 'op-1', jrvId: 'j', recintoId: null, dignidad: 'ALCALDIA' as any, tipo: 'REGISTRAR_ACTA',
      payload: {}, fotoLocalPath: '/fotos/a.jpg', fotoRemotaPath: null, intentos: 0,
      estado: 'EVIDENCIA_PENDIENTE', proximoIntentoEn: null, ultimoError: null,
      creadoEn: '', actualizadoEn: '',
    };
    const outbox = makeOutbox([op]);
    const archivos = makeArchivos({ files: {}, exists: { '/fotos/a.jpg': false } });
    await reconciliarFotos(outbox, archivos, '/fotos', 7);
    expect(await outbox.obtener('op-1')).toBeNull();
  });

  it('borra archivos huérfanos antiguos y deja los recientes en cuarentena', async () => {
    const now = Date.now();
    const old = now - 10 * 24 * 60 * 60 * 1000;
    const recent = now - 1 * 24 * 60 * 60 * 1000;
    const outbox = makeOutbox([]);
    const archivos = makeArchivos({ files: { '/fotos/old.jpg': old, '/fotos/recent.jpg': recent } });
    await reconciliarFotos(outbox, archivos, '/fotos', 7);
    expect('/fotos/old.jpg' in archivos && false).toBe(false);
    // recent remains
    const remaining = await archivos.listar('/fotos');
    expect(remaining).toContain('/fotos/recent.jpg');
    expect(remaining).not.toContain('/fotos/old.jpg');
  });
});