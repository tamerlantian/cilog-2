import {ActivityIndicator, View} from 'react-native';
import {StyleSheet, useUnistyles} from 'react-native-unistyles';

import {Escena} from './Escena';
import {Marca} from './Marca';
import {Pantalla} from './Pantalla';

/** El mismo ancho (en dp) con el que se generó el arranque nativo: el logo no salta. */
const ANCHO_LOGO = 168;

function Contenido() {
  const {theme} = useUnistyles();
  return (
    <Pantalla bordes={[]}>
      <View
        accessibilityLabel="Cargando"
        accessibilityRole="progressbar"
        style={styles.centro}>
        <Marca ancho={ANCHO_LOGO} />
        <ActivityIndicator
          color={theme.colores.acento}
          style={styles.indicador}
        />
      </View>
    </Pantalla>
  );
}

/** Continúa el arranque nativo mientras se abren la sesión y los datos del teléfono. */
export function PantallaCarga() {
  return (
    <Escena nombre="marca">
      <Contenido />
    </Escena>
  );
}

const styles = StyleSheet.create(tema => ({
  centro: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  // Fuera del flujo, para que el logo quede centrado igual que en el arranque nativo.
  indicador: {position: 'absolute', bottom: tema.espaciado.xl * 3},
}));
