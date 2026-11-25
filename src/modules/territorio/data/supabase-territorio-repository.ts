import { obtenerClienteSupabase } from '@/shared/infrastructure/supabase-client';
import type { AuthRepository } from '@/modules/auth/domain/ports/auth-repository';
import type {
  AsignacionVeedor,
  JrvRecinto,
  RecintoResumen,
  ResultadoReemplazo,
  TerritorioRepository,
  VeedorDisponible,
} from '../domain';
import type { Acta } from '@/modules/actas/domain';
import { err, ok, type Resultado } from '@/shared/domain/resultado';

export class SupabaseTerritorioRepository implements TerritorioRepository {
  constructor(private readonly auth: AuthRepository) {}

  private async cliente() {
    const sb = obtenerClienteSupabase();
    if (!sb) return null;
    const sesion = await this.auth.obtenerSesionActual();
    if (sesion) {
      try {
        await sb.auth.setSession({ access_token: sesion.accessToken, refresh_token: sesion.refreshToken ?? '' });
      } catch { /* noop */ }
    }
    return sb;
  }

  async obtenerRecintoDelCoordinador(coordinadorId: string): Promise<Resultado<string, string>> {
    const sb = await this.cliente();
    if (!sb) return err('Supabase no configurado.');
    const { data, error } = await sb
      .from('coordinadores_recinto')
      .select('recinto_id')
      .eq('coordinador_id', coordinadorId)
      .is('hasta', null)
      .maybeSingle();
    if (error) return err(error.message);
    if (!data) return err('El coordinador no tiene recinto asignado.');
    return ok((data as any).recinto_id);
  }

  async listarJrvDelRecinto(recintoId: string): Promise<Resultado<JrvRecinto[], string>> {
    const sb = await this.cliente();
    if (!sb) return err('Supabase no configurado.');
    const { data: jrvs, error } = await sb
      .from('jrv')
      .select('id, numero, recinto_id')
      .eq('recinto_id', recintoId)
      .order('numero', { ascending: true });
    if (error) return err(error.message);

    const resultado: JrvRecinto[] = [];
    for (const j of jrvs ?? []) {
      const { data: asig } = await sb
        .from('asignaciones_veedor')
        .select('veedor_id, profiles:veedor_id(nombres, apellidos)')
        .eq('jrv_id', j.id)
        .is('hasta', null)
        .maybeSingle();
      resultado.push({
        jrvId: j.id,
        numero: j.numero,
        recintoId: j.recinto_id,
        veedorVigenteId: asig ? (asig as any).veedor_id : null,
        veedorVigenteNombre: asig ? `${(asig as any).profiles?.nombres ?? ''} ${(asig as any).profiles?.apellidos ?? ''}`.trim() : null,
      });
    }
    return ok(resultado);
  }

  async listarVeedoresDelRecinto(recintoId: string, coordinadorId: string): Promise<Resultado<VeedorDisponible[], string>> {
    const sb = await this.cliente();
    if (!sb) return err('Supabase no configurado.');

    // Ámbito (ADR-04/ADR-05): veedores creados por este coordinador en su recinto
    // + veedores con asignación (vigente o histórica) en alguna JRV del recinto.
    // Un veedor vigente en OTRA JRV no se excluye: ADR-06 permite varias JRV.
    const { data: jrvs, error: jrvsError } = await sb.from('jrv').select('id').eq('recinto_id', recintoId);
    if (jrvsError) return err(jrvsError.message);
    const jrvIds = (jrvs ?? []).map((j: any) => j.id);
    const ids = new Set<string>();
    if (jrvIds.length > 0) {
      const { data: asigs, error: asigsError } = await sb
        .from('asignaciones_veedor')
        .select('veedor_id')
        .in('jrv_id', jrvIds);
      if (asigsError) return err(asigsError.message);
      for (const a of asigs ?? []) ids.add((a as any).veedor_id);
    }

    let q = sb
      .from('profiles')
      .select('id, nombres, apellidos, estado')
      .eq('rol', 'VEEDOR')
      .eq('estado', 'ACTIVO');
    const filtro = ids.size > 0
      ? `creado_por.eq.${coordinadorId},id.in.(${[...ids].join(',')})`
      : `creado_por.eq.${coordinadorId}`;
    q = q.or(filtro);

    const { data, error } = await q.order('apellidos');
    if (error) return err(error.message);
    return ok((data ?? []).map((p: any) => ({
      id: p.id,
      nombres: p.nombres,
      apellidos: p.apellidos,
      estado: p.estado,
    })));
  }

