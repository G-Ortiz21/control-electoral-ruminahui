import type { Resultado } from '@/shared/domain/resultado';
import type {
  Acta,
  CalidadFoto,
  Dignidad,
  MesaVeedor,
  RecintoCoords,
  VotoActa,
} from '../entities/acta';

export interface DatosRegistrarActa {
  operationId: string;
  jrvId: string;
  dignidad: Dignidad;
  votos: { organizacionId: string; votos: number }[];
  blancos: number;
  nulos: number;
  sufragantes: number;
  capturedAt: string;
  lat: number;
  lon: number;
  accuracy: number;
  calidadFoto: CalidadFoto;
  distanciaRecintoM: number;
}

export interface ResultadoRegistrarActa {
  actaId: string;
  estado: Acta['estado'];
  idempotent: boolean;
}

export interface DatosConfirmarEvidencia {
  operationId: string;
  fotoPath: string;
}

export interface ResultadoConfirmarEvidencia {
  actaId: string;
  estado: Acta['estado'];
  idempotent: boolean;
}

export interface DatosCorregirActa {
  operationId: string;
  actaId: string;
  expectedVersion: number;
  nuevosValores: {
    votos: { organizacionId: string; votos: number }[];
    blancos: number;
    nulos: number;
    sufragantes: number;
  };
  motivo: string;
}

export interface ResultadoCorregirActa {
  actaId: string;
  versionAnterior: number;
  versionNueva: number;
  estado: Acta['estado'];
  conflicto: boolean;
  valoresActuales?: { sufragantes: number; blancos: number; nulos: number; estado: string };
}

export interface ActasRepository {
  listarMesasDelVeedor(veedorId: string): Promise<Resultado<MesaVeedor[], string>>;
  obtenerRecintoDeJrv(jrvId: string): Promise<Resultado<RecintoCoords, string>>;
  registrarActa(datos: DatosRegistrarActa): Promise<Resultado<ResultadoRegistrarActa, string>>;
  confirmarEvidencia(datos: DatosConfirmarEvidencia): Promise<Resultado<ResultadoConfirmarEvidencia, string>>;
  corregirActa(datos: DatosCorregirActa): Promise<Resultado<ResultadoCorregirActa, string>>;
  obtenerActa(actaId: string): Promise<Resultado<Acta, string>>;
  listarActasPorJrv(jrvId: string, dignidad?: Dignidad): Promise<Resultado<Acta[], string>>;
  listarOrganizaciones(): Promise<Resultado<{ id: string; nombre: string; color: string }[], string>>;
  subirFoto(ruta: string, uriLocal: string): Promise<Resultado<string, string>>;
}