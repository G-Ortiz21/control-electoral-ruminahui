import Svg, { Circle, Line } from 'react-native-svg';

/** Logotipo de sol naciente (formas simples) — Movimiento Horizonte Ciudadano (DI-05). */
export function LogoSolNaciente({ size = 64, color = '#1D4ED8' }: { size?: number; color?: string }) {
  const cx = size / 2;
  const cy = size / 2;
  const rInt = size * 0.24;
  const rExt = size * 0.42;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angulo, i) => {
        const rad = (angulo * Math.PI) / 180;
        return (
          <Line
            key={i}
            x1={cx + Math.cos(rad) * rInt}
            y1={cy + Math.sin(rad) * rInt}
            x2={cx + Math.cos(rad) * rExt}
            y2={cy + Math.sin(rad) * rExt}
            stroke={color}
            strokeWidth={Math.max(2, size * 0.06)}
            strokeLinecap="round"
          />
        );
      })}
      <Circle cx={cx} cy={cy * 0.95} r={size * 0.22} fill={color} />
      <Line x1={size * 0.12} y1={size * 0.72} x2={size * 0.88} y2={size * 0.72} stroke={color} strokeWidth={Math.max(2, size * 0.05)} strokeLinecap="round" />
    </Svg>
  );
}
