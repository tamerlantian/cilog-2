import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Texto} from './Texto';

type Props = {
  nombre: string;
  tono?: 'primario' | 'advertencia' | 'info' | 'exito';
  tamano?: 'sm' | 'md' | 'lg';
  forma?: 'circulo' | 'cuadro';
};

const iniciales = (nombre: string) =>
  nombre
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(palabra => palabra.charAt(0).toUpperCase())
    .join('') || '?';

/** Iniciales sobre color: identifica empresas y personas sin fotos. */
export function Avatar({
  nombre,
  tono = 'primario',
  tamano = 'md',
  forma = 'cuadro',
}: Props) {
  styles.useVariants({tono, tamano, forma});
  return (
    <View accessibilityElementsHidden style={styles.caja}>
      <Texto negrita style={styles.texto}>
        {iniciales(nombre)}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  caja: {
    alignItems: 'center',
    justifyContent: 'center',
    variants: {
      tamano: {
        sm: {width: 28, height: 28},
        md: {width: 44, height: 44},
        lg: {width: 60, height: 60},
      },
      forma: {
        circulo: {borderRadius: tema.radio.pill},
        cuadro: {borderRadius: tema.radio.md},
      },
      tono: {
        primario: {backgroundColor: tema.colores.primario},
        advertencia: {backgroundColor: tema.colores.advertenciaSuave},
        info: {backgroundColor: tema.colores.infoSuave},
        exito: {backgroundColor: tema.colores.exitoSuave},
      },
    },
  },
  texto: {
    variants: {
      tamano: {
        sm: {fontSize: tema.tipografia.tamano.pie},
        md: {fontSize: tema.tipografia.tamano.cuerpo + 1},
        lg: {fontSize: 22},
      },
      tono: {
        primario: {color: tema.colores.sobrePrimario},
        advertencia: {color: tema.colores.advertencia},
        info: {color: tema.colores.info},
        exito: {color: tema.colores.exito},
      },
    },
  },
}));