  async asignarVeedor(jrvId: string, veedorId: string, motivo: string): Promise<Resultado<{ status: string }, string>> {
    const sb = await this.cliente();
    if (!sb) return err('Supabase no configurado.');
    const { data, error } = await sb.rpc('asignar_veedor', { p_jrv_id: jrvId, p_veedor_id: veedorId, p_motivo: motivo });
    if (error) return err(error.message);
    const r = data as any;
    if (r?.status !== 'ACEPTADO') return err(r?.detalle ?? 'El servidor no confirmó la asignación.');
    return ok({ status: r.status });
  }

  async reemplazarVeedor(jrvId: string, nuevoVeedorId: string, motivo: string): Promise<Resultado<ResultadoReemplazo, string>> {
    const sb = await this.cliente();
    if (!sb) return err('Supabase no configurado.');
    const { data, error } = await sb.rpc('reemplazar_veedor', { p_jrv_id: jrvId, p_nuevo_veedor_id: nuevoVeedorId, p_motivo: motivo });
    if (error) return err(error.message);
    const r = data as any;
    if (r?.status !== 'ACEPTADO' || typeof r?.veedor_anterior_cerrado !== 'boolean' || r?.nuevo_veedor_id !== nuevoVeedorId) {
      return err(r?.detalle ?? 'El servidor no confirmó el reemplazo.');
    }
    return ok({
      jrvId: r.jrv_id ?? jrvId,
      veedorAnteriorCerrado: r.veedor_anterior_cerrado,
      nuevoVeedorId: r.nuevo_veedor_id,
    });
  }

  async historialAsignaciones(jrvId: string): Promise<Resultado<AsignacionVeedor[], string>> {
    const sb = await this.cliente();
    if (!sb) return err('Supabase no configurado.');
    const { data, error } = await sb
      .from('asignaciones_veedor')
      .select('id, jrv_id, veedor_id, desde, hasta, motivo, asignado_por, profiles:veedor_id(nombres, apellidos)')
      .eq('jrv_id', jrvId)
      .order('desde', { ascending: true });
    if (error) return err(error.message);
    const items: AsignacionVeedor[] = (data ?? []).map((r: any) => ({
      id: r.id,
      jrvId: r.jrv_id,
      veedorId: r.veedor_id,
      veedorNombre: `${r.profiles?.nombres ?? ''} ${r.profiles?.apellidos ?? ''}`.trim(),
      desde: r.desde,
      hasta: r.hasta,
      motivo: r.motivo,
      asignadoPor: r.asignado_por,
    }));
    return ok(items);
  }

  async listarRecintos(): Promise<Resultado<RecintoResumen[], string>> {
    const sb = await this.cliente();
    if (!sb) return err('Supabase no configurado.');
    const { data, error } = await sb.from('recintos').select('id, canton, parroquia, nombre, lat, lon').order('nombre');
    if (error) return err(error.message);
    const recintos = data ?? [];
    const ids = recintos.map((r: any) => r.id);

    // Una sola consulta de vigentes (ADR-06: hasta IS NULL) con el perfil ya
    // existente; RLS limita el resultado a la provincia del actor.
    const vigentes = new Map<string, { id: string; nombres: string; apellidos: string }>();
    if (ids.length > 0) {
      const { data: asigs, error: asigsError } = await sb
        .from('coordinadores_recinto')
        .select('recinto_id, coordinador_id, profiles:coordinador_id(nombres, apellidos)')
        .in('recinto_id', ids)
        .is('hasta', null);
      if (asigsError) return err(asigsError.message);
      for (const a of asigs ?? []) {
        const perfil = (a as any).profiles as { nombres: string; apellidos: string } | null;
        vigentes.set((a as any).recinto_id, {
          id: (a as any).coordinador_id,
          nombres: perfil?.nombres ?? '',
          apellidos: perfil?.apellidos ?? '',
        });
      }
    }

    const res: RecintoResumen[] = [];
    for (const r of recintos ?? []) {
      const { count } = await sb.from('jrv').select('id', { count: 'exact', head: true }).eq('recinto_id', r.id);
      const responsable = vigentes.get(r.id) ?? null;
      res.push({
        id: r.id,
        canton: r.canton,
        parroquia: r.parroquia,
        nombre: r.nombre,
        lat: r.lat,
        lon: r.lon,
        totalJrv: count ?? 0,
        coordinadorId: responsable?.id ?? null,
        coordinadorNombres: responsable?.nombres ?? null,
        coordinadorApellidos: responsable?.apellidos ?? null,
      });
    }
    return ok(res);
  }

