import type { ArchivosPort, RepositorioOutbox } from './sync';

/**
 * Reconciliación de archivos de foto con el outbox (ADR-08).
 * - Fila sin archivo: la operación se elimina del outbox (sin operación activa).
 *   El acta queda en BORRADOR con aviso "Falta la foto, vuelve a tomarla".
 * - Archivo sin fila: se deja en cuarentena y se borra tras N días si nada lo referencia.
 */
export async function reconciliarFotos(
  outbox: RepositorioOutbox,
  archivos: ArchivosPort,
  directorioFotos: string,
  diasCuarentena = 7,
): Promise<void> {
  const ops = await outbox.listarPendientes();
  const referenciados = new Set(ops.map((o) => o.fotoLocalPath).filter(Boolean) as string[]);

  // Fila sin archivo: eliminar la operación del outbox.
  for (const op of ops) {
    if (op.fotoLocalPath && !(await archivos.existe(op.fotoLocalPath))) {
      await outbox.eliminar(op.operationId);
      referenciados.delete(op.fotoLocalPath);
    }
  }

  // Archivo sin fila: cuarentena / borrado tras N días.
  const archivosDir = await archivos.listar(directorioFotos);
  const limiteMs = Date.now() - diasCuarentena * 24 * 60 * 60 * 1000;
  for (const ruta of archivosDir) {
    if (referenciados.has(ruta)) continue;
    const meta = await archivos.info(ruta);
    if (!meta.existe) continue;
    if (meta.mtime !== undefined && meta.mtime < limiteMs) {
      await archivos.eliminar(ruta);
    }
    // si es reciente, se deja en cuarentena (no se borra aún).
  }
}