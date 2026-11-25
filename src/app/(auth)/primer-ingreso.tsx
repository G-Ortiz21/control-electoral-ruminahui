import { crearZodResolver } from '@/shared/ui/zod-resolver';
import { TOKENS } from '@/shared/ui/theme';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { contenedor } from '@/composition';
import { RUTAS_POR_ROL } from '@/modules/auth/domain/roles';
import { useSessionStore } from '@/modules/auth/presentation/session-store';
import { BotonPrincipal } from '@/shared/ui/boton-principal';
import { FondoSuave } from '@/shared/ui/fondo-suave';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
import { OtpCasillas } from '@/shared/ui/otp-casillas';
import { TarjetaVidrio } from '@/shared/ui/tarjeta-vidrio';

const esquemaOtp = z.object({
  email: z.string().min(1, 'El correo es obligatorio.').email('El correo no es válido.'),
});

const esquemaFinal = z.object({
  otp: z.string().min(4, 'El código OTP debe tener entre 4 y 8 dígitos.').max(8),
  nuevaClave: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres.'),
});

type FormOtp = z.infer<typeof esquemaOtp>;
type FormFinal = z.infer<typeof esquemaFinal>;

export default function PrimerIngreso() {
  const router = useRouter();
  const setSesion = useSessionStore((s) => s.setSesion);
  const setOperacion = useSessionStore((s) => s.setOperacion);
  const operacion = useSessionStore((s) => s.operacion);
  const mensaje = useSessionStore((s) => s.mensajeOperacion);

  const [paso, setPaso] = useState<'solicitar' | 'verificar'>('solicitar');
  const [email, setEmail] = useState('');
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const formOtp = useForm<FormOtp>({ resolver: crearZodResolver(esquemaOtp) as never, defaultValues: { email: '' } });
  const formFinal = useForm<FormFinal>({ resolver: crearZodResolver(esquemaFinal) as never, defaultValues: { otp: '', nuevaClave: '' } });

  const solicitar = async (data: FormOtp) => {
    setErrorGeneral(null);
    setOperacion('cargando', 'Enviando código OTP…');
    const res = await contenedor.auth.enviarOtp(data.email.trim().toLowerCase());
    if (!res.ok) {
      setOperacion('error', res.error);
      setErrorGeneral(res.error);
      return;
    }
    setEmail(data.email.trim().toLowerCase());
    setPaso('verificar');
    setOperacion('exito', 'Código enviado al correo.');
  };

  const finalizar = async (data: FormFinal) => {
    setErrorGeneral(null);
    setOperacion('cargando', 'Verificando y activando…');
    const res = await contenedor.casos.completarPrimerIngreso.ejecutar(email, data.otp, data.nuevaClave);
    if (!res.ok) {
      setOperacion('error', res.error);
      setErrorGeneral(res.error);
      return;
    }
    const perfil = await contenedor.usuarios.obtenerPerfilActual();
    if (perfil.ok && perfil.valor) {
      setSesion(perfil.valor);
      setOperacion('exito', 'Cuenta activada.');
      if (perfil.valor.estado === 'ACTIVO') {
        router.replace(RUTAS_POR_ROL[perfil.valor.rol] as Href);
        return;
      }
    }
    setOperacion('exito', 'Cuenta activada.');
    router.replace('/login' as Href);
  };

  return (
    <FondoSuave>
      <View className="flex-1 px-6 justify-center">
        <TarjetaVidrio clase="p-5 gap-4">
          <Text className="text-2xl font-bold text-foreground">Primer ingreso</Text>
          <Text className="text-base text-texto-secundario">Verifica tu correo y establece tu contraseña</Text>

          {operacion === 'cargando' && <LottieFeedback tipo="carga" mensaje={mensaje ?? 'Cargando…'} />}

          {errorGeneral && (
            <View className="rounded-xl bg-error/10 px-4 py-3">
              <Text className="text-error text-sm font-semibold">{errorGeneral}</Text>
            </View>
          )}

          {paso === 'solicitar' && (
            <>
              <View className="gap-1">
                <Text className="text-base font-semibold text-foreground">Correo</Text>
                <Controller
                  control={formOtp.control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="h-14 rounded-xl border border-foreground/20 bg-white/70 px-4 text-base text-foreground"
                      placeholder="correo@ejemplo.ec"
                      placeholderTextColor={TOKENS.textoSecundario}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                {formOtp.formState.errors.email && (
                  <Text className="text-sm text-error">{formOtp.formState.errors.email.message}</Text>
                )}
              </View>
              <BotonPrincipal titulo="Enviar código OTP" onPress={formOtp.handleSubmit(solicitar)} />
            </>
          )}

          {paso === 'verificar' && (
            <>
              <Text className="text-base text-texto-secundario">Correo: {email}</Text>
              <View className="gap-2">
                <Text className="text-base font-semibold text-foreground">Código OTP</Text>
                <Controller
                  control={formFinal.control}
                  name="otp"
                  render={({ field: { onChange, value } }) => (
                    <OtpCasillas valor={value} onChange={onChange} error={formFinal.formState.errors.otp?.message} />
                  )}
                />
              </View>
              <View className="gap-1">
                <Text className="text-base font-semibold text-foreground">Nueva contraseña</Text>
                <Controller
                  control={formFinal.control}
                  name="nuevaClave"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="h-14 rounded-xl border border-foreground/20 bg-white/70 px-4 text-base text-foreground"
                      placeholder="••••••••"
                      placeholderTextColor={TOKENS.textoSecundario}
                      secureTextEntry
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                {formFinal.formState.errors.nuevaClave && (
                  <Text className="text-sm text-error">{formFinal.formState.errors.nuevaClave.message}</Text>
                )}
              </View>
              <BotonPrincipal titulo="Activar cuenta" onPress={formFinal.handleSubmit(finalizar)} />
            </>
          )}
        </TarjetaVidrio>
      </View>
    </FondoSuave>
  );
}
