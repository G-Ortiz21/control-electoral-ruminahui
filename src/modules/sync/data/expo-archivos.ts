import * as FileSystem from 'expo-file-system/legacy';
import type { ArchivosPort } from '../domain';

export class ExpoArchivos implements ArchivosPort {
  async copiarFoto(origen: string, destino: string): Promise<string> {
    const dir = destino.substring(0, destino.lastIndexOf('/'));
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    await FileSystem.copyAsync({ from: origen, to: destino });
    return destino;
  }

  async eliminar(ruta: string): Promise<void> {
    const info = await FileSystem.getInfoAsync(ruta);
    if (info.exists) await FileSystem.deleteAsync(ruta, { idempotent: true });
  }

  async existe(ruta: string): Promise<boolean> {
    const info = await FileSystem.getInfoAsync(ruta);
    return info.exists;
  }

  async listar(directorio: string): Promise<string[]> {
    const info = await FileSystem.getInfoAsync(directorio);
    if (!info.exists) return [];
    const entries = await FileSystem.readDirectoryAsync(directorio);
    const base = directorio.endsWith('/') ? directorio.slice(0, -1) : directorio;
    return entries.map((e) => `${base}/${e}`);
  }

  async info(ruta: string): Promise<{ existe: boolean; mtime?: number }> {
    const i = await FileSystem.getInfoAsync(ruta);
    return { existe: i.exists, mtime: (i as { modificationTime?: number }).modificationTime };
  }
}
