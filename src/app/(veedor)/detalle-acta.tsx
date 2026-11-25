import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { contenedor } from '@/composition';
import type { Acta } from '@/modules/actas/domain';
import { BotonPrincipal } from '@/shared/ui/boton-principal';
import { CabeceraRol } from '@/shared/ui/cabecera-rol';
import { FondoSuave } from '@/shared/ui/fondo-suave';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
import { StatusBadge } from '@/shared/ui/status-badge';
import { TarjetaVidrio } from '@/shared/ui/tarjeta-vidrio';
import { VisorUbicacion } from '@/shared/ui/visor-ubicacion';

export default function DetalleActaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const actaId = params.actaId ? String(params.actaId) : null;
  const jrvId = params.jrvId ? String(params.jrvId) : null;

  const [acta, setActa] = useState<Acta | null>(null);
  const [actas, setActas] = useState<Acta[]>([]);
  const [recinto, setRecinto] = useState<{ lat: number; lon: number; nombre: string } | null>(null);
  const [conectado, setConectado] = useState<boolean>(true);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      const net = await NetInfo.fetch();
      if (activo) setConectado(Boolean(net.isConnected));
      if (actaId) {
        const res = await contenedor.actas.obtenerActa(actaId);
        if (!activo) return;
        if (res.ok) {
          setActa(res.valor);
          const r = await contenedor.actas.obtenerRecintoDeJrv(res.valor.jrvId);
          if (r.ok) setRecinto({ lat: r.valor.lat, lon: r.valor.lon, nombre: r.valor.nombre });
        } else setError(res.error);
      } else if (jrvId) {
        const res = await contenedor.actas.listarActasPorJrv(jrvId);
        if (!activo) return;
        if (res.ok) {
          setActas(res.valor);
          const r = await contenedor.actas.obtenerRecintoDeJrv(jrvId);
          if (r.ok) setRecinto({ lat: r.valor.lat, lon: r.valor.lon, nombre: r.valor.nombre });
        } else setError(res.error);
      }
      if (activo) setCargando(false);
    })();
    return () => {
      activo = false;
    };
  }, [actaId, jrvId]);

  if (cargando) {
    return (
      <FondoSuave>
        <View className="flex-1 items-center justify-center">
          <LottieFeedback tipo="carga" mensaje="Cargando detalle…" />
        </View>
      </FondoSuave>
    );
  }
  if (error) {
    return (
      <FondoSuave>
        <View className="flex-1 items-center justify-center px-6">
          <LottieFeedback tipo="error" mensaje={error} />
          <BotonPrincipal titulo="Volver" rol="VEEDOR" onPress={() => router.back()} />
        </View>
      </FondoSuave>
    );
  }

  const a = acta ?? actas[0] ?? null;

  return (
    <FondoSuave>
      <CabeceraRol rol="VEEDOR" recinto={recinto?.nombre ?? 'Detalle'} />
      <ScrollView className="flex-1 px-6 pt-2">
        <Text className="mb-4 text-2xl font-bold text-foreground">Detalle del acta</Text>
        {a ? (
          <>
            <StatusBadge estado={a.estado} />
            <TarjetaVidrio clase="mt-4 p-4">
              <Text className="text-base text-foreground">Dignidad: {a.dignidad}</Text>
              <Text className="text-base text-foreground">Versión: {a.version}</Text>
              <Text className="text-base text-foreground">Capturada: {a.capturedAt}</Text>
              <Text className="text-base text-foreground">Calidad foto: {a.calidadFoto}</Text>
              {a.calidadFoto === 'CALIDAD_DUDOSA' ? (
                <Text className="mt-2 font-semibold text-warning">Foto de calidad dudosa — pendiente de revisión</Text>
              ) : null}
            </TarjetaVidrio>

            <TarjetaVidrio clase="mt-4 p-4">
              <Text className="text-base font-semibold text-foreground mb-1">Ubicación de captura</Text>
              <Text className="text-sm text-texto-secundario">Lat: <Text className="font-mono text-foreground">{a.lat}</Text></Text>
              <Text className="text-sm text-texto-secundario">Lon: <Text className="font-mono text-foreground">{a.lon}</Text></Text>
              <Text className="text-sm text-texto-secundario">Precisión: <Text className="font-mono text-foreground">{a.accuracy} m</Text></Text>
              {a.distanciaRecintoM !== null && (
                <Text className="text-sm text-texto-secundario">Distancia al recinto: <Text className="font-mono text-foreground">{a.distanciaRecintoM} m</Text></Text>
              )}
            </TarjetaVidrio>

            {recinto ? (
              <VisorUbicacion
                captura={{ lat: a.lat ?? 0, lon: a.lon ?? 0, precisionM: a.accuracy ?? null, capturadaEn: a.capturedAt }}
                recinto={recinto}
                conectado={conectado}
              />
            ) : null}

            <View className="mt-6 pb-8">
              <BotonPrincipal
                titulo="Corregir acta"
                rol="VEEDOR"
                onPress={() => router.push({ pathname: '/(veedor)/corregir-acta', params: { actaId: a.id } })}
              />
            </View>
          </>
        ) : (
          <LottieFeedback tipo="sin-conexion" mensaje="No hay actas para esta JRV." />
        )}
      </ScrollView>
    </FondoSuave>
  );
}
