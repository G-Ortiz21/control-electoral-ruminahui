import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { contenedor } from '@/composition';
import { useSessionStore } from '@/modules/auth/presentation/session-store';
import { BotonPrincipal } from '@/shared/ui/boton-principal';
import { TOKENS } from '@/shared/ui/theme';
import { BottomSheetVidrio } from '@/shared/ui/bottom-sheet-vidrio';
import { CabeceraRol } from '@/shared/ui/cabecera-rol';
import { FondoSuave } from '@/shared/ui/fondo-suave';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
import { StatusBadge } from '@/shared/ui/status-badge';
import { TarjetaVidrio } from '@/shared/ui/tarjeta-vidrio';
import { VisorUbicacion } from '@/shared/ui/visor-ubicacion';
import type { JrvRecinto, AsignacionVeedor } from '@/modules/territorio/domain';
import type { Acta } from '@/modules/actas/domain';
import { validarReemplazo, validarAsignacion } from '@/modules/territorio/domain';

export default function RecintoCoordinador() {
  const usuario = useSessionStore((s) => s.usuario);
  const limpiar = useSessionStore((s) => s.limpiar);
  const [jrvs, setJrvs] = useState<JrvRecinto[]>([]);
  const [veedores, setVeedores] = useState<{ id: string; nombres: string; apellidos: string }[]>([]);
  const [actas, setActas] = useState<Acta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [nuevoVeedor, setNuevoVeedor] = useState<string>('');
  const [motivo, setMotivo] = useState('');
  const [historial, setHistorial] = useState<AsignacionVeedor[]>([]);
  const [actaSeleccionada, setActaSeleccionada] = useState<Acta | null>(null);
  const [recintoCoords, setRecintoCoords] = useState<{ lat: number; lon: number; nombre: string } | null>(null);
  const [nuevosValores, setNuevosValores] = useState('');
  const [motivoCorreccion, setMotivoCorreccion] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [hojaAbierta, setHojaAbierta] = useState(false);

  async function cargar() {
    if (!usuario) return;
    setCargando(true);
    setError(null);
    const rRecinto = await contenedor.territorio.obtenerRecintoDelCoordinador(usuario.id);
    if (!rRecinto.ok) { setError(rRecinto.error); setCargando(false); return; }
    const rid = rRecinto.valor;
    const rJrv = await contenedor.territorio.listarJrvDelRecinto(rid);
    if (rJrv.ok) setJrvs(rJrv.valor);
    const rVeed = await contenedor.territorio.listarVeedoresDelRecinto(rid);
    if (rVeed.ok) setVeedores(rVeed.valor);
    const rActas = await contenedor.territorio.listarActasDelRecinto(rid);
    if (rActas.ok) setActas(rActas.valor);
    setCargando(false);
  }

  useEffect(() => {
    (async () => { await cargar(); })();
  }, [usuario]);

  useEffect(() => {
    let activo = true;
    (async () => {
      if (!actaSeleccionada) { setRecintoCoords(null); return; }
      const r = await contenedor.actas.obtenerRecintoDeJrv(actaSeleccionada.jrvId);
      if (activo && r.ok) setRecintoCoords({ lat: r.valor.lat, lon: r.valor.lon, nombre: r.valor.nombre });
    })();
    return () => { activo = false; };
  }, [actaSeleccionada]);

  async function cargarHistorial(jrvId: string) {
    const r = await contenedor.territorio.historialAsignaciones(jrvId);
    if (r.ok) setHistorial(r.valor);
  }

  async function asignar() {
    if (!seleccionada) return;
    const v = validarAsignacion({ jrvId: seleccionada, veedorId: nuevoVeedor, motivo });
    if (!v.ok) { setError(v.error); return; }
    const r = await contenedor.territorio.asignarVeedor(seleccionada, nuevoVeedor, motivo);
    if (!r.ok) { setError(r.error); return; }
    setMensaje('Veedor asignado.');
    setHojaAbierta(false);
    await cargar();
  }

  async function reemplazar() {
    if (!seleccionada) return;
    const actual = jrvs.find((j) => j.jrvId === seleccionada)?.veedorVigenteId ?? null;
    const v = validarReemplazo({ jrvId: seleccionada, veedorActualId: actual, nuevoVeedorId: nuevoVeedor, motivo });
    if (!v.ok) { setError(v.error); return; }
    const r = await contenedor.territorio.reemplazarVeedor(seleccionada, nuevoVeedor, motivo);
    if (!r.ok) { setError(r.error); return; }
    setMensaje('Veedor reemplazado (solo esa JRV).');
    setHojaAbierta(false);
    await cargar();
  }

  async function corregir() {
    if (!actaSeleccionada) return;
    let valores: any;
    try { valores = JSON.parse(nuevosValores); } catch { setError('JSON inválido.'); return; }
    const r = await contenedor.casos.corregirActa.ejecutar({
      operationId: `corr-${Date.now()}`,
      actaId: actaSeleccionada.id,
      expectedVersion: actaSeleccionada.version,
      nuevosValores: {
        votos: valores.votos,
        blancos: valores.blancos,
        nulos: valores.nulos,
        sufragantes: valores.sufragantes,
      },
      motivo: motivoCorreccion,
    });
    if (!r.ok) { setError(r.error); return; }
    if (r.valor.conflicto) {
      setError(`Conflicto de versión: esperada ${r.valor.versionAnterior}, actual ${r.valor.versionNueva}. Valores actuales: ${JSON.stringify(r.valor.valoresActuales)}`);
      return;
    }
    setMensaje('Corrección aplicada.');
    await cargar();
  }

  const jrvSeleccionada = jrvs.find((j) => j.jrvId === seleccionada);

  return (
    <FondoSuave>
      <CabeceraRol rol="COORDINADOR" recinto="Recinto" />
      <ScrollView className="flex-1 px-6 pt-2">
        {cargando && <LottieFeedback tipo="carga" mensaje="Cargando recinto…" />}
        {error && <Text className="mb-3 text-error">{error}</Text>}
        {mensaje && <Text className="mb-3 text-success font-semibold">{mensaje}</Text>}

        <Text className="mb-2 text-lg font-bold text-foreground">JRV del recinto</Text>
        <View className="flex-row flex-wrap justify-between">
          {jrvs.map((item) => (
            <Pressable
              key={item.jrvId}
              onPress={() => { setSeleccionada(item.jrvId); void cargarHistorial(item.jrvId); setHojaAbierta(true); }}
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
            <Pressable onPress={() => setActaSeleccionada(a)} className="mt-2">
              <Text className="text-accent font-semibold">Corregir</Text>
            </Pressable>
          </TarjetaVidrio>
        ))}

        {actaSeleccionada && (
          <TarjetaVidrio clase="mt-2 p-4">
            <Text className="mb-2 font-bold text-foreground">Corregir acta {actaSeleccionada.id.slice(0, 8)}</Text>
            <Text className="mb-1 text-xs text-texto-secundario">Valores anteriores: sufragantes {actaSeleccionada.sufragantes}, blancos {actaSeleccionada.blancos}, nulos {actaSeleccionada.nulos}</Text>
            {recintoCoords ? (
              <VisorUbicacion
                captura={{ lat: actaSeleccionada.lat ?? 0, lon: actaSeleccionada.lon ?? 0, precisionM: actaSeleccionada.accuracy ?? null, capturadaEn: actaSeleccionada.capturedAt }}
                recinto={recintoCoords}
              />
            ) : null}
            <TextInput
              placeholder='{"votos":[...],"blancos":0,"nulos":0,"sufragantes":0}'
              placeholderTextColor={TOKENS.textoSecundario}
              value={nuevosValores}
              onChangeText={setNuevosValores}
              className="mb-2 h-20 rounded-xl border border-foreground/20 bg-white/70 px-4 text-foreground"
              multiline
            />
            <TextInput
              placeholder="Motivo"
              placeholderTextColor={TOKENS.textoSecundario}
              value={motivoCorreccion}
              onChangeText={setMotivoCorreccion}
              className="mb-3 h-12 rounded-xl border border-foreground/20 bg-white/70 px-4 text-foreground"
            />
            <BotonPrincipal titulo="Aplicar corrección" rol="COORDINADOR" onPress={corregir} />
          </TarjetaVidrio>
        )}

        <View className="mt-6 pb-8">
          <Pressable onPress={() => limpiar()} className="items-center py-3">
            <Text className="text-sm font-semibold text-texto-secundario">Cerrar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>

      {hojaAbierta && seleccionada && (
        <View className="absolute inset-0">
          <BottomSheetVidrio visible={hojaAbierta} onCerrar={() => setHojaAbierta(false)}>
            <Text className="text-lg font-bold text-foreground mb-1">JRV {jrvSeleccionada?.numero}</Text>
            <Text className="text-sm text-texto-secundario mb-3">Asignar o reemplazar veedor</Text>
            <View className="mb-2 flex-row flex-wrap gap-2">
              {veedores.map((v) => (
                <Pressable
                  key={v.id}
                  onPress={() => setNuevoVeedor(v.id)}
                  className={`rounded-full px-3 py-2 ${nuevoVeedor === v.id ? 'bg-rol-coordinador' : 'bg-foreground/10'}`}
                >
                  <Text className={nuevoVeedor === v.id ? 'text-white font-semibold' : 'text-foreground'}>{v.nombres} {v.apellidos}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              placeholder="Motivo"
              placeholderTextColor={TOKENS.textoSecundario}
              value={motivo}
              onChangeText={setMotivo}
              className="mb-3 h-12 rounded-xl border border-foreground/20 bg-white/70 px-4 text-foreground"
            />
            <View className="gap-2">
              <BotonPrincipal titulo="Asignar veedor" rol="COORDINADOR" onPress={asignar} />
              <BotonPrincipal titulo="Reemplazar veedor" rol="COORDINADOR" onPress={reemplazar} />
            </View>
            <Text className="mt-4 mb-1 text-sm font-bold text-foreground">Historial de asignaciones</Text>
            {historial.map((h) => (
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
