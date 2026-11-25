import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { contenedor } from '@/composition';
import { useSessionStore } from '@/modules/auth/presentation/session-store';
import { sincronizarCatalogo } from '@/modules/territorio/data';
import type { MesaVeedor } from '@/modules/actas/domain';
import { BotonPrincipal } from '@/shared/ui/boton-principal';
import { TOKENS } from '@/shared/ui/theme';
import { CabeceraRol } from '@/shared/ui/cabecera-rol';
import { FondoSuave } from '@/shared/ui/fondo-suave';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
import { TarjetaVidrio } from '@/shared/ui/tarjeta-vidrio';

function MiniAnilloJrv({ completadas, total }: { completadas: number; total: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const frac = total <= 0 ? 0 : Math.min(1, completadas / total);
  return (
    <View className="items-center justify-center">
      <Svg width={44} height={44}>
        <Circle cx={22} cy={22} r={r} stroke={TOKENS.bordeSuave} strokeWidth={5} fill="none" />
        <Circle
          cx={22}
          cy={22}
          r={r}
          stroke={TOKENS.acento}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c},${c}`}
          strokeDashoffset={c * (1 - frac)}
        />
      </Svg>
      <Text className="absolute text-[10px] font-mono font-bold text-foreground">{completadas}/{total}</Text>
    </View>
  );
}

export default function MisMesasVeedor() {
  const router = useRouter();
  const usuario = useSessionStore((s) => s.usuario);
  const limpiar = useSessionStore((s) => s.limpiar);

  const [mesas, setMesas] = useState<MesaVeedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sincronizarCatalogo(contenedor.auth).catch(() => {});
    let activo = true;
    async function cargar() {
      if (!usuario) return;
      setCargando(true);
      const res = await contenedor.actas.listarMesasDelVeedor(usuario.id);
      if (!activo) return;
      if (res.ok) setMesas(res.valor);
      else setError(res.error);
      setCargando(false);
    }
    cargar();
    return () => {
      activo = false;
    };
  }, [usuario]);

  return (
    <FondoSuave>
      <CabeceraRol rol="VEEDOR" recinto="Mis mesas" />
      <ScrollView className="flex-1 px-6 pt-2">
        {cargando ? (
          <LottieFeedback tipo="carga" mensaje="Cargando mesas asignadas…" />
        ) : error ? (
          <LottieFeedback tipo="error" mensaje={error} />
        ) : mesas.length === 0 ? (
          <LottieFeedback tipo="sin-conexion" mensaje="No hay mesas asignadas." />
        ) : (
          mesas.map((m) => (
            <TarjetaVidrio key={m.jrvId} clase="mb-4 p-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-foreground">JRV {m.numero}</Text>
                  <Text className="text-base text-texto-secundario">{m.recinto.nombre}</Text>
                </View>
                <MiniAnilloJrv completadas={0} total={2} />
              </View>
              <View className="mt-3 flex-row gap-2">
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/(veedor)/registrar-acta',
                      params: {
                        jrvId: m.jrvId,
                        dignidad: 'ALCALDIA',
                        recintoLat: String(m.recinto.lat),
                        recintoLon: String(m.recinto.lon),
                        recintoNombre: m.recinto.nombre,
                      },
                    })
                  }
                  className="flex-1 rounded-xl bg-primary px-3 py-3"
                >
                  <Text className="text-center text-base font-semibold text-white">Alcaldía</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/(veedor)/registrar-acta',
                      params: {
                        jrvId: m.jrvId,
                        dignidad: 'PREFECTURA',
                        recintoLat: String(m.recinto.lat),
                        recintoLon: String(m.recinto.lon),
                        recintoNombre: m.recinto.nombre,
                      },
                    })
                  }
                  className="flex-1 rounded-xl bg-accent px-3 py-3"
                >
                  <Text className="text-center text-base font-semibold text-white">Prefectura</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => router.push({ pathname: '/(veedor)/detalle-acta', params: { jrvId: m.jrvId } })}
                className="mt-2"
              >
                <Text className="text-center text-sm font-semibold text-accent">Ver detalle del acta</Text>
              </Pressable>
            </TarjetaVidrio>
          ))
        )}
        <View className="mt-4 gap-2 pb-8">
          <BotonPrincipal titulo="Estado de envíos" rol="VEEDOR" onPress={() => router.push('/(veedor)/estado-envios')} />
          <Pressable onPress={() => limpiar()} className="items-center py-3">
            <Text className="text-sm font-semibold text-texto-secundario">Cerrar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </FondoSuave>
  );
}
