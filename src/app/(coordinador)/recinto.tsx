import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { contenedor } from '@/composition';
import { obtenerClienteSupabase } from '@/shared/infrastructure/supabase-client';
import { useSessionStore } from '@/modules/auth/presentation/session-store';
import { BotonPrincipal } from '@/shared/ui/boton-principal';
import { CampoNumerico } from '@/shared/ui/campo-numerico';
import { TOKENS } from '@/shared/ui/theme';
import { BottomSheetVidrio } from '@/shared/ui/bottom-sheet-vidrio';
import { CabeceraRol } from '@/shared/ui/cabecera-rol';
import { FondoSuave } from '@/shared/ui/fondo-suave';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
import { StatusBadge } from '@/shared/ui/status-badge';
import { TarjetaVidrio } from '@/shared/ui/tarjeta-vidrio';
import { VisorUbicacion } from '@/shared/ui/visor-ubicacion';
import type { JrvRecinto, AsignacionVeedor, VeedorDisponible } from '@/modules/territorio/domain';
import type { Acta } from '@/modules/actas/domain';
import type { Usuario } from '@/modules/auth/domain';
import {
  jrvsVigentesDelVeedor,
  validarReemplazo,
  validarAsignacion,
  veedoresDisponiblesParaJrv,
} from '@/modules/territorio/domain';

