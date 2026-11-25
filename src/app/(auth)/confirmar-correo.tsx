import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { contenedor } from '@/composition';
import { BotonPrincipal } from '@/shared/ui/boton-principal';
import { FondoSuave } from '@/shared/ui/fondo-suave';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
import { TarjetaVidrio } from '@/shared/ui/tarjeta-vidrio';

/**
 * Destino de `emailRedirectTo` configurado en crear-usuario:
 * controlelectoralruminahui://confirmar-correo
 * Confirma el correo y deja la sesión lista para cambiar la clave temporal.
 * No activa el perfil: eso lo hace activar-perfil tras el cambio de clave.
 */
export default function ConfirmarCorreo() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const procesado = useRef(false);
  const [estado, setEstado] = useState<'procesando' | 'confirmado' | 'error'>('procesando');
  const [error, setError] = useState<string | null>(null);

  const tokenHash = typeof params.token_hash === 'string' ? params.token_hash : null;
  const accessToken = typeof params.access_token === 'string' ? params.access_token : null;
  const refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : null;
  const email = typeof params.email === 'string' ? params.email : '';

  useEffect(() => {
    let activo = true;
    if (procesado.current) return;
    procesado.current = true;
    (async () => {
      const res = await contenedor.auth.confirmarCorreoEnlace({
        tokenHash,
        accessToken,
        refreshToken,
      });
      if (!activo) return;
      if (!res.ok) {
        setError(res.error);
        setEstado('error');
        return;
      }
      setEstado('confirmado');
    })();
    return () => { activo = false; };
  }, [tokenHash, accessToken, refreshToken]);

  const continuar = () => router.replace({
    pathname: '/(auth)/primer-ingreso',
    params: { confirmado: '1', email },
  } as Href);

  return (
    <FondoSuave>
      <View className="flex-1 items-center justify-center px-6">
        <TarjetaVidrio clase="w-full gap-4 p-5">
          {estado === 'procesando' && (
            <LottieFeedback tipo="carga" mensaje="Confirmando tu correo…" />
          )}
          {estado === 'confirmado' && (
            <>
              <LottieFeedback tipo="exito" mensaje="Correo confirmado. Ahora elige tu contraseña definitiva." />
              <BotonPrincipal titulo="Continuar" onPress={continuar} />
            </>
          )}
          {estado === 'error' && (
            <>
              <LottieFeedback tipo="error" mensaje={error ?? 'No se pudo confirmar el correo.'} />
              <Text className="text-center text-sm text-texto-secundario">
                Puedes volver a solicitar el código desde el primer ingreso.
              </Text>
              <BotonPrincipal
                titulo="Solicitar código OTP"
                onPress={() => router.replace('/(auth)/primer-ingreso' as Href)}
              />
            </>
          )}
        </TarjetaVidrio>
      </View>
    </FondoSuave>
  );
}
