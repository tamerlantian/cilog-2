import {ActivityIndicator, Pressable, type PressableProps} from 'react-native';
import {StyleSheet, useUnistyles} from 'react-native-unistyles';

import {Texto} from './Texto';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  titulo: string;
  tipo?: 'primario' | 'secundario' | 'peligro' | 'texto';
  cargando?: boolean;
};

export function Boton({
  titulo,
  tipo = 'primario',
  cargando = false,
  disabled,
  onPress,
  ...resto
}: Props) {
  const {theme} = useUnistyles();
  const inactivo = Boolean(disabled) || cargando;
  styles.useVariants({tipo, inactivo});

  const colorContenido =
    tipo === 'primario' || tipo === 'peligro'
      ? theme.colores.sobrePrimario
      : theme.colores.primario;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled: inactivo, busy: cargando}}
      disabled={inactivo}
      onPress={onPress}
      style={({pressed}) => [styles.base, pressed && styles.presionado]}
      {...resto}>
      {cargando ? (
        <ActivityIndicator color={colorContenido} />
      ) : (
        <Texto negrita style={styles.texto}>
          {titulo}
        </Texto>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create(tema => ({
  base: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tema.radio.md,
    paddingHorizontal: tema.espaciado.lg,
    borderWidth: 1,
    variants: {
      tipo: {
        primario: {
          backgroundColor: tema.colores.primario,
          borderColor: tema.colores.primario,
        },
        secundario: {
          backgroundColor: 'transparent',
          borderColor: tema.colores.primario,
        },
        peligro: {
          backgroundColor: tema.colores.peligro,
          borderColor: tema.colores.peligro,
        },
        texto: {backgroundColor: 'transparent', borderColor: 'transparent'},
      },
      inactivo: {
        true: {
          backgroundColor: tema.colores.deshabilitado,
          borderColor: tema.colores.deshabilitado,
        },
        false: {},
      },
    },
  },
  presionado: {opacity: 0.85},
  texto: {
    color: tema.colores.primario,
    variants: {
      tipo: {
        primario: {color: tema.colores.sobrePrimario},
        secundario: {color: tema.colores.primario},
        peligro: {color: tema.colores.sobrePrimario},
        texto: {color: tema.colores.primario},
      },
      inactivo: {
        true: {color: tema.colores.sobreDeshabilitado},
        false: {},
      },
    },
  },
}));
