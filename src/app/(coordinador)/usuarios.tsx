import { Text, View } from 'react-native';

import { GestionUsuarios } from '@/modules/auth/presentation';
import { CabeceraRol } from '@/shared/ui/cabecera-rol';
import { FondoSuave } from '@/shared/ui/fondo-suave';

export default function UsuariosCoordinador() {
  return (
    <FondoSuave>
      <CabeceraRol rol="COORDINADOR" recinto="Gestión de veedores" />
      <GestionUsuarios />
    </FondoSuave>
  );
}
