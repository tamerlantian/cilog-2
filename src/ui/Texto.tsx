import {Text, type TextProps} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

type Props = TextProps & {
  variante?: 'display' | 'titulo' | 'subtitulo' | 'cuerpo' | 'etiqueta' | 'pie';
  tono?:
    | 'normal'
    | 'secundario'
    | 'primario'
    | 'exito'
    | 'advertencia'
    | 'peligro'
    | 'info'
    | 'sobreMarca'
    | 'sobreMarcaSecundario';
  negrita?: boolean;
  centrado?: boolean;
  /** Cifras de ancho fijo para que columnas de números queden alineadas. */
  numerico?: boolean;
};

export function Texto({
  variante = 'cuerpo',
  tono = 'normal',
  negrita = false,
  centrado = false,
  numerico = false,
  style,
  ...resto
}: Props) {
  styles.useVariants({variante, tono, negrita, centrado, numerico});
  return <Text style={[styles.texto, style]} {...resto} />;
}

const styles = StyleSheet.create(tema => ({
  texto: {
    fontFamily: tema.tipografia.familia.regular,
    color: tema.colores.texto,
    variants: {
      variante: {
        display: {
          fontSize: tema.tipografia.tamano.display,
          lineHeight: 40,
          letterSpacing: -0.5,
        },
        titulo: {
          fontSize: tema.tipografia.tamano.titulo,
          lineHeight: 32,
          letterSpacing: -0.3,
        },
        subtitulo: {fontSize: tema.tipografia.tamano.subtitulo, lineHeight: 26},
        cuerpo: {fontSize: tema.tipografia.tamano.cuerpo, lineHeight: 22},
        etiqueta: {fontSize: tema.tipografia.tamano.etiqueta, lineHeight: 18},
        pie: {fontSize: tema.tipografia.tamano.pie, lineHeight: 16},
      },
      tono: {
        normal: {color: tema.colores.texto},
        secundario: {color: tema.colores.textoSecundario},
        primario: {color: tema.colores.primario},
        exito: {color: tema.colores.exito},
        advertencia: {color: tema.colores.advertencia},
        peligro: {color: tema.colores.peligro},
        info: {color: tema.colores.info},
        sobreMarca: {color: tema.colores.sobreMarca},
        sobreMarcaSecundario: {color: tema.colores.sobreMarcaSecundario},
      },
      negrita: {
        true: {fontFamily: tema.tipografia.familia.negrita},
        false: {},
      },
      centrado: {
        true: {textAlign: 'center'},
        false: {},
      },
      numerico: {
        true: {fontVariant: ['tabular-nums']},
        false: {},
      },
    },
  },
}));
