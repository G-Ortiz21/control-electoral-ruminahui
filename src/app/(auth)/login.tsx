import { crearZodResolver } from '@/shared/ui/zod-resolver';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { z } from 'zod';

import { contenedor } from '@/composition';
import { RUTAS_POR_ROL } from '@/modules/auth/domain/roles';
import { useSessionStore } from '@/modules/auth/presentation/session-store';
import { BotonPrincipal } from '@/shared/ui/boton-principal';
import { CampoFormulario } from '@/shared/ui/campo-formulario';
import { CampoTexto } from '@/shared/ui/campo-texto';
import { EntradaOcultaSentry } from '@/shared/ui/entrada-oculta-sentry';
import { FondoSuave } from '@/shared/ui/fondo-suave';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
import { PieDatosPrueba } from '@/shared/ui/pie-datos-prueba';
import { TarjetaVidrio } from '@/shared/ui/tarjeta-vidrio';

const esquema = z.object({
  email: z.string().min(1, 'El correo es obligatorio.').email('El correo no es válido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
});

type Formulario = z.infer<typeof esquema>;

export default function Login() {
  const router = useRouter();
  const setSesion = useSessionStore((s) => s.setSesion);
  const setOperacion = useSessionStore((s) => s.setOperacion);
  const operacion = useSessionStore((s) => s.operacion);
  const mensaje = useSessionStore((s) => s.mensajeOperacion);

  const {
    control,
    handleSubmit,
    formState: { errors, touchedFields },
  } = useForm<Formulario>({
    resolver: crearZodResolver(esquema) as never,
    defaultValues: { email: '', password: '' },
  });

  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const onSubmit = async (data: Formulario) => {
    setErrorGeneral(null);
    setOperacion('cargando', 'Iniciando sesión…');
    const res = await contenedor.casos.iniciarSesion.ejecutar(data.email, data.password);
    if (!res.ok) {
      setOperacion('error', res.error);
      setErrorGeneral(res.error);
      return;
    }
    setSesion(res.valor.usuario);
    setOperacion('exito', 'Sesión iniciada.');
    const u = res.valor.usuario;
    if (u.estado === 'PENDIENTE') {
      router.replace('/(auth)/primer-ingreso' as Href);
    } else {
      router.replace(RUTAS_POR_ROL[u.rol] as Href);
    }
  };

  return (
    <FondoSuave>
      <View className="flex-1">
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView className="flex-1 px-6" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 24 }}>
            <View className="items-center mb-6">
          <EntradaOcultaSentry />
          <Text className="mt-2 text-base text-texto-secundario text-center">
            Escrutinio, actas y seguimiento en campo
          </Text>
        </View>

        <TarjetaVidrio clase="w-full gap-5 p-6">
          <Text className="text-2xl font-bold text-foreground">Iniciar sesión</Text>

          {operacion === 'cargando' && <LottieFeedback tipo="carga" mensaje={mensaje ?? 'Cargando…'} />}

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

          <CampoFormulario
            etiqueta="Contraseña"
            pista="Obligatorio"
            error={errors.password?.message}
            valido={Boolean(touchedFields.password && !errors.password)}
          >
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <CampoTexto
                  etiqueta="Contraseña"
                  valor={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  seguro
                  placeholder="••••••••"
                  error={errors.password?.message}
                  valido={Boolean(touchedFields.password && !errors.password)}
                />
              )}
            />
          </CampoFormulario>

          <BotonPrincipal titulo="Iniciar sesión" onPress={handleSubmit(onSubmit)} />

          <View className="gap-2">
            <Text
              className="text-center text-sm font-semibold text-accent"
              onPress={() => router.push('/(auth)/recuperar' as Href)}
            >
              Recuperar contraseña
            </Text>
            <Text
              className="text-center text-sm font-semibold text-accent"
              onPress={() => router.push('/(auth)/primer-ingreso' as Href)}
            >
              Primer ingreso (OTP)
            </Text>
          </View>
          </TarjetaVidrio>
          </ScrollView>
        </KeyboardAvoidingView>
        <PieDatosPrueba />
      </View>
    </FondoSuave>
  );
}
