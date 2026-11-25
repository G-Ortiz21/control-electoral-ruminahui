import { err, ok, type Resultado } from '@/shared/domain/resultado';
import { obtenerClienteSupabase } from '@/shared/infrastructure/supabase-client';
import type {
  Acta,
  CalidadFoto,
  Dignidad,
  MesaVeedor,
  RecintoCoords,
  VotoActa,
} from '../domain/entities/acta';
import type {
  ActasRepository,
  DatosConfirmarEvidencia,
  DatosCorregirActa,
  DatosRegistrarActa,
  ResultadoConfirmarEvidencia,
  ResultadoCorregirActa,
  ResultadoRegistrarActa,
} from '../domain/ports/actas-repository';

function cliente() {
  const c = obtenerClienteSupabase();
  if (!c) return null;
  return c;
}

function mapActa(row: any, votos: any[]): Acta {
  return {
    id: row.id,
    jrvId: row.jrv_id,
    recintoId: row.recinto_id ?? null,
    dignidad: row.dignidad as Dignidad,
    version: row.version,
    estado: row.estado as Acta['estado'],
    capturedAt: row.captured_at,
    lat: row.lat,
    lon: row.lon,
    accuracy: row.accuracy,
    gpsTimestamp: row.captured_at,
    distanciaRecintoM: row.distancia_recinto_m,
    calidadFoto: row.calidad_foto as CalidadFoto,
    fotoPath: row.foto_path,
    sufragantes: row.sufragantes,
    blancos: row.blancos,
    nulos: row.nulos,
    votos: (votos ?? []).map((v: any) => ({ organizacionId: v.organizacion_id, votos: v.votos })),
    capturadoPor: row.capturado_por ?? null,
  };
}

export class SupabaseActasRepository implements ActasRepository {
  async listarMesasDelVeedor(veedorId: string): Promise<Resultado<MesaVeedor[], string>> {
    const c = cliente();
    if (!c) return err('Supabase no configurado.');
    const { data, error } = await c
      .from('asignaciones_veedor')
      .select('jrv_id, jrv:jrv_id(id, numero, recinto:recinto_id(id, nombre, lat, lon))')
      .eq('veedor_id', veedorId)
      .is('hasta', null);
    if (error) return err(error.message);
    const mesas: MesaVeedor[] = (data ?? []).map((r: any) => ({
      jrvId: r.jrv_id,
      numero: r.jrv?.numero ?? 0,
      recinto: {
        id: r.jrv?.recinto?.id ?? '',
        nombre: r.jrv?.recinto?.nombre ?? '',
        lat: r.jrv?.recinto?.lat ?? 0,
        lon: r.jrv?.recinto?.lon ?? 0,
      },
    }));
    return ok(mesas);
  }

  async obtenerRecintoDeJrv(jrvId: string): Promise<Resultado<RecintoCoords, string>> {
    const c = cliente();
    if (!c) return err('Supabase no configurado.');
    const { data, error } = await c
      .from('jrv')
      .select('recinto_id, recinto:recinto_id(id, nombre, lat, lon)')
      .eq('id', jrvId)
      .single();
    if (error || !data) return err(error?.message ?? 'JRV no encontrada.');
    const r = (data as any).recinto;
    return ok({ id: r.id, nombre: r.nombre, lat: r.lat, lon: r.lon });
  }

  async registrarActa(datos: DatosRegistrarActa): Promise<Resultado<ResultadoRegistrarActa, string>> {
    const c = cliente();
    if (!c) return err('Supabase no configurado.');
    const { data, error } = await c.rpc('registrar_acta', {
      p_operation_id: datos.operationId,
      p_jrv_id: datos.jrvId,
      p_dignidad: datos.dignidad,
      p_votos: datos.votos.map((v) => ({ organizacion_id: v.organizacionId, votos: v.votos })),
      p_blancos: datos.blancos,
      p_nulos: datos.nulos,
      p_sufragantes: datos.sufragantes,
      p_captured_at: datos.capturedAt,
      p_lat: datos.lat,
      p_lon: datos.lon,
      p_accuracy: datos.accuracy,
      p_calidad_foto: datos.calidadFoto,
      p_distancia_recinto_m: datos.distanciaRecintoM,
    });
    if (error) return err(error.message);
    const r = data as any;
    if (r?.status && r.status !== 'ACEPTADO') return err(r.detalle ?? r.status);
    return ok({
      actaId: r.acta_id,
      estado: (r.estado ?? 'EVIDENCIA_PENDIENTE') as Acta['estado'],
      idempotent: Boolean(r.idempotent),
    });
  }

