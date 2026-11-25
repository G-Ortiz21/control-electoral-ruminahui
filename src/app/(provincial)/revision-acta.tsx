import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { contenedor } from '@/composition';
import { obtenerClienteSupabase } from '@/shared/infrastructure/supabase-client';
import { BotonPrincipal } from '@/shared/ui/boton-principal';
import { CabeceraRol } from '@/shared/ui/cabecera-rol';
import { FondoSuave } from '@/shared/ui/fondo-suave';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
import { StatusBadge } from '@/shared/ui/status-badge';
import { TarjetaVidrio } from '@/shared/ui/tarjeta-vidrio';
import { VisorUbicacion } from '@/shared/ui/visor-ubicacion';
import type { Acta } from '@/modules/actas/domain';
import type { JrvRecinto, RecintoResumen } from '@/modules/territorio/domain';

/** Etiquetas de los estados reales del acta (ADR-08/ADR-10, DI-02). */
const ETIQUETA_ESTADO: Record<Acta['estado'], string> = {
  BORRADOR: 'Borrador',
  GUARDADA_LOCAL: 'Guardada localmente',
  SINCRONIZANDO: 'Sincronizando',
  RESULTADO_RECIBIDO: 'Resultado recibido',
  EVIDENCIA_PENDIENTE: 'Evidencia pendiente',
  EN_REVISION: 'Acta en revisión',
  EVIDENCIA_RESPALDADA: 'Evidencia respaldada',
  ERROR: 'Error',
  CONFLICTO_VERSION: 'Conflicto de versión',
};

