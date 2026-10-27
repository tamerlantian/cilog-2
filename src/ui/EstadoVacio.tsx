import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Boton} from './Boton';
import {Texto} from './Texto';

type Props = {
  titulo: string;
  mensaje?: string;
  accion?: {titulo: string; alPresionar: () => void};
};

export function EstadoVacio({titulo, mensaje, accion}: Props) {
  return (
    <View style={styles.contenedor}>
      <Texto variante="subtitulo" negrita style={styles.centrado}>
        {titulo}
      </Texto>
      {mensaje ? (
        <Texto tono="secundario" style={styles.centrado}>
          {mensaje}
        </Texto>
      ) : null}
      {accion ? (
        <Boton
          tipo="secundario"
          titulo={accion.titulo}
          onPress={accion.alPresionar}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tema.espaciado.md,
    padding: tema.espaciado.xl,
  },
  centrado: {textAlign: 'center'},
}));