  async confirmarEvidencia(datos: DatosConfirmarEvidencia): Promise<Resultado<ResultadoConfirmarEvidencia, string>> {
    const c = cliente();
    if (!c) return err('Supabase no configurado.');
    const { data, error } = await c.rpc('confirmar_evidencia', {
      p_operation_id: datos.operationId,
      p_foto_path: datos.fotoPath,
    });
    if (error) return err(error.message);
    const r = data as any;
    if (r?.status && r.status !== 'ACEPTADO') return err(r.detalle ?? r.status);
    return ok({
      actaId: r.acta_id,
      estado: (r.estado ?? 'EVIDENCIA_RESPALDADA') as Acta['estado'],
      idempotent: Boolean(r.idempotent),
    });
  }

  async corregirActa(datos: DatosCorregirActa): Promise<Resultado<ResultadoCorregirActa, string>> {
    const c = cliente();
    if (!c) return err('Supabase no configurado.');
    const { data, error } = await c.rpc('corregir_acta', {
      p_operation_id: datos.operationId,
      p_acta_id: datos.actaId,
      p_expected_version: datos.expectedVersion,
      p_nuevos_valores: {
        votos: datos.nuevosValores.votos.map((v) => ({ organizacion_id: v.organizacionId, votos: v.votos })),
        blancos: datos.nuevosValores.blancos,
        nulos: datos.nuevosValores.nulos,
        sufragantes: datos.nuevosValores.sufragantes,
      },
      p_motivo: datos.motivo,
    });
    if (error) return err(error.message);
    const r = data as any;
    if (r?.status === 'CONFLICTO_VERSION') {
      return ok({
        actaId: r.acta_id,
        versionAnterior: r.expected_version ?? 0,
        versionNueva: r.current_version ?? 0,
        estado: 'CONFLICTO_VERSION',
        conflicto: true,
        valoresActuales: r.valores_actuales,
      });
    }
    if (r?.status && r.status !== 'ACEPTADO') return err(r.detalle ?? r.status);
    return ok({
      actaId: r.acta_id,
      versionAnterior: r.version_anterior ?? 0,
      versionNueva: r.version_nueva ?? 0,
      estado: (r.estado ?? 'EVIDENCIA_PENDIENTE') as Acta['estado'],
      conflicto: false,
    });
  }

  async obtenerActa(actaId: string): Promise<Resultado<Acta, string>> {
    const c = cliente();
    if (!c) return err('Supabase no configurado.');
    const { data: acta, error } = await c.from('actas').select('*').eq('id', actaId).single();
    if (error || !acta) return err(error?.message ?? 'Acta no encontrada.');
    const { data: votos } = await c.from('votos_acta').select('*').eq('acta_id', actaId);
    return ok(mapActa(acta, votos ?? []));
  }

  async listarActasPorJrv(jrvId: string, dignidad?: Dignidad): Promise<Resultado<Acta[], string>> {
    const c = cliente();
    if (!c) return err('Supabase no configurado.');
    let q = c.from('actas').select('*').eq('jrv_id', jrvId);
    if (dignidad) q = q.eq('dignidad', dignidad);
    const { data, error } = await q;
    if (error) return err(error.message);
    const actas: Acta[] = [];
    for (const a of data ?? []) {
      const { data: votos } = await c.from('votos_acta').select('*').eq('acta_id', a.id);
      actas.push(mapActa(a, votos ?? []));
    }
    return ok(actas);
  }

  async listarOrganizaciones(): Promise<Resultado<{ id: string; nombre: string; color: string }[], string>> {
    const c = cliente();
    if (!c) return err('Supabase no configurado.');
    const { data, error } = await c.from('organizaciones').select('id, nombre, color').order('nombre');
    if (error) return err(error.message);
    return ok((data ?? []).map((o: any) => ({ id: o.id, nombre: o.nombre, color: o.color })));
  }

  async subirFoto(ruta: string, uriLocal: string): Promise<Resultado<string, string>> {
    const c = cliente();
    if (!c) return err('Supabase no configurado.');
    try {
      const resp = await fetch(uriLocal);
      const blob = await resp.blob();
      const { error } = await c.storage.from('actas').upload(ruta, blob, { upsert: true, contentType: 'image/jpeg' });
      if (error) return err(error.message);
      return ok(ruta);
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Error al subir foto.');
    }
  }
}