export default function RevisionActaProvincial() {
  const router = useRouter();
  const [recintos, setRecintos] = useState<RecintoResumen[]>([]);
  const [recintoId, setRecintoId] = useState<string>('');
  const [jrvs, setJrvs] = useState<JrvRecinto[]>([]);
  const [jrvId, setJrvId] = useState<string>('');
  const [actas, setActas] = useState<Acta[]>([]);
  const [acta, setActa] = useState<Acta | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conectado, setConectado] = useState(true);

  useEffect(() => {
    let activo = true;
    (async () => {
      const r = await contenedor.territorio.listarRecintos();
      if (!activo) return;
      if (r.ok) setRecintos(r.valor);
      else setError(r.error);
      setCargando(false);
    })();
    return () => { activo = false; };
  }, []);

  function seleccionarRecinto(id: string) {
    setRecintoId(id);
    setJrvs([]);
    setJrvId('');
    setActas([]);
    setActa(null);
    setFotoUrl(null);
    setError(null);
  }

  function seleccionarJrv(id: string) {
    setJrvId(id);
    setActas([]);
    setActa(null);
    setFotoUrl(null);
    setError(null);
  }

  useEffect(() => {
    let activo = true;
    if (!recintoId) return;
    (async () => {
      const r = await contenedor.territorio.listarJrvDelRecinto(recintoId);
      if (!activo) return;
      if (r.ok) setJrvs(r.valor);
      else setError(r.error);
    })();
    return () => { activo = false; };
  }, [recintoId]);

  useEffect(() => {
    let activo = true;
    if (!jrvId) return;
    (async () => {
      const r = await contenedor.actas.listarActasPorJrv(jrvId);
      if (!activo) return;
      if (r.ok) setActas(r.valor);
      else setError(r.error);
    })();
    return () => { activo = false; };
  }, [jrvId]);

  useEffect(() => {
    let activo = true;
    NetInfo.fetch().then((s) => { if (activo) setConectado(Boolean(s.isConnected)); });
    return () => { activo = false; };
  }, []);

  async function revisar(seleccionada: Acta) {
    setError(null);
    setActa(seleccionada);
    setFotoUrl(null);
    if (!seleccionada.fotoPath) return;
    const sb = obtenerClienteSupabase();
    if (!sb) { setError('Supabase no configurado.'); return; }
    const { data, error: e } = await sb.storage.from('actas').createSignedUrl(seleccionada.fotoPath, 3600);
    if (e) setError('No se pudo abrir la fotografía.');
    else if (data?.signedUrl) setFotoUrl(data.signedUrl);
  }

  const recinto = recintos.find((r) => r.id === recintoId) ?? null;

  return (
    <FondoSuave>
      <CabeceraRol rol="PROVINCIAL" recinto="Revisión de acta" />
      <ScrollView className="flex-1 px-6 pt-2">
        {cargando && <LottieFeedback tipo="carga" mensaje="Cargando recintos…" />}
        {error ? <Text className="mb-3 text-error">{error}</Text> : null}

        <Text className="mb-2 text-lg font-bold text-foreground">1. Recinto</Text>
        {recintos.length === 0 && !cargando ? (
          <LottieFeedback tipo="sin-conexion" mensaje="No hay recintos en tu provincia." />
        ) : (
          <View className="mb-3 flex-row flex-wrap gap-2">
            {recintos.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => seleccionarRecinto(r.id)}
                className={`rounded-full px-3 py-2 ${recintoId === r.id ? 'bg-primary' : 'bg-foreground/10'}`}
              >
                <Text className={recintoId === r.id ? 'text-white' : 'text-foreground'}>{r.nombre}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {recintoId ? (
          <>
            <Text className="mb-2 text-lg font-bold text-foreground">2. JRV del recinto</Text>
            {jrvs.length === 0 ? (
              <Text className="mb-3 text-texto-secundario">Este recinto no tiene JRV registradas.</Text>
            ) : (
              <View className="mb-3 flex-row flex-wrap gap-2">
                {jrvs.map((j) => (
                  <Pressable
                    key={j.jrvId}
                    onPress={() => seleccionarJrv(j.jrvId)}
                    className={`rounded-full px-3 py-2 ${jrvId === j.jrvId ? 'bg-primary' : 'bg-foreground/10'}`}
                  >
                    <Text className={jrvId === j.jrvId ? 'text-white' : 'text-foreground'}>
                      JRV {j.numero}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        ) : null}

        {jrvId ? (
          <>
            <Text className="mb-2 text-lg font-bold text-foreground">3. Actas de la JRV</Text>
            {actas.length === 0 ? (
              <LottieFeedback tipo="sin-conexion" mensaje="No hay actas registradas para esta JRV." />
            ) : (
              <View className="gap-2">
                {actas.map((a) => (
                  <Pressable
                    key={a.id}
                    onPress={() => void revisar(a)}
                    className={`mb-1 rounded-xl border p-3 ${acta?.id === a.id ? 'border-primary bg-primary/5' : 'border-foreground/15 bg-white/60'}`}
                  >
                    <Text className="font-semibold text-foreground">{a.dignidad} · v{a.version}</Text>
                    <StatusBadge estado={a.estado} />
                    <Text className="mt-1 text-xs text-texto-secundario">{ETIQUETA_ESTADO[a.estado]}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        ) : null}

        {acta ? (
          <TarjetaVidrio clase="mt-4 p-4">
            <Text className="mb-2 text-lg font-bold text-foreground">
              Acta {acta.id.slice(0, 8)} · {acta.dignidad}
            </Text>
            <StatusBadge estado={acta.estado} />
            <Text className="mt-1 text-sm text-texto-secundario">{ETIQUETA_ESTADO[acta.estado]}</Text>

            <Text className="mt-3 font-semibold text-foreground">Calidad de la fotografía</Text>
            <Text className={`text-sm ${acta.calidadFoto === 'CALIDAD_DUDOSA' ? 'font-semibold text-warning' : 'text-texto-secundario'}`}>
              {acta.calidadFoto === 'CALIDAD_DUDOSA'
                ? 'CALIDAD_DUDOSA — pendiente de revisión (no es evidencia validada)'
                : `Calidad: ${acta.calidadFoto}`}
            </Text>
            {fotoUrl ? (
              <View className="mt-2 overflow-hidden rounded-xl">
                <Image source={{ uri: fotoUrl }} style={{ width: '100%', height: 260 }} resizeMode="contain" />
              </View>
            ) : (
              <Text className="mt-2 text-sm text-texto-secundario">Sin fotografía disponible.</Text>
            )}

            <Text className="mt-3 font-semibold text-foreground">Resultado numérico</Text>
            <Text className="text-sm text-texto-secundario">
              Sufragantes: {acta.sufragantes} · Blancos: {acta.blancos} · Nulos: {acta.nulos}
            </Text>
            <Text className="text-sm text-texto-secundario">
              Votos: {acta.votos.reduce((s, v) => s + v.votos, 0)}
            </Text>

            <Text className="mt-3 font-semibold text-foreground">Captura y ubicación</Text>
            {acta.capturedAt ? (
              <Text className="text-sm text-texto-secundario">Fecha y hora: {acta.capturedAt}</Text>
            ) : null}
            {acta.lat != null && acta.lon != null ? (
              <Text className="text-sm text-texto-secundario">Lat: {acta.lat} · Lon: {acta.lon}</Text>
            ) : null}
            {acta.accuracy != null ? (
              <Text className="text-sm text-texto-secundario">Precisión GPS: {acta.accuracy} m</Text>
            ) : null}
            {acta.distanciaRecintoM != null ? (
              <Text className="text-sm text-texto-secundario">Distancia al recinto: {acta.distanciaRecintoM} m</Text>
            ) : null}
            {recinto && acta.lat != null && acta.lon != null ? (
              <VisorUbicacion
                captura={{
                  lat: acta.lat,
                  lon: acta.lon,
                  precisionM: acta.accuracy ?? null,
                  capturadaEn: acta.capturedAt,
                }}
                recinto={{ lat: recinto.lat, lon: recinto.lon, nombre: recinto.nombre }}
                conectado={conectado}
              />
            ) : null}
          </TarjetaVidrio>
        ) : null}

        <View className="mt-6 pb-10 gap-2">
          <BotonPrincipal titulo="Volver al panel" rol="PROVINCIAL" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </FondoSuave>
  );
}
