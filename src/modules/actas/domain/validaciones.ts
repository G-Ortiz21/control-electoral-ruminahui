import { err, ok, type Resultado } from '@/shared/domain/resultado';
import { MAX_INTENTOS_FOTO, RADIO_MAX_M, PRECISION_MAX_M, UMBRAL_NITIDEZ, UMBRAL_LUMINANCIA_MIN } from '@/shared/domain/constantes';
import type { CalidadFoto } from './entities/acta';

/**
 * Reglas puras del dominio de actas (RNF-02: sin React/Expo/Supabase/SQLite).
 */

function esEnteroNoNegativo(valor: unknown): boolean {
  if (typeof valor === 'number') {
    return Number.isInteger(valor) && valor >= 0 && !Number.isNaN(valor);
  }
  if (typeof valor === 'string') {
    const t = valor.trim();
    if (t === '') return false;
    // sin decimales: solo dígitos
    if (!/^\d+$/.test(t)) return false;
    const n = Number(t);
    return Number.isInteger(n) && n >= 0;
  }
  return false;
}

function aNumeroEntero(valor: unknown): number {
  if (typeof valor === 'number') return valor;
  return Number(String(valor).trim());
}

function extraerValores(...args: unknown[]): { votos: unknown[]; blancos: unknown; nulos: unknown; sufragantes: unknown } | null {
  // Caso 1: un objeto
  if (args.length === 1 && args[0] !== null && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    const o = args[0] as Record<string, unknown>;
    const votos =
      (Array.isArray(o.votos) && o.votos) ||
      (Array.isArray(o.organizaciones) && o.organizaciones) ||
      (Array.isArray(o.orgs) && o.orgs) ||
      (Array.isArray(o.organizations) && o.organizations) ||
      (Array.isArray(o.valores) && o.valores) ||
      null;
    if (votos) {
      return { votos, blancos: o.blancos, nulos: o.nulos, sufragantes: o.sufragantes };
    }
    // objeto con campos org1..org5
    if (o.blancos !== undefined) {
      return { votos: [o.org1, o.org2, o.org3, o.org4, o.org5], blancos: o.blancos, nulos: o.nulos, sufragantes: o.sufragantes };
    }
    return null;
  }
  // Caso 2: primer arg es arreglo
  if (Array.isArray(args[0]) && args.length >= 4) {
    return { votos: args[0] as unknown[], blancos: args[1], nulos: args[2], sufragantes: args[3] };
  }
  // Caso 3: 8+ números posicionales (5 orgs + blancos + nulos + sufragantes)
  if (args.length >= 8 && args.slice(0, 8).every((v) => typeof v === 'number' || typeof v === 'string')) {
    const nums = args.slice(0, 8);
    // heurística: si los primeros 5 son enteros y los últimos 3 también, tratar como orgs
    if (nums.slice(5).every(esEnteroNoNegativo)) {
      return { votos: nums.slice(0, 5), blancos: nums[5], nulos: nums[6], sufragantes: nums[7] };
    }
  }
  // Caso 4: 4 números posicionales (votos ya sumados?) no válido; intentar votos como args[0..4]
  if (args.length >= 7) {
    // org1..org5, blancos, nulos, sufragantes
    const maybe = args.slice(0, 8);
    if (maybe.length >= 8 && maybe.slice(5, 8).every(esEnteroNoNegativo)) {
      return { votos: maybe.slice(0, 5), blancos: maybe[5], nulos: maybe[6], sufragantes: maybe[7] };
    }
  }
  return null;
}

export function validarCuadratura(...args: unknown[]): Resultado<void, string> {
  const extraido = extraerValores(...args);
  if (!extraido) return err('Datos de cuadratura inválidos.');

  const { votos, blancos, nulos, sufragantes } = extraido;

  if (!Array.isArray(votos) || votos.length !== 5) {
    return err('Se exigen votos de 5 organizaciones.');
  }
  for (const v of votos) {
    if (!esEnteroNoNegativo(v)) return err('Los votos deben ser enteros no negativos.');
  }
  if (!esEnteroNoNegativo(blancos)) return err('Los blancos deben ser un entero no negativo.');
  if (!esEnteroNoNegativo(nulos)) return err('Los nulos deben ser un entero no negativo.');
  if (!esEnteroNoNegativo(sufragantes)) return err('Los sufragantes deben ser un entero no negativo.');

  const sumaVotos = votos.reduce((acc: number, v) => acc + aNumeroEntero(v), 0);
  const b = aNumeroEntero(blancos);
  const n = aNumeroEntero(nulos);
  const s = aNumeroEntero(sufragantes);

  if (sumaVotos + b + n !== s) {
    return err('La suma de los siete valores no coincide con los sufragantes.');
  }
  return ok(undefined);
}