export default function RecintoCoordinador() {
  const router = useRouter();
  const usuario = useSessionStore((s) => s.usuario);
  const limpiar = useSessionStore((s) => s.limpiar);
  const [jrvs, setJrvs] = useState<JrvRecinto[]>([]);
  const [veedores, setVeedores] = useState<VeedorDisponible[]>([]);
  const [veedoresCreados, setVeedoresCreados] = useState<Usuario[]>([]);
  const [actas, setActas] = useState<Acta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [nuevoVeedor, setNuevoVeedor] = useState<string>('');
  const [motivo, setMotivo] = useState('');
  const [historial, setHistorial] = useState<AsignacionVeedor[]>([]);
  const [actaSeleccionada, setActaSeleccionada] = useState<Acta | null>(null);
  const [recintoCoords, setRecintoCoords] = useState<{ lat: number; lon: number; nombre: string } | null>(null);
  const [organizaciones, setOrganizaciones] = useState<{ id: string; nombre: string; color: string }[]>([]);
  const [valoresCorreccion, setValoresCorreccion] = useState<{
    votos: Record<string, string>;
    blancos: string;
    nulos: string;
    sufragantes: string;
  } | null>(null);
  const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({});
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [fotoCorreccionUrl, setFotoCorreccionUrl] = useState<string | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState(false);
  const [motivoCorreccion, setMotivoCorreccion] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [hojaAbierta, setHojaAbierta] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    setError(null);
    const rRecinto = await contenedor.territorio.obtenerRecintoDelCoordinador(usuario.id);
    if (!rRecinto.ok) { setError(rRecinto.error); setCargando(false); return; }
    const rid = rRecinto.valor;
    const fallos: string[] = [];

    const rJrv = await contenedor.territorio.listarJrvDelRecinto(rid);
    if (rJrv.ok) setJrvs(rJrv.valor); else fallos.push(rJrv.error);

    const rVeed = await contenedor.territorio.listarVeedoresDelRecinto(rid, usuario.id);
    if (rVeed.ok) setVeedores(rVeed.valor); else fallos.push(rVeed.error);

    const rCreados = await contenedor.usuarios.listarAMiCargo();
    if (rCreados.ok) setVeedoresCreados(rCreados.valor.filter((u) => u.rol === 'VEEDOR'));
    else fallos.push(rCreados.error);

    const rActas = await contenedor.territorio.listarActasDelRecinto(rid);
    if (rActas.ok) setActas(rActas.valor); else fallos.push(rActas.error);

    const rOrgs = await contenedor.actas.listarOrganizaciones();
    if (rOrgs.ok) setOrganizaciones(rOrgs.valor); else fallos.push(rOrgs.error);

    if (fallos.length > 0) setError(fallos.join(' '));
    setCargando(false);
  }, [usuario]);

  // Recarga al volver de la pantalla de alta: la lista se actualiza sin
  // cerrar sesión ni reiniciar la app.
  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  useEffect(() => {
    let activo = true;
    (async () => {
      if (!actaSeleccionada) { setRecintoCoords(null); return; }
      const r = await contenedor.actas.obtenerRecintoDeJrv(actaSeleccionada.jrvId);
      if (activo && r.ok) setRecintoCoords({ lat: r.valor.lat, lon: r.valor.lon, nombre: r.valor.nombre });
    })();
    return () => { activo = false; };
  }, [actaSeleccionada]);

  // Fotografía original del acta: solo lectura, nunca se reemplaza al corregir.
  useEffect(() => {
    let activo = true;
    const ruta = actaSeleccionada?.fotoPath;
    if (!ruta) return;
    (async () => {
      const sb = obtenerClienteSupabase();
      if (!sb) return;
      const { data, error: e } = await sb.storage.from('actas').createSignedUrl(ruta, 3600);
      if (!activo) return;
      if (e) setError('No se pudo cargar la fotografía original del acta.');
      else setFotoCorreccionUrl(data?.signedUrl ?? null);
    })();
    return () => { activo = false; };
  }, [actaSeleccionada]);

  async function cargarHistorial(jrvId: string) {
    const r = await contenedor.territorio.historialAsignaciones(jrvId);
    if (r.ok) setHistorial(r.valor);
  }

  async function asignar() {
    if (!seleccionada) return;
    setMensaje(null);
    setError(null);
    if (jrvs.find((j) => j.jrvId === seleccionada)?.veedorVigenteId) {
      setError('La JRV ya tiene responsable vigente; use Reemplazar.');
      return;
    }
    const v = validarAsignacion({ jrvId: seleccionada, veedorId: nuevoVeedor, motivo });
    if (!v.ok) { setError(v.error); return; }
    const r = await contenedor.territorio.asignarVeedor(seleccionada, nuevoVeedor, motivo);
    if (!r.ok) { setError(r.error); return; }
    setMensaje('Veedor asignado.');
    setHojaAbierta(false);
    setNuevoVeedor('');
    setMotivo('');
    await cargar();
    await cargarHistorial(seleccionada);
  }

  async function reemplazar() {
    if (!seleccionada) return;
    setMensaje(null);
    setError(null);
    const actual = jrvs.find((j) => j.jrvId === seleccionada)?.veedorVigenteId ?? null;
    const v = validarReemplazo({ jrvId: seleccionada, veedorActualId: actual, nuevoVeedorId: nuevoVeedor, motivo });
    if (!v.ok) { setError(v.error); return; }
    const r = await contenedor.territorio.reemplazarVeedor(seleccionada, nuevoVeedor, motivo);
    if (!r.ok) { setError(r.error); return; }
    setMensaje('Veedor reemplazado (solo esa JRV).');
    setHojaAbierta(false);
    setNuevoVeedor('');
    setMotivo('');
    await cargar();
    await cargarHistorial(seleccionada);
  }

  function abrirCorreccion(acta: Acta) {
    setActaSeleccionada(acta);
    setValoresCorreccion({
      votos: Object.fromEntries(acta.votos.map((v) => [v.organizacionId, String(v.votos)])),
      blancos: String(acta.blancos),
      nulos: String(acta.nulos),
      sufragantes: String(acta.sufragantes),
    });
    setErroresCampo({});
    setMotivoCorreccion('');
    setFotoCorreccionUrl(null);
    setFotoAmpliada(false);
    setError(null);
    setMensaje(null);
  }

  function cancelarCorreccion() {
    setActaSeleccionada(null);
    setValoresCorreccion(null);
    setErroresCampo({});
    setMotivoCorreccion('');
    setFotoCorreccionUrl(null);
    setFotoAmpliada(false);
    setError(null);
  }

  async function corregir() {
    if (!actaSeleccionada || !valoresCorreccion || corrigiendo) return;
    setError(null);
    setMensaje(null);

    // Mismo contrato que el JSON anterior: 5 votos + blancos, nulos y sufragantes.
    const ids = Array.from(new Set([
      ...actaSeleccionada.votos.map((v) => v.organizacionId),
      ...organizaciones.map((o) => o.id),
    ])).slice(0, 5);
    if (ids.length < 5 || ids.some((id) => valoresCorreccion.votos[id] === undefined)) {
      setError('No se pudieron cargar las cinco organizaciones del acta.');
      return;
    }

    const cantidades: Record<string, string> = {
      ...Object.fromEntries(ids.map((id) => [`voto_${id}`, valoresCorreccion.votos[id]])),
      blancos: valoresCorreccion.blancos,
      nulos: valoresCorreccion.nulos,
      sufragantes: valoresCorreccion.sufragantes,
    };
    const nuevosErrores: Record<string, string> = {};
    for (const [campo, valor] of Object.entries(cantidades)) {
      if (!/^\d+$/.test(valor)) nuevosErrores[campo] = 'Ingresa un entero no negativo.';
    }
    if (Object.keys(nuevosErrores).length > 0) {
      setErroresCampo(nuevosErrores);
      return;
    }
    if (!motivoCorreccion.trim()) {
      setError('El motivo de corrección es obligatorio.');
      return;
    }

    setErroresCampo({});
    setCorrigiendo(true);
    try {
      const r = await contenedor.casos.corregirActa.ejecutar({
        operationId: `corr-${Date.now()}`,
        actaId: actaSeleccionada.id,
        expectedVersion: actaSeleccionada.version,
        nuevosValores: {
          votos: ids.map((id) => ({ organizacionId: id, votos: Number(valoresCorreccion.votos[id]) })),
          blancos: Number(valoresCorreccion.blancos),
          nulos: Number(valoresCorreccion.nulos),
          sufragantes: Number(valoresCorreccion.sufragantes),
        },
        motivo: motivoCorreccion,
      });
      if (!r.ok) { setError(r.error); return; }
      if (r.valor.conflicto) {
        const actuales = r.valor.valoresActuales;
        setError(
          `Conflicto de versión: esperada ${r.valor.versionAnterior}, actual ${r.valor.versionNueva}.` +
          (actuales
            ? ` Registros actuales: sufragantes ${actuales.sufragantes}, blancos ${actuales.blancos}, nulos ${actuales.nulos}.`
            : ''),
        );
        return;
      }
      setMensaje(`Corrección aplicada. Versión ${r.valor.versionAnterior} → ${r.valor.versionNueva}.`);
      cancelarCorreccion();
      await cargar();
    } finally {
      setCorrigiendo(false);
    }
  }

  const jrvSeleccionada = jrvs.find((j) => j.jrvId === seleccionada) ?? null;
  const veedoresVisibles = veedoresDisponiblesParaJrv(veedores, jrvSeleccionada);

  const idsCorreccion = actaSeleccionada
    ? Array.from(new Set([
        ...actaSeleccionada.votos.map((v) => v.organizacionId),
        ...organizaciones.map((o) => o.id),
      ])).slice(0, 5)
    : [];
  const camposCorreccion = idsCorreccion.map((id, i) => ({
    id,
    nombre: organizaciones.find((o) => o.id === id)?.nombre ?? `Organización ${i + 1}`,
    original: actaSeleccionada?.votos.find((v) => v.organizacionId === id)?.votos ?? 0,
  }));
  const veedorEncontrado = actaSeleccionada?.capturadoPor
    ? [...veedoresCreados, ...veedores].find((v) => v.id === actaSeleccionada.capturadoPor)
    : undefined;
  const veedorOriginal = veedorEncontrado
    ? `${veedorEncontrado.nombres} ${veedorEncontrado.apellidos}`.trim()
    : null;
  const numeroJrvActa = jrvs.find((j) => j.jrvId === actaSeleccionada?.jrvId)?.numero;

  return (
    <FondoSuave>
      <CabeceraRol rol="COORDINADOR" recinto="Recinto" />
      <ScrollView className="flex-1 px-6 pt-2">
        {cargando && <LottieFeedback tipo="carga" mensaje="Cargando recinto…" />}
        {error && <Text className="mb-3 text-error">{error}</Text>}
        {mensaje && <Text className="mb-3 text-success font-semibold">{mensaje}</Text>}

        <Text className="mb-2 text-lg font-bold text-foreground">Veedores</Text>
        <TarjetaVidrio clase="mb-4 p-3 gap-2">
          <BotonPrincipal titulo="Crear veedor" rol="COORDINADOR" onPress={() => router.push('/(coordinador)/usuarios')} />
          <Text className="text-xs text-texto-secundario">
            Crear la cuenta y asignarla a una JRV son acciones distintas. El veedor recién creado queda PENDIENTE y solo podrá asignarse cuando verifique su correo y cambie la clave temporal.
          </Text>
          {veedoresCreados.length === 0 ? (
            <Text className="text-sm text-texto-secundario">Aún no has creado veedores.</Text>
          ) : veedoresCreados.map((v) => (
            <View key={v.id} className="rounded-lg bg-foreground/5 p-2">
              <Text className="text-sm text-foreground">{v.nombres} {v.apellidos}</Text>
              <Text className={`text-xs ${v.estado === 'ACTIVO' ? 'text-success' : 'text-warning'}`}>
                Estado: {v.estado}{v.estado !== 'ACTIVO' ? ' — no disponible para asignar' : ''}
              </Text>
            </View>
          ))}
        </TarjetaVidrio>

        <Text className="mb-2 text-lg font-bold text-foreground">JRV del recinto</Text>
        <View className="flex-row flex-wrap justify-between">
          {jrvs.map((item) => (
            <Pressable
              key={item.jrvId}
              onPress={() => {
                setSeleccionada(item.jrvId);
                setNuevoVeedor('');
                setMotivo('');
                setError(null);
                setMensaje(null);
                void cargarHistorial(item.jrvId);
                setHojaAbierta(true);
              }}
              className={`w-[48%] mb-3 rounded-22 border p-3 ${seleccionada === item.jrvId ? 'border-primary bg-primary/5' : 'border-white/[0.9] bg-white/[0.72]'} shadow-suave-azul`}
            >
              <Text className="font-semibold text-foreground">JRV {item.numero}</Text>
              <View className="mt-2 self-start rounded-full bg-rol-coordinador/15 px-2 py-1">
                <Text className="text-[11px] font-semibold text-rol-coordinador">
                  {item.veedorVigenteNombre ?? 'Sin veedor'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Text className="mt-4 mb-2 text-lg font-bold text-foreground">Actas del recinto</Text>
        {actas.map((a) => (
          <TarjetaVidrio key={a.id} clase="mb-3 p-3">
            <Text className="font-semibold text-foreground">{a.dignidad} · JRV {a.jrvId.slice(0, 8)} · v{a.version}</Text>
            <View className="mt-2"><StatusBadge estado={a.estado as any} /></View>
            <Pressable onPress={() => abrirCorreccion(a)} className="mt-2">
              <Text className="text-accent font-semibold">Corregir</Text>
            </Pressable>
          </TarjetaVidrio>
        ))}

        {actaSeleccionada && valoresCorreccion && (
          <TarjetaVidrio clase="mt-2 gap-3 p-4">
            <View>
              <Text className="text-lg font-bold text-foreground">Corregir acta</Text>
              <Text className="text-sm text-texto-secundario">
                {recintoCoords?.nombre ?? 'Recinto'} · {numeroJrvActa ? `JRV ${numeroJrvActa}` : 'JRV del recinto'} ·{' '}
                {actaSeleccionada.dignidad === 'PREFECTURA' ? 'Prefectura' : 'Alcaldía'}
              </Text>
              <Text className="mt-1 text-xs text-texto-secundario">
                Acta #{actaSeleccionada.id.slice(0, 8)} · Registrada: {actaSeleccionada.capturedAt} · Versión {actaSeleccionada.version}
              </Text>
              {veedorOriginal ? (
                <Text className="mt-1 text-xs text-texto-secundario">Registrada por: {veedorOriginal}</Text>
              ) : null}
              <View className="mt-2"><StatusBadge estado={actaSeleccionada.estado as any} /></View>
            </View>

            <View className="gap-2">
              <Text className="font-semibold text-foreground">Evidencia original</Text>
              {fotoCorreccionUrl ? (
                <Pressable
                  onPress={() => setFotoAmpliada(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Ampliar fotografía original"
                  className="overflow-hidden rounded-xl"
                >
                  <Image source={{ uri: fotoCorreccionUrl }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
                  <Text className="mt-1 text-xs text-accent">Toca para ampliar</Text>
                </Pressable>
              ) : (
                <View className="rounded-xl bg-foreground/5 p-3">
                  <Text className="text-sm text-texto-secundario">
                    El acta no tiene fotografía asociada. La corrección no añade ni reemplaza evidencia.
                  </Text>
                </View>
              )}
            </View>

            <View>
              <Text className="mb-1 font-semibold text-foreground">Datos electorales</Text>
              <Text className="mb-2 text-xs text-texto-secundario">
                Los valores originales se muestran como referencia. Ajusta únicamente lo que necesites corregir.
              </Text>
              <View className="flex-row flex-wrap justify-between">
                {camposCorreccion.map((campo) => {
                  const clave = `voto_${campo.id}`;
                  return (
                    <View key={campo.id} className="w-[48%]">
                      <CampoNumerico
                        etiqueta={campo.nombre}
                        valor={valoresCorreccion.votos[campo.id] ?? ''}
                        placeholder={`Original: ${campo.original}`}
                        error={erroresCampo[clave]}
                        onChangeText={(texto) => setValoresCorreccion((v) => v ? {
                          ...v,
                          votos: { ...v.votos, [campo.id]: texto },
                        } : v)}
                      />
                    </View>
                  );
                })}
              </View>
              <View className="flex-row flex-wrap justify-between">
                <View className="w-[48%]">
                  <CampoNumerico
                    etiqueta="Votos en blanco"
                    valor={valoresCorreccion.blancos}
                    placeholder={`Original: ${actaSeleccionada.blancos}`}
                    error={erroresCampo.blancos}
                    onChangeText={(texto) => setValoresCorreccion((v) => v ? { ...v, blancos: texto } : v)}
                  />
                </View>
                <View className="w-[48%]">
                  <CampoNumerico
                    etiqueta="Votos nulos"
                    valor={valoresCorreccion.nulos}
                    placeholder={`Original: ${actaSeleccionada.nulos}`}
                    error={erroresCampo.nulos}
                    onChangeText={(texto) => setValoresCorreccion((v) => v ? { ...v, nulos: texto } : v)}
                  />
                </View>
                <View className="w-full">
                  <CampoNumerico
                    etiqueta="Sufragantes"
                    valor={valoresCorreccion.sufragantes}
                    placeholder={`Original: ${actaSeleccionada.sufragantes}`}
                    error={erroresCampo.sufragantes}
                    onChangeText={(texto) => setValoresCorreccion((v) => v ? { ...v, sufragantes: texto } : v)}
                  />
                </View>
              </View>
            </View>

            {recintoCoords ? (
              <VisorUbicacion
                captura={{ lat: actaSeleccionada.lat ?? 0, lon: actaSeleccionada.lon ?? 0, precisionM: actaSeleccionada.accuracy ?? null, capturadaEn: actaSeleccionada.capturedAt }}
                recinto={recintoCoords}
              />
            ) : null}

            <View>
              <Text className="mb-1 font-semibold text-foreground">Motivo de la corrección</Text>
              <TextInput
                placeholder="Indica qué dato se corrige y por qué se solicita el cambio."
                placeholderTextColor={TOKENS.textoSecundario}
                value={motivoCorreccion}
                onChangeText={setMotivoCorreccion}
                className="min-h-24 rounded-xl border border-foreground/20 bg-white/70 p-3 text-base text-foreground"
                multiline
              />
            </View>

            <View className="gap-2">
              <BotonPrincipal
                titulo={corrigiendo ? 'Guardando corrección…' : 'Guardar corrección'}
                rol="COORDINADOR"
                disabled={corrigiendo}
                onPress={() => void corregir()}
              />
              <Pressable
                onPress={cancelarCorreccion}
                disabled={corrigiendo}
                accessibilityRole="button"
                accessibilityLabel="Cancelar corrección"
                className="items-center justify-center rounded-22 border border-accent/40 bg-white/60 py-4 active:opacity-80"
              >
                <Text className="text-base font-semibold text-accent">Cancelar</Text>
              </Pressable>
            </View>
          </TarjetaVidrio>
        )}

        <View className="mt-6 pb-8">
          <Pressable onPress={() => limpiar()} className="items-center py-3">
            <Text className="text-sm font-semibold text-texto-secundario">Cerrar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>

      {fotoAmpliada && fotoCorreccionUrl ? (
        <View className="absolute inset-0 z-50 items-center justify-center bg-background/95 p-4">
          <Pressable
            onPress={() => setFotoAmpliada(false)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar fotografía ampliada"
            className="absolute right-5 top-12 rounded-full bg-foreground/10 px-4 py-2"
          >
            <Text className="font-semibold text-foreground">Cerrar</Text>
          </Pressable>
          <Image source={{ uri: fotoCorreccionUrl }} style={{ width: '100%', height: '70%' }} resizeMode="contain" />
          <Text className="mt-3 text-sm text-texto-secundario">Fotografía original del acta</Text>
        </View>
      ) : null}

      {hojaAbierta && seleccionada && (
        <View className="absolute inset-0">
          <BottomSheetVidrio visible={hojaAbierta} onCerrar={() => setHojaAbierta(false)}>
            <Text className="text-lg font-bold text-foreground mb-1">JRV {jrvSeleccionada?.numero}</Text>
            <Text className="text-sm text-texto-secundario mb-1">
              Responsable vigente: {jrvSeleccionada?.veedorVigenteNombre ?? 'Sin veedor'}
            </Text>
            <Text className="text-sm text-texto-secundario mb-3">
              {jrvSeleccionada?.veedorVigenteId ? 'Reemplazar al responsable de esta JRV' : 'Asignar un responsable'}
            </Text>
            {veedoresVisibles.length === 0 ? (
              <View className="mb-3 items-center rounded-xl bg-foreground/5 p-4">
                <LottieFeedback tipo="sin-conexion" mensaje="No hay veedores disponibles en tu recinto. Crea un veedor o revisa que esté ACTIVO." />
              </View>
            ) : (
              <View className="mb-2 flex-row flex-wrap gap-2">
                {veedoresVisibles.map((v) => {
                  const asignadas = jrvsVigentesDelVeedor(jrvs, v.id);
                  return (
                    <Pressable
                      key={v.id}
                      onPress={() => setNuevoVeedor(v.id)}
                      className={`rounded-xl px-3 py-2 ${nuevoVeedor === v.id ? 'bg-rol-coordinador' : 'bg-foreground/10'}`}
                    >
                      <Text className={nuevoVeedor === v.id ? 'text-white font-semibold' : 'text-foreground'}>
                        {v.nombres} {v.apellidos}
                      </Text>
                      <Text className={`text-[11px] ${nuevoVeedor === v.id ? 'text-white' : 'text-texto-secundario'}`}>
                        {v.estado} · {asignadas.length > 0 ? `JRV ${asignadas.map((j) => j.numero).join(', ')}` : 'Sin asignaciones'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <TextInput
              placeholder="Motivo (obligatorio)"
              placeholderTextColor={TOKENS.textoSecundario}
              value={motivo}
              onChangeText={setMotivo}
              className="mb-3 h-12 rounded-xl border border-foreground/20 bg-white/70 px-4 text-foreground"
            />
            <View className="gap-2">
              {jrvSeleccionada?.veedorVigenteId ? (
                <BotonPrincipal titulo="Reemplazar veedor" rol="COORDINADOR" onPress={reemplazar} />
              ) : (
                <BotonPrincipal titulo="Asignar veedor" rol="COORDINADOR" onPress={asignar} />
              )}
            </View>
            <Text className="mt-4 mb-1 text-sm font-bold text-foreground">Historial de asignaciones</Text>
            {historial.length === 0 ? (
              <Text className="text-xs text-texto-secundario">Aún no hay asignaciones registradas para esta JRV.</Text>
            ) : historial.map((h) => (
              <View key={h.id} className="mb-1 rounded-lg bg-foreground/5 p-2">
                <Text className="text-xs text-foreground">{h.veedorNombre ?? h.veedorId} · {h.desde} {h.hasta ? `→ ${h.hasta}` : '(vigente)'}</Text>
                <Text className="text-xs text-texto-secundario">Motivo: {h.motivo ?? '-'} · por {h.asignadoPor ?? '-'}</Text>
              </View>
            ))}
          </BottomSheetVidrio>
        </View>
      )}
    </FondoSuave>
  );
}
