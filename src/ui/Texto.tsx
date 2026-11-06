import {Text, type TextProps} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

type Props = TextProps & {
  /** `marca`, `display` y `titulo` van en la fuente de títulos; el resto en la de lectura. */
  variante?:
    | 'marca'
    | 'display'
    | 'titulo'
    | 'subtitulo'
    | 'cuerpo'
    | 'etiqueta'
    | 'pie';
  tono?:
    | 'normal'
    | 'secundario'
    | 'primario'
    | 'exito'
    | 'advertencia'
    | 'peligro'
    | 'info';
  negrita?: boolean;
  /** Peso medio: etiquetas, enlaces y acciones de texto. */
  media?: boolean;
  centrado?: boolean;
  /** Cifras de ancho fijo para que columnas de números queden alineadas. */
  numerico?: boolean;
  /** Fuente monoespaciada para códigos: número de despacho, guía, documento. */
  mono?: boolean;
};

export function Texto({
  variante = 'cuerpo',
  tono = 'normal',
  negrita = false,
  media = false,
  centrado = false,
  numerico = false,
  mono = false,
  style,
  ...resto
}: Props) {
  styles.useVariants({
    variante,
    tono,
    negrita,
    media,
    centrado,
    numerico,
    mono,
  });
  return <Text style={[styles.texto, style]} {...resto} />;
}

const styles = StyleSheet.create(tema => {
  const titulo = {fontFamily: tema.tipografia.familia.titulo};
  return {
    texto: {
      fontFamily: tema.tipografia.familia.regular,
      color: tema.colores.texto,
      variants: {
        variante: {
          marca: {
            ...titulo,
            fontSize: tema.tipografia.tamano.marca,
            lineHeight: 48,
            letterSpacing: -1.2,
          },
          display: {
            ...titulo,
            fontSize: tema.tipografia.tamano.display,
            lineHeight: 40,
            letterSpacing: -0.8,
          },
          titulo: {
            ...titulo,
            fontSize: tema.tipografia.tamano.titulo,
            lineHeight: 36,
            letterSpacing: -0.7,
          },
          subtitulo: {
            fontSize: tema.tipografia.tamano.subtitulo,
            lineHeight: 26,
          },
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
        },
        negrita: {
          true: {fontFamily: tema.tipografia.familia.negrita},
          false: {},
        },
        media: {
          true: {fontFamily: tema.tipografia.familia.media},
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
        mono: {
          true: {fontFamily: tema.tipografia.familia.mono},
          false: {},
        },
      },
      // Los títulos ya son negrita: `negrita` o `media` no les cambian la fuente.
      compoundVariants: (['marca', 'display', 'titulo'] as const).flatMap(
        variante => [
          {variante, negrita: true, styles: titulo},
          {variante, media: true, styles: titulo},
        ],
      ),
    },
  };
});