// ---------------- GPS ----------------

export interface LecturaGps {
  lat: number | null;
  lon: number | null;
  accuracy: number | null;
  timestamp?: string | null;
}

export interface CoordsRecinto {
  lat: number;
  lon: number;
}

export interface ResultadoGps {
  sinLecturaValida: boolean;
  distanciaM: number | null;
  precisionOk: boolean;
  dentroRadio: boolean;
  advertencias: string[];
  estado: 'BORRADOR' | 'ADVERTIR' | 'OK';
  bloquear: false;
}

function esNumeroValido(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v);
}

function extraerGps(...args: unknown[]): { lectura: LecturaGps; recinto: CoordsRecinto } | null {
  // Caso objeto + objeto
  if (args.length >= 2 && args[0] !== null && typeof args[0] === 'object' && !Array.isArray(args[0]) &&
      args[1] !== null && typeof args[1] === 'object' && !Array.isArray(args[1])) {
    const a = args[0] as Record<string, unknown>;
    const b = args[1] as Record<string, unknown>;
    // lectura podría tener lat/lon/accuracy o latitude/longitude
    const lat = (a.lat ?? a.latitude ?? a.latitud) as number | null;
    const lon = (a.lon ?? a.longitude ?? a.longitud) as number | null;
    const accuracy = (a.accuracy ?? a.precision ?? a.acc) as number | null;
    const timestamp = (a.timestamp ?? a.time ?? a.momento) as string | null;
    const rlat = (b.lat ?? b.latitude ?? b.latitud) as number;
    const rlon = (b.lon ?? b.longitude ?? b.longitud) as number;
    if (rlat !== undefined && rlon !== undefined) {
      return { lectura: { lat, lon, accuracy, timestamp }, recinto: { lat: Number(rlat), lon: Number(rlon) } };
    }
  }
  // Caso posicional: lat, lon, accuracy, recintoLat, recintoLon
  if (args.length >= 5 && esNumeroValido(args[0]) && esNumeroValido(args[1])) {
    // accuracy puede ser null
    const acc = args[2];
    const rlat = args[3];
    const rlon = args[4];
    if (esNumeroValido(rlat) && esNumeroValido(rlon)) {
      return {
        lectura: { lat: args[0] as number, lon: args[1] as number, accuracy: acc === null ? null : Number(acc), timestamp: (args[5] as string) ?? null },
        recinto: { lat: rlat as number, lon: rlon as number },
      };
    }
  }
  // Caso posicional: lat, lon, accuracy, recinto(obj)
  if (args.length >= 4 && esNumeroValido(args[0]) && esNumeroValido(args[1]) && args[3] !== null && typeof args[3] === 'object') {
    const b = args[3] as Record<string, unknown>;
    const rlat = (b.lat ?? b.latitude ?? b.latitud) as number;
    const rlon = (b.lon ?? b.longitude ?? b.longitud) as number;
    if (esNumeroValido(rlat) && esNumeroValido(rlon)) {
      return {
        lectura: { lat: args[0] as number, lon: args[1] as number, accuracy: args[2] === null ? null : Number(args[2]), timestamp: (args[4] as string) ?? null },
        recinto: { lat: rlat, lon: rlon },
      };
    }
  }
  return null;
}

