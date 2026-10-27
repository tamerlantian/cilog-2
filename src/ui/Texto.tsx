import {Text, type TextProps} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

type Props = TextProps & {
  variante?: 'display' | 'titulo' | 'subtitulo' | 'cuerpo' | 'pie';
  tono?: 'normal' | 'secundario' | 'primario' | 'exito' | 'peligro';
  negrita?: boolean;
};

export function Texto({
  variante = 'cuerpo',
  tono = 'normal',
  negrita = false,
  style,
  ...resto
}: Props) {
  styles.useVariants({variante, tono, negrita});
  return <Text style={[styles.texto, style]} {...resto} />;
}

const styles = StyleSheet.create(tema => ({
  texto: {
    fontFamily: tema.tipografia.familia.regular,
    color: tema.colores.texto,
    variants: {
      variante: {
        display: {fontSize: tema.tipografia.tamano.display},
        titulo: {fontSize: tema.tipografia.tamano.titulo},
        subtitulo: {fontSize: tema.tipografia.tamano.subtitulo},
        cuerpo: {fontSize: tema.tipografia.tamano.cuerpo},
        pie: {fontSize: tema.tipografia.tamano.pie},
      },
      tono: {
        normal: {color: tema.colores.texto},
        secundario: {color: tema.colores.textoSecundario},
        primario: {color: tema.colores.primario},
        exito: {color: tema.colores.exito},
        peligro: {color: tema.colores.peligro},
      },
      negrita: {
        true: {fontFamily: tema.tipografia.familia.negrita},
        false: {},
      },
    },
  },
}));
