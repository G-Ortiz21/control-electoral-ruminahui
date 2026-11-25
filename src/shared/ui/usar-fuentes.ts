import * as Font from 'expo-font';
import { useEffect, useState } from 'react';

/**
 * Familias tipográficas (DI-05 revisión 2):
 * - Space Grotesk: títulos.
 * - JetBrains Mono: cifras, porcentajes y JRV.
 * - Cuerpo: fuente del sistema.
 * Archivos .ttf locales en assets/fonts cargados con expo-font.
 */
export const FUENTES = {
  titulos: 'SpaceGrotesk',
  cifras: 'JetBrainsMono',
} as const;

export function usarFuentes(): boolean {
  const [cargadas, setCargadas] = useState(false);

  useEffect(() => {
    let activo = true;
    Font.loadAsync({
      SpaceGrotesk: require('../../../assets/fonts/SpaceGrotesk-Variable.ttf'),
      JetBrainsMono: require('../../../assets/fonts/JetBrainsMono-Variable.ttf'),
    })
      .then(() => { if (activo) setCargadas(true); })
      .catch(() => { if (activo) setCargadas(true); }); // falla suave: el sistema sigue siendo legible
    return () => { activo = false; };
  }, []);

  return cargadas;
}