  async crearRecinto(datos: any): Promise<Resultado<string, string>> {
    const sb = await this.cliente();
    if (!sb) return err('Supabase no configurado.');
    const sesion = await this.auth.obtenerSesionActual();
    if (!sesion) return err('No hay sesión.');
    const { data, error } = await sb.rpc('agregar_recinto', {
      p_canton: datos.canton,
      p_parroquia: datos.parroquia,
      p_nombre: datos.nombre,
      p_lat: datos.lat,
      p_lon: datos.lon,
      p_jrvs: datos.jrvs ?? 0,
    });
    if (error) return err(error.message);
    const r = data as any;
    if (r?.status !== 'ACEPTADO' || !r?.recinto_id) return err(r?.detalle ?? 'El servidor no confirmó el recinto.');
    return ok(r.recinto_id);
  }

  async designarCoordinadorRecinto(recintoId: string, coordinadorId: string, motivo: string): Promise<Resultado<{ status: string }, string>> {
    const sb = await this.cliente();
    if (!sb) return err('Supabase no configurado.');
    const { data, error } = await sb.rpc('designar_coordinador_recinto', { p_recinto_id: recintoId, p_coordinador_id: coordinadorId, p_motivo: motivo });
    if (error) return err(error.message);
    const r = data as any;
    if (r?.status !== 'ACEPTADO') return err(r?.detalle ?? 'El servidor no confirmó la designación.');
    return ok({ status: r.status });
  }

  async avancePorRecinto(): Promise<Resultado<any[], string>> {
    const sb = await this.cliente();
    if (!sb) return err('Supabase no configurado.');
    const { data, error } = await sb.rpc('avance_por_recinto');
    if (error) return err(error.message);
    return ok(data ?? []);
  }

  async resultadosPorRecinto(dignidad: any): Promise<Resultado<any[], string>> {
    const sb = await this.cliente();
    if (!sb) return err('Supabase no configurado.');
    const { data, error } = await sb.rpc('resultados_por_recinto', { p_dignidad: dignidad });
    if (error) return err(error.message);
    return ok(data ?? []);
  }

  async listarActasDelRecinto(recintoId: string, dignidad?: any): Promise<Resultado<Acta[], string>> {
    const sb = await this.cliente();
    if (!sb) return err('Supabase no configurado.');
    const { data: jrvs } = await sb.from('jrv').select('id').eq('recinto_id', recintoId);
    const jrvIds = (jrvs ?? []).map((j: any) => j.id);
    if (jrvIds.length === 0) return ok([]);
    let q = sb.from('actas').select('*').in('jrv_id', jrvIds);
    if (dignidad) q = q.eq('dignidad', dignidad);
    const { data, error } = await q;
    if (error) return err(error.message);
    // cargar votos por acta
    const actas: Acta[] = [];
    for (const a of data ?? []) {
      const { data: votos } = await sb.from('votos_acta').select('*').eq('acta_id', a.id);
      actas.push({
        id: a.id,
        jrvId: a.jrv_id,
        recintoId: recintoId,
        dignidad: a.dignidad,
        version: a.version,
        estado: a.estado,
        capturedAt: a.captured_at,
        lat: a.lat,
        lon: a.lon,
        accuracy: a.accuracy,
        gpsTimestamp: a.captured_at,
        distanciaRecintoM: a.distancia_recinto_m,
        calidadFoto: a.calidad_foto,
        fotoPath: a.foto_path,
        sufragantes: a.sufragantes,
        blancos: a.blancos,
        nulos: a.nulos,
        votos: (votos ?? []).map((v: any) => ({ organizacionId: v.organizacion_id, votos: v.votos })),
        capturadoPor: a.capturado_por ?? null,
      } as Acta);
    }
    return ok(actas);
  }
}
