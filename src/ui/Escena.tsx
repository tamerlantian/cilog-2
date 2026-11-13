import type {ReactNode} from 'react';
import {ScopedTheme} from 'react-native-unistyles';

type Props = {
  /** `marca`: superficie de marca de la paleta (portada del login, tarjeta destacada). */
  nombre: 'marca';
  children: ReactNode;
};

/**
 * Cambia la escena de color de todo lo que envuelve. Los componentes de adentro
 * no cambian: leen los mismos roles (`fondo`, `accion`, `texto`...) con los
 * valores de la escena.
 */
export function Escena({nombre, children}: Props) {
  return <ScopedTheme name={nombre}>{children}</ScopedTheme>;
}
