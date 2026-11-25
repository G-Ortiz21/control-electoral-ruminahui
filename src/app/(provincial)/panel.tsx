import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { contenedor } from '@/composition';
import { obtenerClienteSupabase } from '@/shared/infrastructure/supabase-client';
import { useSessionStore } from '@/modules/auth/presentation/session-store';
import { AnillosAvance } from '@/shared/ui/anillos-avance';
import { BannerConexion } from '@/shared/ui/banner-conexion';
import { BarrasCandidatos } from '@/shared/ui/barras-candidatos';
import { BotonPrincipal } from '@/shared/ui/boton-principal';
import { CabeceraRol } from '@/shared/ui/cabecera-rol';
import { DonutParticipacion } from '@/shared/ui/donut-participacion';
import { FondoSuave } from '@/shared/ui/fondo-suave';
import { ListaRecintos, type RecintoAvance } from '@/shared/ui/lista-recintos';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
import { SelectorPildora } from '@/shared/ui/selector-pildora';
import { SelloPreliminar } from '@/shared/ui/sello-preliminar';
import { TarjetaVidrio } from '@/shared/ui/tarjeta-vidrio';
import { VisorUbicacion } from '@/shared/ui/visor-ubicacion';
import type { RecintoResumen } from '@/modules/territorio/domain';

