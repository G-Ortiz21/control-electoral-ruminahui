import { crearZodResolver } from '@/shared/ui/zod-resolver';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
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
import { FondoSuave } from '@/shared/ui/fondo-suave';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
import { OtpCasillas } from '@/shared/ui/otp-casillas';
import { TarjetaVidrio } from '@/shared/ui/tarjeta-vidrio';

const esquemaOtp = z.object({
  email: z.string().min(1, 'El correo es obligatorio.').email('El correo no es válido.'),
});

const esquemaFinal = z.object({
  otp: z.string(),
  nuevaClave: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres.'),
});

type FormOtp = z.infer<typeof esquemaOtp>;
type FormFinal = z.infer<typeof esquemaFinal>;

export default function PrimerIngreso() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const correoConfirmado = params.confirmado === '1';
  const correoInicial = String(params.email ?? '').trim().toLowerCase();
  const setSesion = useSessionStore((s) => s.setSesion);
  const setOperacion = useSessionStore((s) => s.setOperacion);
  const operacion = useSessionStore((s) => s.operacion);
  const mensaje = useSessionStore((s) => s.mensajeOperacion);

  const [paso, setPaso] = useState<'solicitar' | 'verificar'>(correoConfirmado ? 'verificar' : 'solicitar');
  const [email, setEmail] = useState(correoInicial);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const formOtp = useForm<FormOtp>({ resolver: crearZodResolver(esquemaOtp) as never, defaultValues: { email: '' } });
  const formFinal = useForm<FormFinal>({ resolver: crearZodResolver(esquemaFinal) as never, defaultValues: { otp: '', nuevaClave: '' } });
  const { touchedFields: touchedOtp } = formOtp.formState;
  const { touchedFields: touchedFinal } = formFinal.formState;

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
    if (!correoConfirmado && !/^\d{4,8}$/.test(data.otp.trim())) {
      setErrorGeneral('El código OTP debe tener entre 4 y 8 dígitos.');
      return;
    }
    setOperacion('cargando', 'Verificando y activando…');
    const res = await contenedor.casos.completarPrimerIngreso.ejecutar(
      email,
      data.otp,
      data.nuevaClave,
      correoConfirmado,
    );
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
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView className="flex-1 px-6" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 24 }}>
          <TarjetaVidrio clase="w-full gap-5 p-6">
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
              <CampoFormulario
                etiqueta="Correo"
                pista="Obligatorio · correo electrónico válido"
                error={formOtp.formState.errors.email?.message}
                valido={Boolean(touchedOtp.email && !formOtp.formState.errors.email)}
              >
                <Controller
                  control={formOtp.control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <CampoTexto
                      etiqueta="Correo"
                      valor={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      teclado="email-address"
                      placeholder="correo@ejemplo.ec"
                      error={formOtp.formState.errors.email?.message}
                      valido={Boolean(touchedOtp.email && !formOtp.formState.errors.email)}
                    />
                  )}
                />
              </CampoFormulario>
              <BotonPrincipal titulo="Enviar código OTP" onPress={formOtp.handleSubmit(solicitar)} />
            </>
          )}

          {paso === 'verificar' && (
            <>
              <Text className="text-base text-texto-secundario">Correo: {email}</Text>
              {correoConfirmado ? (
                <Text className="text-sm text-success">Correo verificado. Elige tu contraseña definitiva.</Text>
              ) : (
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
              )}
              <CampoFormulario
                etiqueta="Nueva contraseña"
                pista="Obligatorio · mínimo 8 caracteres"
                error={formFinal.formState.errors.nuevaClave?.message}
                valido={Boolean(touchedFinal.nuevaClave && !formFinal.formState.errors.nuevaClave)}
              >
                <Controller
                  control={formFinal.control}
                  name="nuevaClave"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <CampoTexto
                      etiqueta="Nueva contraseña"
                      valor={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      seguro
                      placeholder="••••••••"
                      error={formFinal.formState.errors.nuevaClave?.message}
                      valido={Boolean(touchedFinal.nuevaClave && !formFinal.formState.errors.nuevaClave)}
                    />
                  )}
                />
              </CampoFormulario>
              <BotonPrincipal titulo="Activar cuenta" onPress={formFinal.handleSubmit(finalizar)} />
            </>
          )}
          </TarjetaVidrio>
        </ScrollView>
      </KeyboardAvoidingView>
    </FondoSuave>
  );
}
