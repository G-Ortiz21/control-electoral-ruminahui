import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import jpeg from 'jpeg-js';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { contenedor } from '@/composition';
import { useActaBorradorStore } from '@/modules/actas/presentation/acta-borrador-store';
import { MAX_INTENTOS_FOTO } from '@/shared/domain/constantes';
import {
  analizarNitidez,
  evaluarGps,
  estadoInicialValidacionFoto,
  limpiarResultadoFoto,
  puedeUsarFoto,
  registrarResultadoFoto,
  type ResultadoAnalisisFoto,
} from '@/modules/actas/domain';
import { BotonPrincipal } from '@/shared/ui/boton-principal';
import { CabeceraRol } from '@/shared/ui/cabecera-rol';
import { FondoSuave } from '@/shared/ui/fondo-suave';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
import { TarjetaVidrio } from '@/shared/ui/tarjeta-vidrio';
import { guardarActaLocalYOutbox } from '@/modules/sync/data';

function generarUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function MarcosEsquina() {
  const esquina = 'absolute w-8 h-8 border-cian-decorativo';
  return (
    <View className="absolute inset-6" pointerEvents="none">
      <View className={`${esquina} top-0 left-0 border-t-2 border-l-2 rounded-tl-md`} />
      <View className={`${esquina} top-0 right-0 border-t-2 border-r-2 rounded-tr-md`} />
      <View className={`${esquina} bottom-0 left-0 border-b-2 border-l-2 rounded-bl-md`} />
      <View className={`${esquina} bottom-0 right-0 border-b-2 border-r-2 rounded-br-md`} />
    </View>
  );
}

/** Etiqueta visual derivada del estado real; nunca declara nitidez sin análisis. */
function EstadoCaptura({ estado }: { estado: 'esperando' | 'analizando' | 'aceptada' | 'rechazada' | 'dudosa' }) {
  const config = {
    esperando: { texto: 'Esperando fotografía', clase: 'bg-foreground/10 text-texto-secundario' },
    analizando: { texto: 'Analizando fotografía…', clase: 'bg-primary/10 text-primary' },
    aceptada: { texto: 'Fotografía aceptada', clase: 'bg-success/15 text-success' },
    rechazada: { texto: 'Fotografía rechazada', clase: 'bg-error/15 text-error' },
    dudosa: { texto: 'Calidad dudosa', clase: 'bg-warning/15 text-warning' },
  }[estado];
  return (
    <View className={`self-start rounded-full px-3 py-1 ${config.clase}`}>
      <Text className="text-xs font-semibold">{config.texto}</Text>
    </View>
  );
}

function MedidorNitidez({
  resultado,
  intentosFallidos,
}: {
  resultado: ResultadoAnalisisFoto | null;
  intentosFallidos: number;
}) {
  const analizado = resultado?.analizado === true;
  const nitida = analizado && resultado.nitida;
  const varianza = analizado ? resultado.varianza : 0;
  const pct = Math.max(0, Math.min(100, (varianza / 300) * 100));
  const activos = Math.round((pct / 100) * 6);
  const colorBarra = !resultado || !resultado.analizado ? 'bg-foreground/20' : nitida ? 'bg-success' : 'bg-error';
  const colorTexto = !resultado || !resultado.analizado
    ? 'text-texto-secundario'
    : nitida ? 'text-success' : 'text-error';
  const mensaje = !resultado || !resultado.analizado
    ? 'No se pudo analizar la foto, repite la captura'
    : nitida
      ? 'Foto nítida'
      : 'Foto borrosa, repite la captura';
  return (
    <View className="mt-3">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-sm text-texto-secundario">Nitidez</Text>
        <Text className="text-base font-mono text-foreground">{analizado ? Math.round(varianza) : '—'}</Text>
      </View>
      <View className="flex-row gap-1" accessibilityRole="progressbar" accessibilityValue={{ now: Math.round(pct), min: 0, max: 100 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} className={`h-2 flex-1 rounded-full ${i < activos ? colorBarra : 'bg-foreground/10'}`} />
        ))}
      </View>
      <Text className={`mt-2 text-sm font-semibold ${colorTexto}`}>{mensaje}</Text>
      <View className="mt-2 flex-row flex-wrap gap-x-4">
        <Text className="text-xs text-texto-secundario">
          Luminancia: {analizado ? resultado.luminancia.toFixed(1) : '—'}
        </Text>
        <Text className="text-xs text-texto-secundario">
          Intentos fallidos: {intentosFallidos} de {MAX_INTENTOS_FOTO}
        </Text>
      </View>
    </View>
  );
}

