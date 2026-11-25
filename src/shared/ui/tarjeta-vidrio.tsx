import { View } from 'react-native';

import { CLASES } from './theme';

/**
 * Tarjeta de vidrio (DI-05 revisión 2): blanco con opacidad ≥ 0.72 donde haya
 * texto, borde blanco 1px al 90 %, radio 20–24, sombra suave azul. Sin blur real.
 */
export function TarjetaVidrio({ children, clase }: { children: React.ReactNode; clase?: string }) {
  return (
    <View className={`${CLASES.vidrioTexto} ${clase ?? ''}`}>{children}</View>
  );
}
