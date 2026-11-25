import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import { GestionUsuarios } from '@/modules/auth/presentation';
import { BotonPrincipal } from '@/shared/ui/boton-principal';
import { CabeceraRol } from '@/shared/ui/cabecera-rol';
import { FondoSuave } from '@/shared/ui/fondo-suave';

/**
 * RF-04/ADR-04: el coordinador de recinto crea sus veedores. Se reutiliza el
 * mismo componente y Edge Function que el provincial; el servidor deriva el
 * rol VEEDOR y valida el recinto vigente del creador.
 */
export default function UsuariosCoordinador() {
  const router = useRouter();

  return (
    <FondoSuave>
      <CabeceraRol rol="COORDINADOR" recinto="Gestión de veedores" titulo="Crear veedor" />
      <GestionUsuarios
        titulo="Alta de veedor"
        encabezado={
          <Text className="text-sm text-texto-secundario">
            La cuenta queda PENDIENTE: el veedor debe verificar su correo y cambiar la clave temporal antes de acceder a las actas. Aparecerá como disponible solo cuando esté ACTIVO.
          </Text>
        }
        pie={<BotonPrincipal titulo="Volver al recinto" rol="COORDINADOR" onPress={() => router.back()} />}
      />
    </FondoSuave>
  );
}