export default function CapturaFotoScreen() {
  const router = useRouter();
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const borrador = useActaBorradorStore((s) => s.borrador);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  // Una sola fuente de verdad: foto, intentos y calidad siempre corresponden
  // al mismo análisis. Así no se reutiliza el resultado de una foto anterior.
  const [validacion, setValidacion] = useState(estadoInicialValidacionFoto);
  const [procesando, setProcesando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!permission) {
    return <View className="flex-1 bg-background" />;
  }
  if (!permission.granted) {
    return (
      <FondoSuave>
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <LottieFeedback tipo="error" mensaje="Se necesita permiso de cámara." />
          <BotonPrincipal titulo="Conceder permiso" rol="VEEDOR" onPress={requestPermission} />
        </View>
      </FondoSuave>
    );
  }

  async function capturar() {
    if (!cameraRef.current || procesando) return;
    setProcesando(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });

      const manip = await ImageManipulator.manipulateAsync(photo.uri, [{ resize: { width: 480 } }], {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      const base64 = await FileSystem.readAsStringAsync(manip.uri, { encoding: FileSystem.EncodingType.Base64 });
      const bytes = base64ToBytes(base64);
      const decoded = jpeg.decode(bytes, { useTArray: true });
      const luminancias: number[] = [];
      for (let i = 0; i < decoded.data.length; i += 4) {
        const r = decoded.data[i];
        const g = decoded.data[i + 1];
        const b = decoded.data[i + 2];
        luminancias.push(0.299 * r + 0.587 * g + 0.114 * b);
      }

      // Se pasan las dimensiones reales del bitmap para usar la Laplacian 2D.
      const resultado = analizarNitidez(luminancias, decoded.width, decoded.height);
      setValidacion((v) => registrarResultadoFoto(v, resultado));
      // La foto se publica solo cuando su resultado ya está calculado: nunca
      // se muestra una imagen nueva con la medición de la anterior.
      setPhotoUri(photo.uri);
    } catch {
      setValidacion((v) => registrarResultadoFoto(v, { analizado: false, motivo: 'IMAGEN_NO_PROCESABLE' }));
      setPhotoUri(null);
      setError('No se pudo analizar la foto. Toma otra fotografía.');
    } finally {
      setProcesando(false);
    }
  }

  function repetir() {
    setPhotoUri(null);
    setError(null);
    // Los fallos consecutivos se conservan; solo se descarta el resultado de la
    // foto anterior para que no pueda aplicarse a la nueva.
    setValidacion((v) => limpiarResultadoFoto(v));
  }

  async function usarFoto() {
    if (!photoUri || !borrador || procesando) return;
    if (!puedeUsarFoto(validacion)) {
      setError('La foto aún no es nítida. Repite la captura o continúa tras tres intentos fallidos.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      let loc: Location.LocationObject | null = null;
      if (perm.granted) {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      }

      const recintoRes = await contenedor.actas.obtenerRecintoDeJrv(borrador.jrvId);
      const recintoId = recintoRes.ok ? recintoRes.valor.id : 'x';

      const gps = evaluarGps(
        loc?.coords?.latitude ?? null,
        loc?.coords?.longitude ?? null,
        loc?.coords?.accuracy ?? null,
        borrador.recintoLat,
        borrador.recintoLon,
      );

      if (gps.sinLecturaValida) {
        setMensaje('Sin GPS válido: el acta queda en borrador, no enviada.');
        setEnviando(false);
        return;
      }

      const operationId = generarUuid();
      const capturedAt = loc ? new Date(loc.timestamp).toISOString() : new Date().toISOString();

      const localPath = `${FileSystem.documentDirectory ?? ''}actas/${operationId}.jpg`;
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory ?? ''}actas`, { intermediates: true });
      await FileSystem.copyAsync({ from: photoUri, to: localPath });

      const path = `${recintoId}/${borrador.jrvId}/${borrador.dignidad}/${operationId}.jpg`;

      const payload = {
        operationId,
        jrvId: borrador.jrvId,
        dignidad: borrador.dignidad,
        votos: borrador.votos.map((v) => ({ organizacionId: v.organizacionId, votos: v.votos })),
        blancos: borrador.blancos,
        nulos: borrador.nulos,
        sufragantes: borrador.sufragantes,
        capturedAt,
        lat: loc!.coords.latitude,
        lon: loc!.coords.longitude,
        accuracy: loc!.coords.accuracy ?? 0,
        calidadFoto: validacion.calidad,
        distanciaRecintoM: gps.distanciaM ?? 0,
      };

      await guardarActaLocalYOutbox({
        operationId,
        jrvId: borrador.jrvId,
        recintoId,
        dignidad: borrador.dignidad as any,
        payload,
        fotoLocalPath: localPath,
        fotoRemotaPath: path,
        creadoEn: capturedAt,
      });

      useActaBorradorStore.getState().limpiar();
      setMensaje('Guardada localmente');
      contenedor.sync.motor.sincronizarTodo().catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar el acta.');
    } finally {
      setEnviando(false);
    }
  }

  const dignidadTexto = borrador?.dignidad === 'PREFECTURA' ? 'Prefectura' : 'Alcaldía';
  const estadoVisual = procesando
    ? 'analizando'
    : !photoUri
      ? 'esperando'
      : validacion.calidad === 'CALIDAD_DUDOSA'
        ? 'dudosa'
        : puedeUsarFoto(validacion)
          ? 'aceptada'
          : 'rechazada';

  return (
    <FondoSuave>
      <CabeceraRol
        rol="VEEDOR"
        recinto={borrador?.recintoNombre ?? 'Captura de evidencia'}
        jrv={borrador ? borrador.jrvId.slice(0, 8) : undefined}
      />
      {mensaje ? (
        <View className="flex-1 items-center justify-center px-6">
          <LottieFeedback tipo="exito" mensaje={mensaje} />
          <BotonPrincipal titulo="Volver a mis mesas" rol="VEEDOR" onPress={() => router.replace('/(veedor)/mis-mesas')} />
        </View>
      ) : !photoUri ? (
        <View className="flex-1">
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
          <MarcosEsquina />
          <View className="absolute left-4 right-4 top-4">
            <TarjetaVidrio clase="gap-1 px-4 py-3">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="text-base font-semibold text-foreground">Acta de {dignidadTexto}</Text>
                <EstadoCaptura estado={estadoVisual} />
              </View>
              <Text className="text-xs text-texto-secundario">
                Encuadra el acta completa dentro del marco. Evita reflejos y deja los bordes visibles.
              </Text>
            </TarjetaVidrio>
          </View>
          {error ? (
            <View className="absolute bottom-28 left-4 right-4">
              <TarjetaVidrio clase="px-4 py-2">
                <Text className="text-center text-sm text-error">{error}</Text>
              </TarjetaVidrio>
            </View>
          ) : null}
          <View className="absolute bottom-8 w-full items-center">
            <Pressable
              onPress={capturar}
              disabled={procesando}
              accessibilityRole="button"
              accessibilityLabel="Capturar foto"
              className="h-20 w-20 items-center justify-center rounded-full bg-white border-4 border-cian-decorativo"
            >
              <Text className="text-sm font-bold text-foreground">{procesando ? '...' : 'Foto'}</Text>
            </Pressable>
            <Text className="mt-2 text-xs text-texto-secundario">Toca para capturar</Text>
          </View>
          {procesando ? (
            <View className="absolute inset-0 items-center justify-center bg-background/80">
              <LottieFeedback tipo="carga" mensaje="Analizando foto…" />
            </View>
          ) : null}
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
          <TarjetaVidrio clase="gap-3 p-4">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-base font-semibold text-foreground">Acta de {dignidadTexto}</Text>
              <EstadoCaptura estado={estadoVisual} />
            </View>
            <View className="overflow-hidden rounded-2xl">
              <Image source={{ uri: photoUri }} style={{ width: '100%', height: 260 }} resizeMode="cover" />
            </View>
            <MedidorNitidez resultado={validacion.resultado} intentosFallidos={validacion.intentosFallidos} />
            {validacion.calidad === 'CALIDAD_DUDOSA' ? (
              <Text className="rounded-xl bg-warning/15 p-2 text-sm font-semibold text-warning">
                Foto de calidad dudosa — pendiente de revisión. Puedes repetir o guardar con esta etiqueta.
              </Text>
            ) : null}
            {estadoVisual === 'aceptada' ? (
              <Text className="text-sm text-success">La foto parece nítida. Puedes continuar.</Text>
            ) : estadoVisual === 'rechazada' ? (
              <Text className="text-sm text-texto-secundario">
                Repite la captura. Tras tres intentos fallidos podrás guardarla como dudosa.
              </Text>
            ) : null}
          </TarjetaVidrio>
          {error ? (
            <View className="mt-3 rounded-xl bg-error/10 p-3">
              <Text className="text-sm text-error">{error}</Text>
            </View>
          ) : null}
          <View className="mt-4 gap-2">
            {puedeUsarFoto(validacion) ? (
              <BotonPrincipal
                titulo={enviando ? 'Guardando...' : validacion.calidad === 'CALIDAD_DUDOSA' ? 'Usar foto dudosa' : 'Usar esta foto'}
                rol="VEEDOR"
                onPress={() => { if (!enviando) usarFoto(); }}
              />
            ) : null}
            <Pressable
              onPress={repetir}
              accessibilityRole="button"
              accessibilityLabel="Repetir captura"
              className="w-full items-center justify-center rounded-22 border border-accent/40 bg-white/60 active:opacity-80"
              style={{ minHeight: 56 }}
            >
              <Text className="text-base font-semibold text-accent">Repetir captura</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </FondoSuave>
  );
}
