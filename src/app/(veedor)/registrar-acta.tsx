import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { z } from 'zod';
import { useForm } from 'react-hook-form';

import { contenedor } from '@/composition';
import { useActaBorradorStore } from '@/modules/actas/presentation/acta-borrador-store';
import { crearZodResolver } from '@/shared/ui/zod-resolver';
import { TOKENS } from '@/shared/ui/theme';
import { BotonPrincipal } from '@/shared/ui/boton-principal';
import { CabeceraRol } from '@/shared/ui/cabecera-rol';
import { FondoSuave } from '@/shared/ui/fondo-suave';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
import { SumaEnVivo } from '@/shared/ui/suma-en-vivo';
import { TarjetaVidrio } from '@/shared/ui/tarjeta-vidrio';

const Esquema = z.object({
  org0: z.string().min(1, 'Requerido'),
  org1: z.string().min(1, 'Requerido'),
  org2: z.string().min(1, 'Requerido'),
  org3: z.string().min(1, 'Requerido'),
  org4: z.string().min(1, 'Requerido'),
  blancos: z.string().min(1, 'Requerido'),
  nulos: z.string().min(1, 'Requerido'),
  sufragantes: z.string().min(1, 'Requerido'),
});

type ValoresForm = z.infer<typeof Esquema>;

function aEntero(v: string): number {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : Math.trunc(n);
}

export default function RegistrarActaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const jrvId = String(params.jrvId ?? '');
  const dignidad = String(params.dignidad ?? 'ALCALDIA');
  const recintoLat = Number(params.recintoLat ?? 0);
  const recintoLon = Number(params.recintoLon ?? 0);
  const recintoNombre = String(params.recintoNombre ?? '');

  const setBorrador = useActaBorradorStore((s) => s.setBorrador);

  const [orgs, setOrgs] = useState<{ id: string; nombre: string; color: string }[]>([]);
  const [cargando, setCargando] = useState(true);

  const {
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<ValoresForm>({
    resolver: crearZodResolver(Esquema) as any,
    defaultValues: { org0: '', org1: '', org2: '', org3: '', org4: '', blancos: '', nulos: '', sufragantes: '' },
  });

  useEffect(() => {
    let activo = true;
    contenedor.actas.listarOrganizaciones().then((res) => {
      if (!activo) return;
      if (res.ok) setOrgs(res.valor);
      setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, []);

  const valores = watch();
  const votosNums = [aEntero(valores.org0), aEntero(valores.org1), aEntero(valores.org2), aEntero(valores.org3), aEntero(valores.org4)];
  const blancos = aEntero(valores.blancos);
  const nulos = aEntero(valores.nulos);
  const sufragantes = aEntero(valores.sufragantes);

  function onSubmit(data: ValoresForm) {
    const borrador = {
      jrvId,
      dignidad: dignidad as any,
      recintoLat,
      recintoLon,
      recintoNombre,
      votos: orgs.map((o, i) => ({
        organizacionId: o.id,
        organizacionNombre: o.nombre,
        votos: aEntero((data as any)[`org${i}`]),
      })),
      blancos: aEntero(data.blancos),
      nulos: aEntero(data.nulos),
      sufragantes: aEntero(data.sufragantes),
    };
    setBorrador(borrador);
    router.push('/(veedor)/captura-foto');
  }

  if (cargando) {
    return (
      <FondoSuave>
        <View className="flex-1 items-center justify-center">
          <LottieFeedback tipo="carga" mensaje="Cargando organizaciones…" />
        </View>
      </FondoSuave>
    );
  }

  return (
    <FondoSuave>
      <CabeceraRol rol="VEEDOR" recinto={recintoNombre || 'Recinto'} jrv={jrvId.slice(0, 4)} />
      <ScrollView className="flex-1 px-6 pt-2">
        <Text className="mb-1 text-2xl font-bold text-foreground">
          Registrar {dignidad === 'ALCALDIA' ? 'alcaldía' : 'prefectura'}
        </Text>
        <Text className="mb-4 text-base text-texto-secundario">{recintoNombre}</Text>

        <TarjetaVidrio clase="p-4 mb-4">
          {orgs.map((o, i) => (
            <View key={o.id} className="mb-3">
              <Text className="mb-1 text-base font-semibold text-foreground">{o.nombre}</Text>
              <TextInput
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={TOKENS.textoSecundario}
                onChangeText={(t) => setValue(`org${i}` as any, t)}
                className="h-14 rounded-xl border border-foreground/20 bg-white/70 px-4 text-lg font-mono text-foreground"
              />
              {errors[`org${i}` as keyof ValoresForm] ? (
                <Text className="mt-1 text-sm text-error">{errors[`org${i}` as keyof ValoresForm]?.message}</Text>
              ) : null}
            </View>
          ))}

          {(['blancos', 'nulos', 'sufragantes'] as const).map((campo) => (
            <View key={campo} className="mb-3">
              <Text className="mb-1 text-base font-semibold capitalize text-foreground">{campo}</Text>
              <TextInput
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={TOKENS.textoSecundario}
                onChangeText={(t) => setValue(campo, t)}
                className="h-14 rounded-xl border border-foreground/20 bg-white/70 px-4 text-lg font-mono text-foreground"
              />
              {errors[campo] ? <Text className="mt-1 text-sm text-error">{errors[campo]?.message}</Text> : null}
            </View>
          ))}
        </TarjetaVidrio>

        <TarjetaVidrio clase="p-4 mb-4 items-center">
          <Text className="mb-2 text-base font-semibold text-foreground">Suma en vivo</Text>
          <SumaEnVivo votos={votosNums} blancos={blancos} nulos={nulos} sufragantes={sufragantes} />
        </TarjetaVidrio>

        <BotonPrincipal titulo="Continuar a la foto" rol="VEEDOR" onPress={handleSubmit(onSubmit as any) as any} />
        <View className="h-10" />
      </ScrollView>
    </FondoSuave>
  );
}
