import { crearZodResolver } from '@/shared/ui/zod-resolver';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { contenedor } from '@/composition';
import { RUTAS_POR_ROL } from '@/modules/auth/domain/roles';
import { useSessionStore } from '@/modules/auth/presentation/session-store';
import { BotonPrincipal } from '@/shared/ui/boton-principal';
import { EntradaOcultaSentry } from '@/shared/ui/entrada-oculta-sentry';
import { FondoSuave } from '@/shared/ui/fondo-suave';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
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
    formState: { errors },
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
      <View className="flex-1 px-6 justify-center">
        <View className="items-center mb-6">
          <EntradaOcultaSentry />
          <Text className="mt-2 text-base text-texto-secundario text-center">
            Escrutinio, actas y seguimiento en campo
          </Text>
        </View>

        <TarjetaVidrio clase="p-5 gap-4">
          <Text className="text-2xl font-bold text-foreground">Iniciar sesión</Text>

          {operacion === 'cargando' && <LottieFeedback tipo="carga" mensaje={mensaje ?? 'Cargando…'} />}

          {errorGeneral && (
            <View className="rounded-xl bg-error/10 px-4 py-3">
              <Text className="text-error text-sm font-semibold">{errorGeneral}</Text>
            </View>
          )}

          <View className="gap-1">
            <Text className="text-base font-semibold text-foreground">Correo</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="h-14 rounded-xl border border-foreground/20 bg-white/70 px-4 text-base text-foreground"
                  placeholder="correo@ejemplo.ec"
                  placeholderTextColor="#3B4A78"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.email && <Text className="text-sm text-error">{errors.email.message}</Text>}
          </View>

          <View className="gap-1">
            <Text className="text-base font-semibold text-foreground">Contraseña</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="h-14 rounded-xl border border-foreground/20 bg-white/70 px-4 text-base text-foreground"
                  placeholder="••••••••"
                  placeholderTextColor="#3B4A78"
                  secureTextEntry
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.password && <Text className="text-sm text-error">{errors.password.message}</Text>}
          </View>

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
      </View>
    </FondoSuave>
  );
}
