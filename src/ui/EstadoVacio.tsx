import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Boton} from './Boton';
import type {TipoIcono} from './Icono';
import {IconoDestacado} from './IconoDestacado';
import {Texto} from './Texto';

type Props = {
  titulo: string;
  mensaje?: string;
  icono?: TipoIcono;
  tono?: 'primario' | 'exito' | 'advertencia' | 'peligro' | 'info';
  accion?: {titulo: string; alPresionar: () => void};
};

/** Pantalla o sección sin contenido: vacío, error o algo terminado. */
export function EstadoVacio({titulo, mensaje, icono, tono, accion}: Props) {
  return (
    <View style={styles.contenedor}>
      {icono ? <IconoDestacado icono={icono} tamano="lg" tono={tono} /> : null}
      <View style={styles.textos}>
        <Texto centrado negrita variante="subtitulo">
          {titulo}
        </Texto>
        {mensaje ? (
          <Texto centrado tono="secundario">
            {mensaje}
          </Texto>
        ) : null}
      </View>
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
    gap: tema.espaciado.lg,
    padding: tema.espaciado.xl,
  },
  textos: {gap: tema.espaciado.sm, maxWidth: 320},
}));
