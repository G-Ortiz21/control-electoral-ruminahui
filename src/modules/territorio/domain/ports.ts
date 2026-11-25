import type { Resultado } from '@/shared/domain/resultado';
import type { AsignacionVeedor, JrvRecinto, ResultadoReemplazo, VeedorDisponible } from './territorio';
import type { Acta, Dignidad } from '@/modules/actas/domain';

export interface DatosRecinto {
  canton: string;
  parroquia: string;
  nombre: string;
  lat: number;
  lon: number;
  jrvs: number;
}

export interface RecintoResumen {
  id: string;
  canton: string;
  parroquia: string;
  nombre: string;
  lat: number;
  lon: number;
  totalJrv: number;
  /** Responsable vigente (hasta IS NULL), si lo hay. Solo datos existentes. */
  coordinadorId: string | null;
  coordinadorNombres: string | null;
  coordinadorApellidos: string | null;
}

export interface TerritorioRepository {
  obtenerRecintoDelCoordinador(coordinadorId: string): Promise<Resultado<string, string>>;
  listarJrvDelRecinto(recintoId: string): Promise<Resultado<JrvRecinto[], string>>;
  listarVeedoresDelRecinto(recintoId: string, coordinadorId: string): Promise<Resultado<VeedorDisponible[], string>>;
  asignarVeedor(jrvId: string, veedorId: string, motivo: string): Promise<Resultado<{ status: string }, string>>;
  reemplazarVeedor(jrvId: string, nuevoVeedorId: string, motivo: string): Promise<Resultado<ResultadoReemplazo, string>>;
  historialAsignaciones(jrvId: string): Promise<Resultado<AsignacionVeedor[], string>>;
  listarActasDelRecinto(recintoId: string, dignidad?: Dignidad): Promise<Resultado<Acta[], string>>;
  listarRecintos(): Promise<Resultado<RecintoResumen[], string>>;
  crearRecinto(datos: DatosRecinto): Promise<Resultado<string, string>>;
  designarCoordinadorRecinto(recintoId: string, coordinadorId: string, motivo: string): Promise<Resultado<{ status: string }, string>>;
  avancePorRecinto(): Promise<Resultado<any[], string>>;
  resultadosPorRecinto(dignidad: Dignidad): Promise<Resultado<any[], string>>;
}
