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
  /** `accion`: círculo lleno del color de acción (vacío que invita a empezar). */
  tono?: 'primario' | 'accion' | 'exito' | 'advertencia' | 'peligro' | 'info';
  accion?: {titulo: string; alPresionar: () => void};
};

/** Pantalla o sección sin contenido: vacío, error o algo terminado. */
export function EstadoVacio({titulo, mensaje, icono, tono, accion}: Props) {
  return (
    <View style={styles.contenedor}>
      {icono ? <IconoDestacado icono={icono} tamano="lg" tono={tono} /> : null}
      <View style={styles.textos}>
        <Texto centrado style={styles.titulo} variante="titulo">
          {titulo}
        </Texto>
        {mensaje ? (
          <Texto centrado tono="secundario">
            {mensaje}
          </Texto>
        ) : null}
      </View>
      {accion ? (
        <View style={styles.accion}>
          <Boton titulo={accion.titulo} onPress={accion.alPresionar} />
        </View>
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
  titulo: {fontSize: 24, lineHeight: 30, letterSpacing: -0.4},
  accion: {alignSelf: 'stretch'},
}));