export default function PanelProvincial() {
  const usuario = useSessionStore((s) => s.usuario);
  const limpiar = useSessionStore((s) => s.limpiar);
  const [recintos, setRecintos] = useState<RecintoResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState<string>(new Date().toISOString());
  const [sinConexion, setSinConexion] = useState(false);

  const [canton, setCanton] = useState('');
  const [parroquia, setParroquia] = useState('');
  const [nombre, setNombre] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [jrvs, setJrvs] = useState('2');

  const [coordinadores, setCoordinadores] = useState<any[]>([]);
  const [coordRecinto, setCoordRecinto] = useState<string>('');
  const [coordUsuario, setCoordUsuario] = useState<string>('');
  const [motivoCoord, setMotivoCoord] = useState('');

  const [avance, setAvance] = useState<any[]>([]);
  const [dignidad, setDignidad] = useState<'ALCALDIA' | 'PREFECTURA'>('ALCALDIA');
  const [vista, setVista] = useState<'ALCALDIA' | 'PREFECTURA' | 'RECINTOS'>('ALCALDIA');
  const [resultados, setResultados] = useState<any[]>([]);

  const [actaRevision, setActaRevision] = useState<any | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [recintoRevision, setRecintoRevision] = useState<string>('');
  const [actasRevision, setActasRevision] = useState<any[]>([]);
  const [recintoExpandido, setRecintoExpandido] = useState<string | null>(null);
  const [donutSeleccionada, setDonutSeleccionada] = useState<string | null>(null);

  async function cargarRecintos() {
    const r = await contenedor.territorio.listarRecintos();
    if (r.ok) setRecintos(r.valor as any);
    else setError(r.error);
  }

  async function cargarCoordinadores() {
    const r = await contenedor.usuarios.listarAMiCargo();
    if (r.ok) setCoordinadores(r.valor);
  }

  async function cargarSeguimiento() {
    const a = await contenedor.territorio.avancePorRecinto();
    if (a.ok) setAvance(a.valor);
    const d = vista === 'RECINTOS' ? dignidad : vista;
    const res = await contenedor.territorio.resultadosPorRecinto(d);
    if (res.ok) setResultados(res.valor);
    setUltimo(new Date().toISOString());
  }

  async function cargarActasRevision(recintoId: string) {
    const r = await contenedor.territorio.listarActasDelRecinto(recintoId);
    if (r.ok) setActasRevision(r.valor as any[]);
  }

  useEffect(() => {
    (async () => {
      setCargando(true);
      await Promise.all([cargarRecintos(), cargarCoordinadores(), cargarSeguimiento()]);
      setCargando(false);
    })();
  }, []);

  useEffect(() => {
    if (vista !== 'RECINTOS') setDignidad(vista);
    (async () => { await cargarSeguimiento(); })();
  }, [vista]);

  useEffect(() => {
    if (recintoRevision) (async () => { await cargarActasRevision(recintoRevision); })();
  }, [recintoRevision]);

  useEffect(() => {
    const sb = obtenerClienteSupabase();
    if (!sb) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = sb
      .channel('actas-seguimiento')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actas' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { void cargarSeguimiento(); }, 500);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votos_acta' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { void cargarSeguimiento(); }, 500);
      })
      .subscribe((status) => {
        setSinConexion(status !== 'SUBSCRIBED');
      });
    return () => {
      if (timer) clearTimeout(timer);
      sb.removeChannel(channel);
    };
  }, [vista]);

  useEffect(() => {
    let desuscrito = false;
    let enLineaPrevio: boolean | null = null;
    const desuscribir = contenedor.sync.conectividad.suscribirRed((estado) => {
      if (desuscrito) return;
      const enLinea = estado.conectado === true && estado.alcanzable !== false;
      if (enLineaPrevio === false && enLinea) void cargarSeguimiento();
      enLineaPrevio = enLinea;
    });
    return () => {
      desuscrito = true;
      desuscribir();
    };
  }, [vista]);

  async function crearRecinto() {
    setError(null);
    const r = await contenedor.territorio.crearRecinto({
      canton, parroquia, nombre, lat: Number(lat), lon: Number(lon), jrvs: Number(jrvs),
    });
    if (!r.ok) { setError(r.error); return; }
    setCanton(''); setParroquia(''); setNombre(''); setLat(''); setLon(''); setJrvs('2');
    await cargarRecintos();
  }

  async function designar() {
    if (!coordRecinto || !coordUsuario) return;
    const r = await contenedor.territorio.designarCoordinadorRecinto(coordRecinto, coordUsuario, motivoCoord || 'designación');
    if (!r.ok) { setError(r.error); return; }
    setMotivoCoord('');
    await cargarRecintos();
  }

  async function revisarActa(acta: any) {
    setActaRevision(acta);
    setFotoUrl(null);
    if (acta?.fotoPath) {
      const sb = obtenerClienteSupabase();
      if (sb) {
        const { data } = await sb.storage.from('actas').createSignedUrl(acta.fotoPath, 3600);
        if (data?.signedUrl) setFotoUrl(data.signedUrl);
      }
    }
  }

  const totalPorOrg = resultados.reduce((acc: any, r: any) => {
    if (!r.organizacion_id) return acc;
    acc[r.organizacion_id] = acc[r.organizacion_id] || { nombre: r.organizacion_nombre, votos: 0, color: r.organizacion_color ?? '#1D4ED8' };
    acc[r.organizacion_id].votos += Number(r.votos ?? 0);
    if (r.organizacion_color) acc[r.organizacion_id].color = r.organizacion_color;
    return acc;
  }, {});

  const candidatos = Object.keys(totalPorOrg).map((id) => ({
    organizacionId: id,
    organizacionNombre: totalPorOrg[id].nombre,
    votos: totalPorOrg[id].votos,
    color: totalPorOrg[id].color,
  }));
  const totalVotos = candidatos.reduce((s, c) => s + c.votos, 0);

  const recintosAvance: RecintoAvance[] = avance.map((a: any) => ({
    id: a.recinto_id,
    nombre: a.recinto_nombre,
    jrvTotal: Number(a.jrv_total ?? 0),
    jrvConResultados: Number(a.jrv_reportadas ?? 0),
    jrvRespaldadas: Number(a.jrv_respaldadas ?? 0),
  }));

  const candidatosPorRecinto: Record<string, any[]> = {};
  const totalVotosPorRecinto: Record<string, number> = {};
  for (const r of resultados) {
    if (!r.recinto_id || !r.organizacion_id) continue;
    candidatosPorRecinto[r.recinto_id] = candidatosPorRecinto[r.recinto_id] ?? [];
    const lista = candidatosPorRecinto[r.recinto_id];
    const existente = lista.find((x) => x.organizacionId === r.organizacion_id);
    if (existente) existente.votos += Number(r.votos ?? 0);
    else lista.push({ organizacionId: r.organizacion_id, organizacionNombre: r.organizacion_nombre, votos: Number(r.votos ?? 0), color: r.organizacion_color ?? '#1D4ED8' });
    totalVotosPorRecinto[r.recinto_id] = (totalVotosPorRecinto[r.recinto_id] ?? 0) + Number(r.votos ?? 0);
  }

  const totalJrv = recintosAvance.reduce((s, r) => s + r.jrvTotal, 0);
  const totalReportadas = recintosAvance.reduce((s, r) => s + r.jrvConResultados, 0);
  const totalRespaldadas = recintosAvance.reduce((s, r) => s + r.jrvRespaldadas, 0);

  return (
    <FondoSuave>
      <CabeceraRol rol="PROVINCIAL" recinto="Provincia" titulo="Panel provincial" />
      <BannerConexion conectado={!sinConexion} />
      <ScrollView className="flex-1 px-6 pt-2">
        <SelloPreliminar ultimoActualizado={ultimo} sinConexion={sinConexion} />
        {cargando && <LottieFeedback tipo="carga" mensaje="Cargando…" />}
        {error ? <Text className="mt-2 text-error">{error}</Text> : null}

        <View className="mt-4">
          <SelectorPildora
            opciones={[
              { id: 'ALCALDIA', label: 'Alcaldía' },
              { id: 'PREFECTURA', label: 'Prefectura' },
              { id: 'RECINTOS', label: 'Por recinto' },
            ]}
            valor={vista}
            onCambio={(id) => setVista(id as any)}
          />
        </View>

        <TarjetaVidrio clase="mt-4 p-4">
          <Text className="text-lg font-bold text-foreground mb-2">Avance de JRV</Text>
          <AnillosAvance jrvTotal={totalJrv} jrvConResultados={totalReportadas} jrvRespaldadas={totalRespaldadas} />
        </TarjetaVidrio>

        <TarjetaVidrio clase="mt-4 p-4">
          <Text className="text-lg font-bold text-foreground mb-2">Votos por candidatura</Text>
          <BarrasCandidatos candidatos={candidatos} totalVotos={totalVotos} />
        </TarjetaVidrio>

        <TarjetaVidrio clase="mt-4 p-4">
          <Text className="text-lg font-bold text-foreground mb-2">Participación</Text>
          <DonutParticipacion
            candidatos={candidatos}
            totalVotos={totalVotos}
            seleccionadaId={donutSeleccionada}
            onSeleccionar={setDonutSeleccionada}
          />
        </TarjetaVidrio>

        <TarjetaVidrio clase="mt-4 p-4">
          <Text className="text-lg font-bold text-foreground mb-2">Recintos</Text>
          <ListaRecintos
            recintos={recintosAvance}
            candidatosPorRecinto={candidatosPorRecinto}
            totalVotosPorRecinto={totalVotosPorRecinto}
            expandedId={recintoExpandido}
            onSeleccionar={(r) => setRecintoExpandido((a) => (a === r.id ? null : r.id))}
          />
        </TarjetaVidrio>

        <Text className="mt-6 mb-2 text-lg font-bold text-foreground">Agregar recinto</Text>
        <TarjetaVidrio clase="p-4 gap-2">
          <TextInput placeholder="Cantón" placeholderTextColor="#3B4A78" value={canton} onChangeText={setCanton} className="h-12 rounded-xl border border-foreground/20 bg-white/70 px-4 text-foreground" />
          <TextInput placeholder="Parroquia" placeholderTextColor="#3B4A78" value={parroquia} onChangeText={setParroquia} className="h-12 rounded-xl border border-foreground/20 bg-white/70 px-4 text-foreground" />
          <TextInput placeholder="Nombre" placeholderTextColor="#3B4A78" value={nombre} onChangeText={setNombre} className="h-12 rounded-xl border border-foreground/20 bg-white/70 px-4 text-foreground" />
          <View className="flex-row gap-2">
            <TextInput placeholder="Lat" placeholderTextColor="#3B4A78" value={lat} onChangeText={setLat} className="h-12 flex-1 rounded-xl border border-foreground/20 bg-white/70 px-4 text-foreground" />
            <TextInput placeholder="Lon" placeholderTextColor="#3B4A78" value={lon} onChangeText={setLon} className="h-12 flex-1 rounded-xl border border-foreground/20 bg-white/70 px-4 text-foreground" />
            <TextInput placeholder="JRV" placeholderTextColor="#3B4A78" value={jrvs} onChangeText={setJrvs} className="h-12 w-20 rounded-xl border border-foreground/20 bg-white/70 px-4 text-foreground" />
          </View>
          <BotonPrincipal titulo="Crear recinto" rol="PROVINCIAL" onPress={crearRecinto} />
        </TarjetaVidrio>

        <Text className="mt-6 mb-2 text-lg font-bold text-foreground">Designar coordinador</Text>
        <TarjetaVidrio clase="p-4 gap-2">
          <View className="flex-row flex-wrap gap-2">
            {recintos.map((r: any) => (
              <Pressable key={r.id} onPress={() => setCoordRecinto(r.id)} className={`rounded-full px-3 py-2 ${coordRecinto === r.id ? 'bg-primary' : 'bg-foreground/10'}`}>
                <Text className={coordRecinto === r.id ? 'text-white' : 'text-foreground'}>{r.nombre}</Text>
              </Pressable>
            ))}
          </View>
          <View className="flex-row flex-wrap gap-2">
            {coordinadores.map((u: any) => (
              <Pressable key={u.id} onPress={() => setCoordUsuario(u.id)} className={`rounded-full px-3 py-2 ${coordUsuario === u.id ? 'bg-primary' : 'bg-foreground/10'}`}>
                <Text className={coordUsuario === u.id ? 'text-white' : 'text-foreground'}>{u.nombres} {u.apellidos}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput placeholder="Motivo" placeholderTextColor="#3B4A78" value={motivoCoord} onChangeText={setMotivoCoord} className="h-12 rounded-xl border border-foreground/20 bg-white/70 px-4 text-foreground" />
          <BotonPrincipal titulo="Designar" rol="PROVINCIAL" onPress={designar} />
        </TarjetaVidrio>

        <Text className="mt-6 mb-2 text-lg font-bold text-foreground">Revisión de acta</Text>
        <TarjetaVidrio clase="p-4">
          <View className="mb-2 flex-row flex-wrap gap-2">
            {recintos.map((r: any) => (
              <Pressable key={r.id} onPress={() => setRecintoRevision(r.id)} className={`rounded-full px-3 py-2 ${recintoRevision === r.id ? 'bg-primary' : 'bg-foreground/10'}`}>
                <Text className={recintoRevision === r.id ? 'text-white' : 'text-foreground'}>{r.nombre}</Text>
              </Pressable>
            ))}
          </View>
          <FlatList
            data={actasRevision}
            scrollEnabled={false}
            keyExtractor={(a: any) => a.id}
            renderItem={({ item }) => (
              <Pressable onPress={() => revisarActa(item)} className="mb-2 rounded-xl border border-foreground/15 bg-white/60 p-3">
                <Text className="font-semibold text-foreground">{item.dignidad} · v{item.version} · {item.estado}</Text>
              </Pressable>
            )}
          />
          {actaRevision && (
            <View className="mt-2 rounded-xl border border-foreground/15 p-3">
              <Text className="font-semibold text-foreground">Acta {actaRevision.id?.slice(0, 8)}</Text>
              <Text className="text-sm text-texto-secundario">Lat: {actaRevision.lat} · Lon: {actaRevision.lon} · Precisión: {actaRevision.accuracy} m · Distancia: {actaRevision.distanciaRecintoM} m</Text>
              {fotoUrl && (
                <View className="mt-2 h-64">
                  <WebView source={{ uri: fotoUrl }} />
                </View>
              )}
              {(() => {
                const r = recintos.find((x: any) => x.id === recintoRevision);
                if (!r || !actaRevision) return null;
                return (
                  <VisorUbicacion
                    captura={{ lat: actaRevision.lat ?? 0, lon: actaRevision.lon ?? 0, precisionM: actaRevision.accuracy ?? null, capturadaEn: actaRevision.capturedAt }}
                    recinto={{ lat: r.lat, lon: r.lon, nombre: r.nombre }}
                    conectado={!sinConexion}
                  />
                );
              })()}
            </View>
          )}
        </TarjetaVidrio>

        <View className="mt-6 pb-10">
          <Pressable onPress={() => limpiar()} className="items-center py-3">
            <Text className="text-sm font-semibold text-texto-secundario">Cerrar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </FondoSuave>
  );
}
