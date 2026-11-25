import { crearZodResolver } from '@/shared/ui/zod-resolver';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { z } from 'zod';

import { contenedor } from '@/composition';
import { BotonPrincipal } from '@/shared/ui/boton-principal';
import { CampoFormulario } from '@/shared/ui/campo-formulario';
import { CampoTexto } from '@/shared/ui/campo-texto';
import { FondoSuave } from '@/shared/ui/fondo-suave';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
import { TarjetaVidrio } from '@/shared/ui/tarjeta-vidrio';
import { useSessionStore } from '@/modules/auth/presentation/session-store';

const esquema = z.object({
  email: z.string().min(1, 'El correo es obligatorio.').email('El correo no es válido.'),
});

type Formulario = z.infer<typeof esquema>;

export default function Recuperar() {
  const router = useRouter();
  const setOperacion = useSessionStore((s) => s.setOperacion);
  const operacion = useSessionStore((s) => s.operacion);
  const mensaje = useSessionStore((s) => s.mensajeOperacion);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const { control, handleSubmit, formState: { errors, touchedFields } } = useForm<Formulario>({
    resolver: crearZodResolver(esquema) as never,
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: Formulario) => {
    setErrorGeneral(null);
    setOperacion('cargando', 'Enviando correo de recuperación…');
    const res = await contenedor.casos.recuperarClave.ejecutar(data.email);
    if (!res.ok) {
      setOperacion('error', res.error);
      setErrorGeneral(res.error);
      return;
    }
    setExito(true);
    setOperacion('exito', 'Correo enviado.');
  };

  return (
    <FondoSuave>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView className="flex-1 px-6" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 24 }}>
          <TarjetaVidrio clase="w-full gap-5 p-6">
          <Text className="text-2xl font-bold text-foreground">Recuperar contraseña</Text>
          <Text className="text-base text-texto-secundario">Te enviaremos un enlace a tu correo</Text>

          {operacion === 'cargando' && <LottieFeedback tipo="carga" mensaje={mensaje ?? 'Cargando…'} />}
          {exito && <LottieFeedback tipo="exito" mensaje="Correo de recuperación enviado." />}

          {errorGeneral && (
            <View className="rounded-xl bg-error/10 px-4 py-3">
              <Text className="text-error text-sm font-semibold">{errorGeneral}</Text>
            </View>
          )}

          <CampoFormulario
            etiqueta="Correo"
            pista="Obligatorio · correo electrónico válido"
            error={errors.email?.message}
            valido={Boolean(touchedFields.email && !errors.email)}
          >
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <CampoTexto
                  etiqueta="Correo"
                  valor={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  teclado="email-address"
                  placeholder="correo@ejemplo.ec"
                  error={errors.email?.message}
                  valido={Boolean(touchedFields.email && !errors.email)}
                />
              )}
            />
          </CampoFormulario>

          <BotonPrincipal titulo="Enviar enlace" onPress={handleSubmit(onSubmit)} />
          <Text className="text-center text-sm font-semibold text-accent" onPress={() => router.replace('/login' as Href)}>
            Volver
          </Text>
          </TarjetaVidrio>
        </ScrollView>
      </KeyboardAvoidingView>
    </FondoSuave>
  );
}
