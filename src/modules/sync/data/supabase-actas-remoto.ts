import type { ActasRepository } from '@/modules/actas/domain/ports/actas-repository';
import type { ClienteActasRemoto } from '../domain';

export class SupabaseActasRemoto implements ClienteActasRemoto {
  constructor(private readonly actas: ActasRepository) {}

  async registrarActa(payload: unknown): Promise<any> {
    const datos = payload as any;
    const res = await this.actas.registrarActa(datos);
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, valor: { status: 'ACEPTADO', actaId: res.valor.actaId, estado: res.valor.estado, idempotent: res.valor.idempotent } };
  }

  async confirmarEvidencia(operationId: string, fotoPath: string): Promise<any> {
    const res = await this.actas.confirmarEvidencia({ operationId, fotoPath });
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, valor: { status: 'ACEPTADO', actaId: res.valor.actaId, estado: res.valor.estado, idempotent: res.valor.idempotent } };
  }

  async corregirActa(payload: unknown): Promise<any> {
    const datos = payload as any;
    const res = await this.actas.corregirActa(datos);
    if (!res.ok) return { ok: false, error: res.error };
    if (res.valor.conflicto) {
      return { ok: true, valor: { status: 'CONFLICTO_VERSION', detalle: 'Conflicto de versión', expectedVersion: res.valor.versionAnterior, currentVersion: res.valor.versionNueva, valoresActuales: res.valor.valoresActuales } };
    }
    return { ok: true, valor: { status: 'ACEPTADO', actaId: res.valor.actaId, estado: res.valor.estado } };
  }

  async subirFoto(ruta: string, uriLocal: string): Promise<any> {
    return this.actas.subirFoto(ruta, uriLocal);
  }
}

