import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { contenedor } from '@/composition';
import { obtenerClienteSupabase } from '@/shared/infrastructure/supabase-client';
import { useSessionStore } from '@/modules/auth/presentation/session-store';
import { AnillosAvance } from '@/shared/ui/anillos-avance';
import { TOKENS } from '@/shared/ui/theme';
import { BannerConexion } from '@/shared/ui/banner-conexion';
import { BarrasCandidatos } from '@/shared/ui/barras-candidatos';
import { BotonPrincipal } from '@/shared/ui/boton-principal';
import { CabeceraRol } from '@/shared/ui/cabecera-rol';
import { colorOrganizacionLegible } from '@/shared/ui/color-organizacion';
import { DonutParticipacion } from '@/shared/ui/donut-participacion';
import { FondoSuave } from '@/shared/ui/fondo-suave';
import { ListaRecintos, type RecintoAvance } from '@/shared/ui/lista-recintos';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
import { PieDatosPrueba } from '@/shared/ui/pie-datos-prueba';
import { SelectorPildora } from '@/shared/ui/selector-pildora';
import { SelloPreliminar } from '@/shared/ui/sello-preliminar';
import { TarjetaVidrio } from '@/shared/ui/tarjeta-vidrio';
import { validarDesignacionCoordinador, type RecintoResumen } from '@/modules/territorio/domain';

