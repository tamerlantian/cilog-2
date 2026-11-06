import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Icono, type TipoIcono} from './Icono';
import type {ColorTema} from './tema/tema';
import {Texto} from './Texto';

type Tono =
  | 'neutro'
  | 'primario'
  | 'accion'
  | 'exito'
  | 'advertencia'
  | 'peligro'
  | 'info';

type Props = {
  texto: string;
  tono?: Tono;
  icono?: TipoIcono;
};

const COLOR: Record<Tono, ColorTema> = {
  neutro: 'textoSecundario',
  primario: 'primario',
  accion: 'sobreAccion',
  exito: 'exito',
  advertencia: 'advertencia',
  peligro: 'peligro',
  info: 'info',
};

/** Etiqueta corta de estado (entregada, por enviar, liberado). */
export function Insignia({texto, tono = 'neutro', icono}: Props) {
  styles.useVariants({tono});
  return (
    <View style={styles.contenedor}>
      {icono ? <Icono color={COLOR[tono]} icono={icono} tamano={14} /> : null}
      <Texto negrita style={styles.texto} variante="pie">
        {texto}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: tema.espaciado.xs,
    borderRadius: tema.radio.pill,
    paddingHorizontal: tema.espaciado.sm + 2,
    paddingVertical: 3,
    variants: {
      tono: {
        neutro: {backgroundColor: tema.colores.superficie},
        primario: {backgroundColor: tema.colores.primarioSuave},
        accion: {backgroundColor: tema.colores.accion},
        exito: {backgroundColor: tema.colores.exitoSuave},
        advertencia: {backgroundColor: tema.colores.advertenciaSuave},
        peligro: {backgroundColor: tema.colores.peligroSuave},
        info: {backgroundColor: tema.colores.infoSuave},
      },
    },
  },
  texto: {
    variants: {
      tono: {
        neutro: {color: tema.colores.textoSecundario},
        primario: {color: tema.colores.primario},
        accion: {color: tema.colores.sobreAccion},
        exito: {color: tema.colores.exito},
        advertencia: {color: tema.colores.advertencia},
        peligro: {color: tema.colores.peligro},
        info: {color: tema.colores.info},
      },
    },
  },
}));