export function evaluarGps(...args: unknown[]): ResultadoGps {
  const extraido = extraerGps(...args);
  // Si no se pudo extraer, intentar sin recinto? No, recinto requerido.
  const lectura: LecturaGps = extraido?.lectura ?? { lat: null, lon: null, accuracy: null, timestamp: null };
  const recinto: CoordsRecinto | null = extraido?.recinto ?? null;

  const sinLecturaValida =
    !esNumeroValido(lectura.lat) ||
    !esNumeroValido(lectura.lon) ||
    !esNumeroValido(lectura.accuracy) ||
    lectura.accuracy === null ||
    lectura.accuracy < 0;

  if (sinLecturaValida) {
    return {
      sinLecturaValida: true,
      distanciaM: null,
      precisionOk: false,
      dentroRadio: false,
      advertencias: ['Sin lectura GPS válida: el acta queda en borrador.'],
      estado: 'BORRADOR',
      bloquear: false,
    };
  }

  const lat = lectura.lat as number;
  const lon = lectura.lon as number;
  const accuracy = lectura.accuracy as number;

  let distanciaM: number | null = null;
  if (recinto) {
    distanciaM = calcularDistancia(lat, lon, recinto.lat, recinto.lon);
  }

  const precisionOk = accuracy <= PRECISION_MAX_M;
  const dentroRadio = distanciaM === null ? true : distanciaM <= RADIO_MAX_M;

  const advertencias: string[] = [];
  if (!precisionOk) advertencias.push(`Precisión GPS insuficiente (${accuracy} m).`);
  if (!dentroRadio && distanciaM !== null) advertencias.push(`Fuera del radio permitido (${Math.round(distanciaM)} m).`);

  const estado: 'ADVERTIR' | 'OK' = precisionOk && dentroRadio ? 'OK' : 'ADVERTIR';

  return {
    sinLecturaValida: false,
    distanciaM,
    precisionOk,
    dentroRadio,
    advertencias,
    estado,
    bloquear: false,
  };
}

// ---------------- Distancia ----------------