export default function PanelProvincial() {
  const router = useRouter();
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
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [avance, setAvance] = useState<any[]>([]);
  const [dignidad, setDignidad] = useState<'ALCALDIA' | 'PREFECTURA'>('ALCALDIA');
  const [vista, setVista] = useState<'ALCALDIA' | 'PREFECTURA' | 'RECINTOS'>('ALCALDIA');
  const [resultados, setResultados] = useState<any[]>([]);

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

  useEffect(() => {
    (async () => {
      setCargando(true);
      await Promise.all([cargarRecintos(), cargarCoordinadores(), cargarSeguimiento()]);
      setCargando(false);
    })();
  }, []);

  useEffect(() => {
    (async () => { await cargarSeguimiento(); })();
  }, [vista]);

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
    setMensaje(null);
    const r = await contenedor.territorio.crearRecinto({
      canton, parroquia, nombre, lat: Number(lat), lon: Number(lon), jrvs: Number(jrvs),
    });
    if (!r.ok) { setError(r.error); return; }
    setCanton(''); setParroquia(''); setNombre(''); setLat(''); setLon(''); setJrvs('2');
    setMensaje('Recinto creado y confirmado por el servidor.');
    await cargarRecintos();
  }

  async function designar() {
    setError(null);
    setMensaje(null);
    const recinto = recintos.find((r) => r.id === coordRecinto) ?? null;
    const v = validarDesignacionCoordinador({
      recintoId: coordRecinto,
      coordinadorId: coordUsuario,
      motivo: motivoCoord,
      vigenteId: recinto?.coordinadorId ?? null,
    });
    if (!v.ok) { setError(v.error); return; }
    const r = await contenedor.territorio.designarCoordinadorRecinto(coordRecinto, coordUsuario, motivoCoord.trim());
    if (!r.ok) { setError(r.error); return; }
    setMensaje(recinto?.coordinadorId
      ? 'Coordinador reemplazado y confirmado por el servidor.'
      : 'Coordinador designado y confirmado por el servidor.');
    setMotivoCoord('');
    await Promise.all([cargarRecintos(), cargarCoordinadores()]);
  }

  const totalPorOrg = resultados.reduce((acc: any, r: any) => {
    if (!r.organizacion_id) return acc;
    acc[r.organizacion_id] = acc[r.organizacion_id] || {
      nombre: r.organizacion_nombre,
      votos: 0,
      color: colorOrganizacionLegible(r.organizacion_color),
    };
    acc[r.organizacion_id].votos += Number(r.votos ?? 0);
    acc[r.organizacion_id].color = colorOrganizacionLegible(r.organizacion_color);
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
    else lista.push({
      organizacionId: r.organizacion_id,
      organizacionNombre: r.organizacion_nombre,
      votos: Number(r.votos ?? 0),
      color: colorOrganizacionLegible(r.organizacion_color),
    });
    totalVotosPorRecinto[r.recinto_id] = (totalVotosPorRecinto[r.recinto_id] ?? 0) + Number(r.votos ?? 0);
  }

  const totalJrv = recintosAvance.reduce((s, r) => s + r.jrvTotal, 0);
  const totalReportadas = recintosAvance.reduce((s, r) => s + r.jrvConResultados, 0);
  const totalRespaldadas = recintosAvance.reduce((s, r) => s + r.jrvRespaldadas, 0);

  const recintoSeleccionado = recintos.find((r) => r.id === coordRecinto) ?? null;
  const coordinadoresDisponibles = coordinadores.filter((u: any) =>
    u.rol === 'COORDINADOR' && u.estado === 'ACTIVO' && u.id !== recintoSeleccionado?.coordinadorId,
  );

  return (
    <FondoSuave>
      <CabeceraRol rol="PROVINCIAL" recinto="Provincia" titulo="Panel provincial" />
      <BannerConexion conectado={!sinConexion} />
      <ScrollView className="flex-1 px-6 pt-2">
        <SelloPreliminar ultimoActualizado={ultimo} sinConexion={sinConexion} />
        <View className="mt-3 gap-2">
          <BotonPrincipal titulo="Crear coordinador" rol="PROVINCIAL" onPress={() => router.push('/(provincial)/usuarios')} />
          <BotonPrincipal titulo="Revisión de acta" rol="PROVINCIAL" onPress={() => router.push('/(provincial)/revision-acta')} />
        </View>
        {cargando && <LottieFeedback tipo="carga" mensaje="Cargando…" />}
        {error ? <Text className="mt-2 text-error">{error}</Text> : null}
        {mensaje ? <Text className="mt-2 font-semibold text-success">{mensaje}</Text> : null}

        <View className="mt-4">
          <SelectorPildora
            opciones={[
              { id: 'ALCALDIA', label: 'Alcaldía' },
              { id: 'PREFECTURA', label: 'Prefectura' },
              { id: 'RECINTOS', label: 'Por recinto' },
            ]}
            valor={vista}
            onCambio={(id) => {
              setVista(id as any);
              if (id !== 'RECINTOS') setDignidad(id as any);
            }}
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
          <TextInput placeholder="Cantón" placeholderTextColor={TOKENS.textoSecundario} value={canton} onChangeText={setCanton} className="h-12 rounded-xl border border-foreground/20 bg-white/70 px-4 text-foreground" />
          <TextInput placeholder="Parroquia" placeholderTextColor={TOKENS.textoSecundario} value={parroquia} onChangeText={setParroquia} className="h-12 rounded-xl border border-foreground/20 bg-white/70 px-4 text-foreground" />
          <TextInput placeholder="Nombre" placeholderTextColor={TOKENS.textoSecundario} value={nombre} onChangeText={setNombre} className="h-12 rounded-xl border border-foreground/20 bg-white/70 px-4 text-foreground" />
          <View className="flex-row gap-2">
            <TextInput placeholder="Lat" placeholderTextColor={TOKENS.textoSecundario} value={lat} onChangeText={setLat} className="h-12 flex-1 rounded-xl border border-foreground/20 bg-white/70 px-4 text-foreground" />
            <TextInput placeholder="Lon" placeholderTextColor={TOKENS.textoSecundario} value={lon} onChangeText={setLon} className="h-12 flex-1 rounded-xl border border-foreground/20 bg-white/70 px-4 text-foreground" />
            <TextInput placeholder="JRV" placeholderTextColor={TOKENS.textoSecundario} value={jrvs} onChangeText={setJrvs} className="h-12 w-20 rounded-xl border border-foreground/20 bg-white/70 px-4 text-foreground" />
          </View>
          <BotonPrincipal titulo="Crear recinto" rol="PROVINCIAL" onPress={crearRecinto} />
        </TarjetaVidrio>

        <Text className="mt-6 mb-2 text-lg font-bold text-foreground">Recintos y responsables</Text>
        {recintos.length === 0 ? (
          <LottieFeedback tipo="sin-conexion" mensaje="No hay recintos en tu provincia." />
        ) : (
          <TarjetaVidrio clase="p-4 gap-2">
            {recintos.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => { setCoordRecinto(r.id); setCoordUsuario(''); setMensaje(null); }}
                className={`rounded-xl border p-3 ${coordRecinto === r.id ? 'border-primary bg-primary/5' : 'border-foreground/15 bg-white/60'}`}
              >
                <Text className="font-semibold text-foreground">{r.nombre} · {r.canton} / {r.parroquia}</Text>
                <Text className="text-sm text-texto-secundario">
                  Responsable: {r.coordinadorId ? `${r.coordinadorNombres ?? ''} ${r.coordinadorApellidos ?? ''}`.trim() : 'Sin coordinador'}
                </Text>
                <Text className="text-xs text-texto-secundario">
                  {r.coordinadorId ? 'Asignación vigente' : 'Sin asignación vigente'} · {r.totalJrv} JRV
                </Text>
              </Pressable>
            ))}
          </TarjetaVidrio>
        )}

        <Text className="mt-6 mb-2 text-lg font-bold text-foreground">
          {recintoSeleccionado?.coordinadorId ? 'Reemplazar coordinador' : 'Designar coordinador'}
        </Text>
        <TarjetaVidrio clase="p-4 gap-2">
          <Text className="text-sm text-foreground">
            Recinto: {recintoSeleccionado?.nombre ?? 'Selecciona un recinto'}
          </Text>
          <Text className="text-sm text-texto-secundario">
            Responsable actual: {recintoSeleccionado?.coordinadorId
              ? `${recintoSeleccionado.coordinadorNombres ?? ''} ${recintoSeleccionado.coordinadorApellidos ?? ''}`.trim()
              : 'Sin coordinador vigente'}
          </Text>
          {coordinadoresDisponibles.length === 0 ? (
            <View className="items-center py-2">
              <LottieFeedback tipo="sin-conexion" mensaje="No hay coordinadores ACTIVO disponibles en tu provincia." />
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {coordinadoresDisponibles.map((u: any) => (
                <Pressable key={u.id} onPress={() => setCoordUsuario(u.id)} className={`rounded-full px-3 py-2 ${coordUsuario === u.id ? 'bg-primary' : 'bg-foreground/10'}`}>
                  <Text className={coordUsuario === u.id ? 'text-white' : 'text-foreground'}>{u.nombres} {u.apellidos}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <Pressable onPress={() => router.push('/(provincial)/usuarios')} className="py-2">
            <Text className="text-sm font-semibold text-accent">Crear nuevo coordinador</Text>
          </Pressable>
          <TextInput placeholder="Motivo (obligatorio)" placeholderTextColor={TOKENS.textoSecundario} value={motivoCoord} onChangeText={setMotivoCoord} className="h-12 rounded-xl border border-foreground/20 bg-white/70 px-4 text-foreground" />
          <BotonPrincipal
            titulo={recintoSeleccionado?.coordinadorId ? 'Reemplazar coordinador' : 'Designar coordinador'}
            rol="PROVINCIAL"
            onPress={designar}
          />
        </TarjetaVidrio>

        <View className="mt-6 pb-10">
          <Pressable onPress={() => limpiar()} className="items-center py-3">
            <Text className="text-sm font-semibold text-texto-secundario">Cerrar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
      <PieDatosPrueba />
    </FondoSuave>
  );
}
