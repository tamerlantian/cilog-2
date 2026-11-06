import {useUnistyles} from 'react-native-unistyles';
import Svg, {Circle, Path} from 'react-native-svg';

const ALTO = 248;
const PARADAS = [
  {x: 102, y: 150},
  {x: 176, y: 110},
  {x: 244, y: 84},
];

/** Ruta punteada con paradas hasta el destino, arriba del login. Decorativa. */
export function IlustracionRuta() {
  const {theme} = useUnistyles();
  const {suelo, traza, nodo, acento} = theme.colores;
  return (
    <Svg
      accessibilityElementsHidden
      fill="none"
      height={ALTO}
      importantForAccessibility="no-hide-descendants"
      preserveAspectRatio="xMinYMax slice"
      viewBox={`0 0 390 ${ALTO}`}
      width="100%">
      <Path
        d="M-10 196 H84 a18 18 0 0 0 18 -18 V128 a18 18 0 0 1 18 -18 H226 a18 18 0 0 0 18 -18 V76 a18 18 0 0 1 18 -18 H318"
        stroke={traza}
        strokeDasharray="2 8"
        strokeLinecap="round"
        strokeWidth={2}
      />
      {PARADAS.map(({x, y}) => (
        <Circle
          key={x}
          cx={x}
          cy={y}
          fill={suelo}
          r={5}
          stroke={nodo}
          strokeWidth={2}
        />
      ))}
      <Circle cx={326} cy={58} fill={acento} fillOpacity={0.18} r={16} />
      <Circle cx={326} cy={58} fill={acento} r={7} />
    </Svg>
  );
}

IlustracionRuta.alto = ALTO;