export function calcularDistancia(...args: unknown[]): number {
  let lat1: number, lon1: number, lat2: number, lon2: number;
  if (args.length >= 2 && args[0] !== null && typeof args[0] === 'object' && args[1] !== null && typeof args[1] === 'object') {
    const a = args[0] as Record<string, unknown>;
    const b = args[1] as Record<string, unknown>;
    lat1 = Number(a.lat ?? a.latitude ?? a.latitud);
    lon1 = Number(a.lon ?? a.longitude ?? a.longitud);
    lat2 = Number(b.lat ?? b.latitude ?? b.latitud);
    lon2 = Number(b.lon ?? b.longitude ?? b.longitud);
  } else if (args.length >= 4) {
    lat1 = Number(args[0]);
    lon1 = Number(args[1]);
    lat2 = Number(args[2]);
    lon2 = Number(args[3]);
  } else {
    return 0;
  }

  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---------------- Nitidez ----------------

export function luminanciaMedia(luminancias: unknown): number {
  if (!Array.isArray(luminancias) || luminancias.length === 0) return 0;
  const nums = luminancias.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function calcularNitidez(luminancias: unknown, ancho?: number, alto?: number): number {
  if (!Array.isArray(luminancias) || luminancias.length === 0) return 0;
  const vals = luminancias.map((v) => Number(v));
  const n = vals.length;

  // 2D si se dan dimensiones válidas
  if (ancho && alto && ancho > 2 && alto > 2 && ancho * alto === n) {
    const lap: number[] = [];
    for (let y = 1; y < alto - 1; y++) {
      for (let x = 1; x < ancho - 1; x++) {
        const idx = y * ancho + x;
        const center = vals[idx];
        const up = vals[idx - ancho];
        const down = vals[idx + ancho];
        const left = vals[idx - 1];
        const right = vals[idx + 1];
        lap.push(4 * center - (up + down + left + right));
      }
    }
    return varianza(lap);
  }

  // Rama 1D: solo para pruebas sintéticas; la foto real debe pasar ancho/alto
  // para usar la Laplacian 2D (DI-09).
  if (n < 3) return 0;
  const lap: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    lap.push(vals[i - 1] - 2 * vals[i] + vals[i + 1]);
  }
  return varianza(lap);
}

function varianza(valores: number[]): number {
  if (valores.length === 0) return 0;
  const mean = valores.reduce((a, b) => a + b, 0) / valores.length;
  const sq = valores.reduce((a, b) => a + (b - mean) * (b - mean), 0);
  return sq / valores.length;
}

export function esFotoNitida(varianzaLap: number, media: number): boolean {
  return varianzaLap >= UMBRAL_NITIDEZ && media >= UMBRAL_LUMINANCIA_MIN;
}

/**
 * Resultado de analizar UNA foto concreta (DI-09). `analizado: false` significa que
 * no hay medición válida: la UI no debe mostrar «Foto nítida» en ese caso.
 */
export type ResultadoAnalisisFoto =
  | { analizado: true; nitida: boolean; varianza: number; luminancia: number }
  | { analizado: false; motivo: 'IMAGEN_NO_PROCESABLE' };

/**
 * Analiza la imagen reducida ya decodificada. Exige las dimensiones reales del
 * bitmap para ejecutar la Laplacian 2D; sin ellas `calcularNitidez` caía en la
 * rama 1D sobre el arreglo plano (causa del falso «Foto nítida»).
 */
export function analizarNitidez(luminancias: unknown, ancho: number, alto: number): ResultadoAnalisisFoto {
  const noProcesable: ResultadoAnalisisFoto = { analizado: false, motivo: 'IMAGEN_NO_PROCESABLE' };
  if (
    !Array.isArray(luminancias) ||
    luminancias.length === 0 ||
    !Number.isInteger(ancho) ||
    !Number.isInteger(alto) ||
    ancho <= 2 ||
    alto <= 2 ||
    ancho * alto !== luminancias.length
  ) {
    return noProcesable;
  }

  const valores = luminancias.map((v) => Number(v));
  if (valores.some((v) => !Number.isFinite(v))) return noProcesable;

  const varianza = calcularNitidez(valores, ancho, alto);
  const luminancia = luminanciaMedia(valores);
  if (!Number.isFinite(varianza) || !Number.isFinite(luminancia)) return noProcesable;

  return {
    analizado: true,
    nitida: esFotoNitida(varianza, luminancia),
    varianza,
    luminancia,
  };
}

/** Estado de la validación de la foto para el acta en curso (DI-08). */
export interface EstadoValidacionFoto {
  /** Fallos consecutivos: se reinicia en la primera foto nítida. */
  intentosFallidos: number;
  calidad: CalidadFoto;
  /** Resultado de la última foto analizada; null mientras no haya una medición vigente. */
  resultado: ResultadoAnalisisFoto | null;
}

export function estadoInicialValidacionFoto(): EstadoValidacionFoto {
  return { intentosFallidos: 0, calidad: 'NORMAL', resultado: null };
}

/** Descarta el resultado anterior al repetir, sin perder los fallos consecutivos. */
export function limpiarResultadoFoto(estado: EstadoValidacionFoto): EstadoValidacionFoto {
  return { ...estado, resultado: null };
}

/**
 * Registra el resultado de un intento. Cuenta como fallo tanto el desenfoque como
 * la imposibilidad de procesar la foto: en ambos casos no hay evidencia validada.
 * Tras MAX_INTENTOS_FOTO fallos consecutivos se permite conservarla como dudosa.
 */
export function registrarResultadoFoto(
  estado: EstadoValidacionFoto,
  resultado: ResultadoAnalisisFoto,
): EstadoValidacionFoto {
  if (resultado.analizado && resultado.nitida) {
    return { intentosFallidos: 0, calidad: 'NORMAL', resultado };
  }

  const intentosFallidos = Math.min(MAX_INTENTOS_FOTO, estado.intentosFallidos + 1);
  return {
    intentosFallidos,
    calidad: intentosFallidos >= MAX_INTENTOS_FOTO ? 'CALIDAD_DUDOSA' : estado.calidad,
    resultado,
  };
}

/** Solo se puede usar la foto si hay una medición nítida vigente o ya es dudosa. */
export function puedeUsarFoto(estado: EstadoValidacionFoto): boolean {
  if (estado.calidad === 'CALIDAD_DUDOSA') return true;
  return estado.resultado?.analizado === true && estado.resultado.nitida;
}

// re-export constantes por conveniencia
export { UMBRAL_NITIDEZ, UMBRAL_LUMINANCIA_MIN } from '@/shared/domain/constantes';