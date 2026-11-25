import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { contenedor } from '@/composition';
import type { OperacionSync } from '@/modules/sync/domain';
import { BotonPrincipal } from '@/shared/ui/boton-principal';
import { CabeceraRol } from '@/shared/ui/cabecera-rol';
import { FondoSuave } from '@/shared/ui/fondo-suave';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
import { StepperEstado } from '@/shared/ui/stepper-estado';
import type { EstadoActa } from '@/shared/ui/status-badge';

export default function EstadoEnviosScreen() {
  const router = useRouter();
  const [ops, setOps] = useState<OperacionSync[]>([]);
  const [cargando, setCargando] = useState(true);
  const [reintentando, setReintentando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const lista = await contenedor.sync.outbox.listarPendientes();
    setOps(lista);
    setCargando(false);
  }, []);

  useEffect(() => {
    (async () => { await cargar(); })();
  }, [cargar]);

  async function reintentarTodo() {
    setReintentando(true);
    await contenedor.sync.motor.sincronizarTodo();
    await cargar();
    setReintentando(false);
  }

  async function reintentarUno(operationId: string) {
    setReintentando(true);
    await contenedor.sync.motor.sincronizarOperacion(operationId);
    await cargar();
    setReintentando(false);
  }

  return (
    <FondoSuave>
      <CabeceraRol rol="VEEDOR" recinto="Estado de envíos" />
      <ScrollView className="flex-1 px-6 pt-2">
        {cargando ? (
          <LottieFeedback tipo="carga" mensaje="Cargando envíos…" />
        ) : ops.length === 0 ? (
          <LottieFeedback tipo="sin-conexion" mensaje="No hay operaciones pendientes." />
        ) : (
          ops.map((op) => (
            <View key={op.operationId} className="mb-4 rounded-22 bg-white/[0.75] border border-white/[0.9] p-4 shadow-suave-azul">
              <Text className="text-base font-semibold text-foreground mb-2">
                {op.dignidad} · JRV {op.jrvId.slice(0, 8)}
              </Text>
              <StepperEstado estado={(op.estado === 'PERMISO_REVOCADO' ? 'CONFLICTO_VERSION' : op.estado) as EstadoActa} />
              <Text className="mt-2 text-sm text-texto-secundario">
                Intentos: {op.intentos} {op.ultimoError ? `· ${op.ultimoError}` : ''}
              </Text>
              {!['EVIDENCIA_RESPALDADA', 'CONFLICTO_VERSION', 'PERMISO_REVOCADO'].includes(op.estado) ? (
                <Pressable onPress={() => reintentarUno(op.operationId)} className="mt-3">
                  <Text className="text-center text-sm font-semibold text-accent">Reintentar</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}

        <View className="mt-4 gap-2 pb-8">
          <BotonPrincipal titulo={reintentando ? 'Sincronizando…' : 'Reintentar todo'} rol="VEEDOR" onPress={reintentarTodo} />
          <Pressable onPress={() => router.back()} className="items-center py-3">
            <Text className="text-sm font-semibold text-texto-secundario">Volver</Text>
          </Pressable>
        </View>
      </ScrollView>
    </FondoSuave>
  );
}
