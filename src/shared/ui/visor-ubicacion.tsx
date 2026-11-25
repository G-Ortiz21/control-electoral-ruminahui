import { WebView } from 'react-native-webview';
import { Text, View } from 'react-native';

import { TarjetaVidrio } from './tarjeta-vidrio';
import {
  construirPropsVisor,
  construirHtmlVisor,
  type CapturaUbicacion,
  type RecintoUbicacion,
  type VisorUbicacionProps,
} from './visor-ubicacion-html';

export type { CapturaUbicacion, RecintoUbicacion, VisorUbicacionProps } from './visor-ubicacion-html';
export { construirPropsVisor, construirHtmlVisor } from './visor-ubicacion-html';

export function VisorUbicacion({ captura, recinto, radioM, conectado }: VisorUbicacionProps) {
  const props = construirPropsVisor({ captura, recinto, radioM, conectado });
  const html = construirHtmlVisor(props);
  const distanciaTxt = props.distanciaM !== null ? `${Math.round(props.distanciaM)} m` : '—';
  const fechaHora = captura.capturadaEn ? new Date(captura.capturadaEn).toLocaleString() : '—';
  const advertencias: string[] = [];
  if (props.distanciaM !== null && props.distanciaM > props.radioM) advertencias.push(`Fuera del radio permitido (${Math.round(props.distanciaM)} m).`);
  if (captura.precisionM !== null && captura.precisionM > 50) advertencias.push('Precisión baja.');

  return (
    <TarjetaVidrio clase="mt-4 gap-3 p-4">
      <View className="gap-1">
        <Text className="text-base font-semibold text-foreground">Ubicación de la captura</Text>
        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
          <View className="flex-row items-center gap-1">
            <View className="h-2.5 w-2.5 rounded-full bg-error" />
            <Text className="text-xs text-texto-secundario">Captura del acta</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View className="h-2.5 w-2.5 rounded-full bg-primary" />
            <Text className="text-xs text-texto-secundario">Recinto: {recinto.nombre}</Text>
          </View>
        </View>
      </View>

      <View className="h-64 overflow-hidden rounded-2xl">
        <WebView
          source={{ html }}
          style={{ flex: 1 }}
          originWhitelist={['about:blank']}
          allowFileAccess={false}
          allowUniversalAccessFromFileURLs={false}
          onShouldStartLoadWithRequest={(req) => req.url === 'about:blank'}
        />
      </View>

      <Text className="text-xs text-texto-secundario">
        {props.conectado
          ? 'Mapa base con conexión; los marcadores también están disponibles sin red.'
          : 'Sin conexión: se muestran los marcadores y los datos disponibles; el mapa base puede no cargar.'}
      </Text>

      <View className="rounded-xl bg-foreground/5 p-3">
        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
          <Text className="text-sm text-foreground">
            Lat: <Text className="font-mono">{captura.lat}</Text> · Lon: <Text className="font-mono">{captura.lon}</Text>
          </Text>
          <Text className="text-sm text-foreground">Precisión: <Text className="font-mono">{captura.precisionM ?? '—'} m</Text></Text>
          <Text className="text-sm text-foreground">Distancia al recinto: <Text className="font-mono">{distanciaTxt}</Text></Text>
          <Text className="text-sm text-foreground">Capturada: <Text className="font-mono">{fechaHora}</Text></Text>
        </View>
        {advertencias.map((w, i) => (
          <Text key={i} className="mt-1 text-sm font-semibold text-warning">{w}</Text>
        ))}
      </View>
    </TarjetaVidrio>
  );
}