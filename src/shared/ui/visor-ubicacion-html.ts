import { LEAFLET_CSS, LEAFLET_JS } from './leaflet-html';
import { calcularDistancia } from '@/modules/actas/domain';
import { RADIO_MAX_M } from '@/shared/domain/constantes';

export type CapturaUbicacion = {
  lat: number;
  lon: number;
  precisionM: number | null;
  capturadaEn: string;
};

export type RecintoUbicacion = {
  lat: number;
  lon: number;
  nombre: string;
};

export type VisorUbicacionProps = {
  captura: CapturaUbicacion;
  recinto: RecintoUbicacion;
  radioM?: number;
  conectado?: boolean;
};

export function construirPropsVisor(p: VisorUbicacionProps): {
  captura: CapturaUbicacion;
  recinto: RecintoUbicacion;
  radioM: number;
  conectado: boolean;
  distanciaM: number | null;
} {
  const radioM = p.radioM ?? RADIO_MAX_M;
  const conectado = p.conectado ?? true;
  const distanciaM = calcularDistancia(p.captura.lat, p.captura.lon, p.recinto.lat, p.recinto.lon);
  return { captura: p.captura, recinto: p.recinto, radioM, conectado, distanciaM };
}

export function construirHtmlVisor(props: {
  captura: CapturaUbicacion;
  recinto: RecintoUbicacion;
  radioM: number;
  conectado: boolean;
}): string {
  const { captura, recinto, radioM, conectado } = props;
  const cLat = Number(captura.lat);
  const cLon = Number(captura.lon);
  const rLat = Number(recinto.lat);
  const rLon = Number(recinto.lon);
  const tileLayer = conectado
    ? `L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map);`
    : `// sin red: fondo neutro`;
  const bodyBg = conectado ? '#ffffff' : '#e5e7eb';
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${LEAFLET_CSS}</style>
<style>html,body,#map{margin:0;padding:0;height:100%;width:100%;background:${bodyBg};}</style>
</head><body><div id="map"></div>
<script>${LEAFLET_JS}</script>
<script>
(function(){
  var map = L.map('map', { zoomControl: true });
  ${tileLayer}
  var cap = L.circleMarker([${cLat},${cLon}], { radius: 9, color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.9 }).addTo(map).bindPopup('Captura');
  var rec = L.circleMarker([${rLat},${rLon}], { radius: 9, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.9 }).addTo(map).bindPopup(${JSON.stringify(recinto.nombre)});
  L.circle([${rLat},${rLon}], { radius: ${radioM}, color: '#2563eb', weight: 1, fillOpacity: 0.05 }).addTo(map);
  var group = L.featureGroup([cap, rec]);
  map.fitBounds(group.getBounds().pad(0.2));
})();
</script></body></html>`;
}