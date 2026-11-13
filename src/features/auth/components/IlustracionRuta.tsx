import {useUnistyles} from 'react-native-unistyles';
import Svg, {Circle, Path} from 'react-native-svg';

const ALTO = 248;
const PARADAS = [
  {x: 168, y: 118},
  {x: 308, y: 186},
];

/** Ruta punteada con paradas en la portada del login; pasa por detrás del logo. Decorativa. */
export function IlustracionRuta() {
  const {theme} = useUnistyles();
  const {suelo, traza, nodo} = theme.colores;
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
        d="M-10 92 H150 a18 18 0 0 1 18 18 V130 a18 18 0 0 0 18 18 H290 a18 18 0 0 1 18 18 V200 a18 18 0 0 0 18 18 H400"
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
    </Svg>
  );
}

IlustracionRuta.alto = ALTO;
