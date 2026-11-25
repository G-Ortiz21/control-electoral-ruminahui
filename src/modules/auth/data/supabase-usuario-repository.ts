import { obtenerClienteSupabase } from '@/shared/infrastructure/supabase-client';
import type { AuthRepository } from '../domain/ports/auth-repository';
import type { Usuario } from '../domain/entities/usuario';
import { err, ok, type Resultado } from '@/shared/domain/resultado';

interface PerfilRow {
  id: string;
  id_auth: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  email: string | null;
  rol: 'PROVINCIAL' | 'COORDINADOR' | 'VEEDOR';
  estado: 'PENDIENTE' | 'ACTIVO' | 'DESACTIVADO';
  provincia_id: string | null;
  creado_por: string | null;
  creado_en: string;
}

function mapPerfil(row: PerfilRow): Usuario {
  return {
    id: row.id,
    idAuth: row.id_auth,
    cedula: row.cedula,
    nombres: row.nombres,
    apellidos: row.apellidos,
    telefono: row.telefono,
    email: row.email,
    rol: row.rol,
    estado: row.estado,
    provinciaId: row.provincia_id,
    creadoPor: row.creado_por,
    creadoEn: row.creado_en,
  };
}

export class SupabaseUsuarioRepository {
  constructor(private readonly auth: AuthRepository) {}

  private async clienteConSesion() {
    const sb = obtenerClienteSupabase();
    if (!sb) return null;
    const sesion = await this.auth.obtenerSesionActual();
    if (!sesion) return sb;
    try {
      await sb.auth.setSession({
        access_token: sesion.accessToken,
        refresh_token: sesion.refreshToken ?? '',
      });
    } catch {
      // ignorar
    }
    return sb;
  }

  async obtenerPerfilActual(): Promise<Resultado<Usuario | null, string>> {
    const sb = await this.clienteConSesion();
    if (!sb) return err('Supabase no está configurado.');
    const sesion = await this.auth.obtenerSesionActual();
    if (!sesion) return err('No hay sesión activa.');
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id_auth', sesion.userId)
      .maybeSingle();
    if (error) return err(error.message || 'Error al obtener el perfil.');
    if (!data) return ok(null);
    return ok(mapPerfil(data as PerfilRow));
  }

  async listarAMiCargo(): Promise<Resultado<Usuario[], string>> {
    const sb = await this.clienteConSesion();
    if (!sb) return err('Supabase no está configurado.');
    const sesion = await this.auth.obtenerSesionActual();
    if (!sesion) return err('No hay sesión activa.');

    const { data: me, error: meErr } = await sb
      .from('profiles')
      .select('id')
      .eq('id_auth', sesion.userId)
      .maybeSingle();
    if (meErr) return err(meErr.message || 'Error al obtener el perfil.');
    if (!me) return ok([]);

    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('creado_por', (me as { id: string }).id)
      .order('creado_en', { ascending: false });
    if (error) return err(error.message || 'Error al listar usuarios.');
    return ok((data ?? []).map((r) => mapPerfil(r as PerfilRow)));
  }

  async desactivar(id: string): Promise<Resultado<void, string>> {
    const sb = await this.clienteConSesion();
    if (!sb) return err('Supabase no está configurado.');
    const { error } = await sb
      .from('profiles')
      .update({ estado: 'DESACTIVADO' })
      .eq('id', id);
    if (error) return err(error.message || 'No se pudo desactivar el usuario.');
    return ok(undefined);
  }
}