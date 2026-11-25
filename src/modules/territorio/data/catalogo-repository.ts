import { obtenerClienteSupabase } from '@/shared/infrastructure/supabase-client';
import { obtenerDb } from '@/shared/infrastructure/sqlite-client';
import { err, ok, type Resultado } from '@/shared/domain/resultado';
import type { AuthRepository } from '@/modules/auth/domain/ports/auth-repository';

export async function sincronizarCatalogo(auth?: AuthRepository): Promise<Resultado<void, string>> {
  const c = obtenerClienteSupabase();
  if (!c) return err('Supabase no configurado.');
  // S-02/ADR-03: la réplica respeta RLS; hay que establecer la sesión del
  // usuario autenticado para descargar solo catálogo y asignaciones autorizadas.
  if (auth) {
    const sesion = await auth.obtenerSesionActual();
    if (sesion) {
      try {
        await c.auth.setSession({ access_token: sesion.accessToken, refresh_token: sesion.refreshToken ?? '' });
      } catch {
        // ignorar: el cliente puede no tener refresh token
      }
    }
  }

  const db = await obtenerDb();

  try {
    // Versión remota (si existe la tabla).
    let versionRemota = '1';
    const { data: vData } = await c.from('catalogo_version').select('version').order('version', { ascending: false }).limit(1);
    if (Array.isArray(vData) && vData.length > 0) versionRemota = String((vData[0] as any).version);

    const vLocal = await db.getAllAsync('SELECT version FROM catalogo_version LIMIT 1');
    const versionLocal = (vLocal as any[])?.[0]?.version ?? null;
    if (versionLocal === versionRemota) {
      return ok(undefined);
    }

    // Descarga completa (incremental simple por versión).
    const [recintos, jrvs, orgs, cands] = await Promise.all([
      c.from('recintos').select('*'),
      c.from('jrv').select('*'),
      c.from('organizaciones').select('*'),
      c.from('candidatos').select('*'),
    ]);

    if (recintos.error) return err(recintos.error.message);
    if (jrvs.error) return err(jrvs.error.message);
    if (orgs.error) return err(orgs.error.message);
    if (cands.error) return err(cands.error.message);

    await db.withTransactionAsync(async () => {
      for (const r of recintos.data ?? []) {
        await db.runAsync(
          `INSERT INTO catalogo_recintos (id, nombre, canton, parroquia, lat, lon, updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET nombre=excluded.nombre, canton=excluded.canton, parroquia=excluded.parroquia, lat=excluded.lat, lon=excluded.lon, updated_at=excluded.updated_at`,
          [r.id, r.nombre ?? r.nombre_recinto ?? '', r.canton ?? null, r.parroquia ?? null, r.lat ?? null, r.lon ?? null, r.updated_at ?? null],
        );
      }
      for (const j of jrvs.data ?? []) {
        await db.runAsync(
          `INSERT INTO catalogo_jrv (id, recinto_id, numero, updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET recinto_id=excluded.recinto_id, numero=excluded.numero, updated_at=excluded.updated_at`,
          [j.id, j.recinto_id, j.numero, j.updated_at ?? null],
        );
      }
      for (const o of orgs.data ?? []) {
        await db.runAsync(
          `INSERT INTO catalogo_organizaciones (id, nombre, color, updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET nombre=excluded.nombre, color=excluded.color, updated_at=excluded.updated_at`,
          [o.id, o.nombre, o.color ?? null, o.updated_at ?? null],
        );
      }
      for (const cd of cands.data ?? []) {
        await db.runAsync(
          `INSERT INTO catalogo_candidatos (id, organizacion_id, dignidad, nombre, updated_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET organizacion_id=excluded.organizacion_id, dignidad=excluded.dignidad, nombre=excluded.nombre, updated_at=excluded.updated_at`,
          [cd.id, cd.organizacion_id, cd.dignidad, cd.nombre, cd.updated_at ?? null],
        );
      }
      await db.runAsync('DELETE FROM catalogo_version');
      await db.runAsync('INSERT INTO catalogo_version (version, aplicado_en) VALUES (?,?)', [versionRemota, new Date().toISOString()]);
    });

    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Error al sincronizar catálogo.');
  }
}
