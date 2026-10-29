import {View} from 'react-native';
import Toast, {type ToastConfigParams} from 'react-native-toast-message';
import {StyleSheet} from 'react-native-unistyles';

import {Check, Info, X} from './iconos';
import {Icono, type TipoIcono} from './Icono';
import {Texto} from './Texto';

/** Avisos breves. Un solo lugar para cambiar duración, posición y estilo. */
export const mostrarExito = (texto: string) =>
  Toast.show({type: 'success', text1: texto, visibilityTime: 3000});

export const mostrarError = (texto: string) =>
  Toast.show({type: 'error', text1: texto, visibilityTime: 5000});

export const mostrarInfo = (texto: string) =>
  Toast.show({type: 'info', text1: texto, visibilityTime: 3000});

type Tipo = 'exito' | 'error' | 'info';

const ICONOS: Record<Tipo, TipoIcono> = {exito: Check, error: X, info: Info};

function Mensaje({tipo, texto}: {tipo: Tipo; texto?: string}) {
  styles.useVariants({tipo});
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole={tipo === 'error' ? 'alert' : 'text'}
      style={styles.mensaje}>
      <View style={styles.circulo}>
        <Icono
          color="sobrePrimario"
          grosor={2.6}
          icono={ICONOS[tipo]}
          tamano={16}
        />
      </View>
      <Texto style={styles.texto}>{texto}</Texto>
    </View>
  );
}

const config = {
  success: ({text1}: ToastConfigParams<unknown>) => (
    <Mensaje texto={text1} tipo="exito" />
  ),
  error: ({text1}: ToastConfigParams<unknown>) => (
    <Mensaje texto={text1} tipo="error" />
  ),
  info: ({text1}: ToastConfigParams<unknown>) => (
    <Mensaje texto={text1} tipo="info" />
  ),
};

export function ContenedorMensajes() {
  return <Toast config={config} />;
}

const styles = StyleSheet.create(tema => ({
  mensaje: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.md,
    marginHorizontal: tema.espaciado.lg,
    alignSelf: 'stretch',
    paddingVertical: tema.espaciado.md,
    paddingHorizontal: tema.espaciado.md + 2,
    borderRadius: tema.radio.lg,
    // Siempre oscuro, en ambos temas, para que se separe del contenido.
    backgroundColor: tema.colores.marca,
    shadowColor: tema.colores.texto,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 6,
  },
  circulo: {
    width: 30,
    height: 30,
    borderRadius: tema.radio.pill,
    alignItems: 'center',
    justifyContent: 'center',
    variants: {
      tipo: {
        exito: {backgroundColor: tema.colores.exito},
        error: {backgroundColor: tema.colores.peligro},
        info: {backgroundColor: tema.colores.info},
      },
    },
  },
  texto: {flex: 1, color: tema.colores.sobreMarca},
}));
