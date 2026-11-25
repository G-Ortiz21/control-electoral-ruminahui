import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { contenedor } from '@/composition';
import { crearZodResolver } from '@/shared/ui/zod-resolver';
import { BotonPrincipal } from '@/shared/ui/boton-principal';
import { CabeceraRol } from '@/shared/ui/cabecera-rol';
import { FondoSuave } from '@/shared/ui/fondo-suave';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
import { StatusBadge } from '@/shared/ui/status-badge';
import { TarjetaVidrio } from '@/shared/ui/tarjeta-vidrio';
import type { Acta } from '@/modules/actas/domain';

const Esquema = z.object({
  org0: z.string().min(1, 'Requerido'),
  org1: z.string().min(1, 'Requerido'),
  org2: z.string().min(1, 'Requerido'),
  org3: z.string().min(1, 'Requerido'),
  org4: z.string().min(1, 'Requerido'),
  blancos: z.string().min(1, 'Requerido'),
  nulos: z.string().min(1, 'Requerido'),
  sufragantes: z.string().min(1, 'Requerido'),
  motivo: z.string().min(3, 'El motivo es obligatorio.'),
});

type ValoresForm = z.infer<typeof Esquema>;

function aEntero(v: string): number {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : Math.trunc(n);
}

export default function CorregirActaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const actaId = String(params.actaId ?? '');

  const [acta, setActa] = useState<Acta | null>(null);
  const [orgs, setOrgs] = useState<{ id: string; nombre: string }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflicto, setConflicto] = useState<any>(null);

  const { setValue, handleSubmit, watch, formState: { errors } } = useForm<ValoresForm>({
    resolver: crearZodResolver(Esquema) as any,
    defaultValues: { org0: '', org1: '', org2: '', org3: '', org4: '', blancos: '', nulos: '', sufragantes: '', motivo: '' },
  });

  useEffect(() => {
    let activo = true;
    (async () => {
      const res = await contenedor.actas.obtenerActa(actaId);
      if (!activo) return;
      if (res.ok) {
        setActa(res.valor);
        const vals = res.valor;
        vals.votos.forEach((v, i) => setValue(`org${i}` as any, String(v.votos)));
        setValue('blancos', String(vals.blancos));
        setValue('nulos', String(vals.nulos));
        setValue('sufragantes', String(vals.sufragantes));
      } else setError(res.error);
      const orgRes = await contenedor.actas.listarOrganizaciones();
      if (orgRes.ok) setOrgs(orgRes.valor);
      setCargando(false);
    })();
    return () => { activo = false; };
  }, [actaId, setValue]);

  const valores = watch();
  const sumaOrgs = aEntero(valores.org0) + aEntero(valores.org1) + aEntero(valores.org2) + aEntero(valores.org3) + aEntero(valores.org4);
  const sumaTotal = sumaOrgs + aEntero(valores.blancos) + aEntero(valores.nulos);

  async function onSubmit(data: ValoresForm) {
    if (!acta) return;
    setError(null);
    setConflicto(null);
    const orgList = orgs.length ? orgs : acta.votos.map((_, i) => ({ id: acta.votos[i].organizacionId, nombre: `Org ${i + 1}` }));
    const res = await contenedor.casos.corregirActa.ejecutar({
      operationId: generarUuid(),
      actaId: acta.id,
      expectedVersion: acta.version,
      nuevosValores: {
        votos: orgList.map((o, i) => ({ organizacionId: o.id, votos: aEntero((data as any)[`org${i}`]) })),
        blancos: aEntero(data.blancos),
        nulos: aEntero(data.nulos),
        sufragantes: aEntero(data.sufragantes),
      },
      motivo: data.motivo,
    });
    if (!res.ok) { setError(res.error); return; }
    if (res.valor.conflicto) { setConflicto(res.valor); return; }
    router.back();
  }

  function generarUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  if (cargando) {
    return (
      <FondoSuave>
        <View className="flex-1 items-center justify-center"><LottieFeedback tipo="carga" mensaje="Cargando acta…" /></View>
      </FondoSuave>
    );
  }
  if (!acta) {
    return (
      <FondoSuave>
        <View className="flex-1 items-center justify-center px-6">
          <LottieFeedback tipo="error" mensaje={error ?? 'Acta no encontrada.'} />
          <BotonPrincipal titulo="Volver" rol="VEEDOR" onPress={() => router.back()} />
        </View>
      </FondoSuave>
    );
  }

  return (
    <FondoSuave>
      <CabeceraRol rol="VEEDOR" recinto="Corrección" />
      <ScrollView className="flex-1 px-6 pt-2">
        <Text className="mb-2 text-2xl font-bold text-foreground">Corregir acta</Text>
        <StatusBadge estado={acta.estado} />

        {conflicto ? (
          <TarjetaVidrio clase="mt-4 p-4 border-error/30">
            <Text className="font-semibold text-error">Conflicto de versión</Text>
            <Text className="text-base text-foreground">Versión esperada: {conflicto.versionAnterior} — versión actual: {conflicto.versionNueva}</Text>
            <Text className="text-base text-foreground">Valores actuales: sufragantes {conflicto.valoresActuales?.sufragantes}, blancos {conflicto.valoresActuales?.blancos}, nulos {conflicto.valoresActuales?.nulos}</Text>
            <Text className="mt-2 text-sm text-texto-secundario">El acta fue modificada por otro usuario. Revise y reintente.</Text>
          </TarjetaVidrio>
        ) : null}

        <TarjetaVidrio clase="mt-4 p-4">
          {orgs.map((o, i) => (
            <View key={o.id} className="mb-3">
              <Text className="mb-1 text-base font-semibold text-foreground">{o.nombre}</Text>
              <TextInput
                keyboardType="numeric"
                onChangeText={(t) => setValue(`org${i}` as any, t)}
                value={valores[`org${i}` as keyof ValoresForm]}
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
                onChangeText={(t) => setValue(campo, t)}
                value={valores[campo]}
                className="h-14 rounded-xl border border-foreground/20 bg-white/70 px-4 text-lg font-mono text-foreground"
              />
              {errors[campo] ? <Text className="mt-1 text-sm text-error">{errors[campo]?.message}</Text> : null}
            </View>
          ))}

          <View className="mb-3">
            <Text className="mb-1 text-base font-semibold text-foreground">Motivo (obligatorio)</Text>
            <TextInput
              onChangeText={(t) => setValue('motivo', t)}
              value={valores.motivo}
              className="h-14 rounded-xl border border-foreground/20 bg-white/70 px-4 text-lg text-foreground"
            />
            {errors.motivo ? <Text className="mt-1 text-sm text-error">{errors.motivo.message}</Text> : null}
          </View>

          <Text className="text-sm text-texto-secundario">Suma: {sumaTotal}</Text>
        </TarjetaVidrio>

        {error ? <Text className="mb-3 mt-2 text-base text-error">{error}</Text> : null}

        <View className="mt-4 pb-8">
          <BotonPrincipal titulo="Guardar corrección" rol="VEEDOR" onPress={handleSubmit(onSubmit as any) as any} />
        </View>
      </ScrollView>
    </FondoSuave>
  );
}
