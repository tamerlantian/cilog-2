import {StyleSheet} from 'react-native-unistyles';

import {temaClaro, temaMarca, temaOscuro} from './tema';

// Con adaptiveThemes, unistyles exige los nombres 'light' y 'dark'.
// `marca` no sigue al sistema: se aplica por zonas con <Escena nombre="marca">.
const temas = {light: temaClaro, dark: temaOscuro, marca: temaMarca};

type TemasApp = typeof temas;

declare module 'react-native-unistyles' {
  // Patrón oficial de unistyles para tipar los temas.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface UnistylesThemes extends TemasApp {}
}

StyleSheet.configure({
  themes: temas,
  settings: {adaptiveThemes: true},
});
