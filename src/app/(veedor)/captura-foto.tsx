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
import { calcularNitidez, luminanciaMedia, esFotoNitida, evaluarGps } from '@/modules/actas/domain';
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

function MedidorNitidez({ varianza, nitida }: { varianza: number; nitida: boolean | null }) {
  const pct = Math.max(0, Math.min(100, (varianza / 300) * 100));
  const color = nitida === null ? 'bg-foreground/20' : nitida ? 'bg-success' : 'bg-error';
  return (
    <View className="mt-3">
      <View className="flex-row justify-between mb-1">
        <Text className="text-sm text-texto-secundario">Nitidez</Text>
        <Text className="text-sm font-mono text-foreground">{Math.round(varianza)}</Text>
      </View>
      <View className="h-2 rounded-full bg-foreground/10 overflow-hidden">
        <View className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </View>
      <Text className="mt-1 text-[12px] text-texto-secundario">
        {nitida === null ? 'Esperando captura…' : nitida ? 'Foto nítida' : 'Foto borrosa, repite la captura'}
      </Text>
    </View>
  );
}

export default function CapturaFotoScreen() {
  const router = useRouter();
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const borrador = useActaBorradorStore((s) => s.borrador);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [intentos, setIntentos] = useState(0);
  const [calidad, setCalidad] = useState<'NORMAL' | 'CALIDAD_DUDOSA'>('NORMAL');
  const [nitida, setNitida] = useState<boolean | null>(null);
  const [media, setMedia] = useState<number>(0);
  const [varianza, setVarianza] = useState<number>(0);
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
    if (!cameraRef.current) return;
    setProcesando(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setPhotoUri(photo.uri);

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
      const v = calcularNitidez(luminancias);
      const m = luminanciaMedia(luminancias);
      setVarianza(v);
      setMedia(m);
      const esNit = esFotoNitida(v, m);
      setNitida(esNit);

      const nuevoIntento = intentos + 1;
      setIntentos(nuevoIntento);
      if (!esNit) {
        if (nuevoIntento >= MAX_INTENTOS_FOTO) {
          setCalidad('CALIDAD_DUDOSA');
        }
      } else {
        setCalidad('NORMAL');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar la foto.');
      setNitida(null);
    } finally {
      setProcesando(false);
    }
  }

  function repetir() {
    setPhotoUri(null);
    setNitida(null);
  }

  async function usarFoto() {
    if (!photoUri || !borrador) return;
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
        calidadFoto: calidad,
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

  return (
    <FondoSuave>
      <CabeceraRol rol="VEEDOR" recinto="Captura de evidencia" />
      {mensaje ? (
        <View className="flex-1 items-center justify-center px-6">
          <LottieFeedback tipo="exito" mensaje={mensaje} />
          <BotonPrincipal titulo="Volver a mis mesas" rol="VEEDOR" onPress={() => router.replace('/(veedor)/mis-mesas')} />
        </View>
      ) : !photoUri ? (
        <View className="flex-1">
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
          <MarcosEsquina />
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
          </View>
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 pt-4">
          <TarjetaVidrio clase="p-3">
            <Image source={{ uri: photoUri }} style={{ width: '100%', height: 280, borderRadius: 16 }} />
            <MedidorNitidez varianza={varianza} nitida={nitida} />
            <Text className="mt-2 text-[12px] text-texto-secundario">
              Luminancia: {media.toFixed(1)} · Intento {intentos} de {MAX_INTENTOS_FOTO}
            </Text>
            {calidad === 'CALIDAD_DUDOSA' ? (
              <Text className="mt-2 text-sm font-semibold text-warning">Foto de calidad dudosa — pendiente de revisión</Text>
            ) : null}
          </TarjetaVidrio>
          {error ? <Text className="mt-3 text-base text-error">{error}</Text> : null}
          <View className="mt-4 gap-2 pb-8">
            {calidad !== 'CALIDAD_DUDOSA' && !nitida && intentos < MAX_INTENTOS_FOTO ? (
              <BotonPrincipal titulo="Repetir captura" rol="VEEDOR" onPress={repetir} />
            ) : null}
            <BotonPrincipal titulo={enviando ? 'Guardando...' : 'Usar esta foto'} rol="VEEDOR" onPress={() => { if (!enviando) usarFoto(); }} />
            <Pressable onPress={repetir} className="items-center py-3">
              <Text className="text-sm font-semibold text-texto-secundario">Repetir</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </FondoSuave>
  );
}
