import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Icono, type TipoIcono} from './Icono';
import type {ColorTema} from './tema/tema';

/** `accion` siempre va lleno: círculo del color de acción con el ícono encima. */
type Tono =
  'primario' | 'accion' | 'exito' | 'advertencia' | 'peligro' | 'info';

type Props = {
  icono: TipoIcono;
  tono?: Tono;
  /** `md`: cuadro de 64 para encabezados. `lg`: círculo de 120 para estados y confirmaciones. */
  tamano?: 'md' | 'lg';
  /** Ícono pequeño en la esquina (p. ej. un check sobre el sobre de correo). */
  insignia?: TipoIcono;
  /** Círculo lleno del color del tono, con el ícono en blanco (entrega guardada). */
  solido?: boolean;
};

/** Ícono grande sobre fondo suave: da el tono de una pantalla de estado o de un paso. */
export function IconoDestacado({
  icono,
  tono = 'primario',
  tamano = 'md',
  insignia,
  solido = false,
}: Props) {
  styles.useVariants({tono, tamano, solido});
  return (
    <View style={styles.contenedor}>
      {tamano === 'lg' ? <View style={styles.halo} /> : null}
      <View style={styles.fondo} />
      <Icono
        color={
          tono === 'accion'
            ? 'sobreAccion'
            : solido
              ? 'sobrePrimario'
              : (tono as ColorTema)
        }
        grosor={solido ? 2.6 : 1.8}
        icono={icono}
        tamano={tamano === 'lg' ? 46 : 30}
      />
      {insignia ? (
        <View style={styles.insignia}>
          <Icono
            color="sobrePrimario"
            grosor={3}
            icono={insignia}
            tamano={16}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  contenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    variants: {
      tamano: {
        md: {width: 64, height: 64},
        lg: {width: 120, height: 120},
      },
    },
  },
  halo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: tema.radio.pill,
    opacity: 0.5,
    variants: {
      tono: {
        primario: {backgroundColor: tema.colores.primarioSuave},
        accion: {backgroundColor: tema.colores.accion, opacity: 0.2},
        exito: {backgroundColor: tema.colores.exitoSuave},
        advertencia: {backgroundColor: tema.colores.advertenciaSuave},
        peligro: {backgroundColor: tema.colores.peligroSuave},
        info: {backgroundColor: tema.colores.infoSuave},
      },
    },
  },
  fondo: {
    position: 'absolute',
    variants: {
      tamano: {
        md: {top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20},
        lg: {
          top: 16,
          left: 16,
          right: 16,
          bottom: 16,
          borderRadius: tema.radio.pill,
        },
      },
      tono: {
        primario: {backgroundColor: tema.colores.primarioSuave},
        accion: {backgroundColor: tema.colores.accion},
        exito: {backgroundColor: tema.colores.exitoSuave},
        advertencia: {backgroundColor: tema.colores.advertenciaSuave},
        peligro: {backgroundColor: tema.colores.peligroSuave},
        info: {backgroundColor: tema.colores.infoSuave},
      },
      solido: {true: {}, false: {}},
    },
    compoundVariants: [
      {
        solido: true,
        tono: 'primario',
        styles: {backgroundColor: tema.colores.primario},
      },
      {
        solido: true,
        tono: 'exito',
        styles: {backgroundColor: tema.colores.exito},
      },
      {
        solido: true,
        tono: 'advertencia',
        styles: {backgroundColor: tema.colores.advertencia},
      },
      {
        solido: true,
        tono: 'peligro',
        styles: {backgroundColor: tema.colores.peligro},
      },
      {
        solido: true,
        tono: 'info',
        styles: {backgroundColor: tema.colores.info},
      },
    ],
  },
  insignia: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 34,
    height: 34,
    borderRadius: tema.radio.pill,
    borderWidth: 3,
    borderColor: tema.colores.fondo,
    backgroundColor: tema.colores.exito,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
