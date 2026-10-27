import {StyleSheet} from 'react-native-unistyles';

import {temaClaro, temaOscuro} from './tema';

// Con adaptiveThemes, unistyles exige exactamente los nombres 'light' y 'dark'.
const temas = {light: temaClaro, dark: temaOscuro};

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
