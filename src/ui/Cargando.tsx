import {ActivityIndicator, View} from 'react-native';
import {StyleSheet, useUnistyles} from 'react-native-unistyles';

import {Texto} from './Texto';

type Props = {mensaje?: string};

export function Cargando({mensaje}: Props) {
  const {theme} = useUnistyles();
  return (
    <View accessibilityRole="progressbar" style={styles.contenedor}>
      <ActivityIndicator color={theme.colores.primario} size="large" />
      {mensaje ? (
        <Texto tono="secundario" style={styles.mensaje}>
          {mensaje}
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tema.espaciado.xl,
  },
  mensaje: {marginTop: tema.espaciado.md, textAlign: 'center'},
}));
