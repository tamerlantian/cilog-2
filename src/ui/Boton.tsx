import {ActivityIndicator, Pressable, type PressableProps} from 'react-native';
import {StyleSheet, useUnistyles} from 'react-native-unistyles';

import {Icono, type TipoIcono} from './Icono';
import type {ColorTema} from './tema/tema';
import {Texto} from './Texto';

type Tipo = 'primario' | 'secundario' | 'advertencia' | 'peligro' | 'texto';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  titulo: string;
  tipo?: Tipo;
  /** `compacto` (44) para acciones secundarias dentro de tarjetas o filas. */
  tamano?: 'normal' | 'compacto';
  icono?: TipoIcono;
  cargando?: boolean;
};

const COLOR_CONTENIDO: Record<Tipo, ColorTema> = {
  primario: 'sobrePrimario',
  advertencia: 'sobrePrimario',
  peligro: 'sobrePrimario',
  secundario: 'primario',
  texto: 'primario',
};

export function Boton({
  titulo,
  tipo = 'primario',
  tamano = 'normal',
  icono,
  cargando = false,
  disabled,
  onPress,
  ...resto
}: Props) {
  const {theme} = useUnistyles();
  const inactivo = Boolean(disabled) || cargando;
  const relleno = tipo !== 'secundario' && tipo !== 'texto';
  styles.useVariants({tipo, tamano, inactivo: inactivo && relleno});
  const colorContenido: ColorTema =
    inactivo && relleno ? 'sobreDeshabilitado' : COLOR_CONTENIDO[tipo];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled: inactivo, busy: cargando}}
      disabled={inactivo}
      onPress={onPress}
      style={({pressed}) => [
        styles.base,
        inactivo && !relleno && styles.atenuado,
        pressed && styles.presionado,
      ]}
      {...resto}>
      {cargando ? (
        <ActivityIndicator color={theme.colores[colorContenido]} />
      ) : (
        <>
          {icono ? (
            <Icono
              color={colorContenido}
              grosor={2.4}
              icono={icono}
              tamano={tamano === 'compacto' ? 18 : 20}
            />
          ) : null}
          <Texto negrita style={styles.texto}>
            {titulo}
          </Texto>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create(tema => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tema.espaciado.sm,
    borderRadius: tema.radio.md,
    paddingHorizontal: tema.espaciado.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
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
        advertencia: {
          backgroundColor: tema.colores.advertencia,
          borderColor: tema.colores.advertencia,
        },
        peligro: {
          backgroundColor: tema.colores.peligro,
          borderColor: tema.colores.peligro,
        },
        texto: {backgroundColor: 'transparent'},
      },
      tamano: {
        normal: {minHeight: tema.alto.boton},
        compacto: {minHeight: tema.alto.botonCompacto},
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
  presionado: {opacity: 0.85, transform: [{scale: 0.98}]},
  atenuado: {opacity: 0.55},
  texto: {
    variants: {
      tipo: {
        primario: {color: tema.colores.sobrePrimario},
        secundario: {color: tema.colores.primario},
        advertencia: {color: tema.colores.sobrePrimario},
        peligro: {color: tema.colores.sobrePrimario},
        texto: {color: tema.colores.primario},
      },
      tamano: {
        normal: {fontSize: tema.tipografia.tamano.cuerpo + 1},
        compacto: {fontSize: tema.tipografia.tamano.cuerpo - 1},
      },
      inactivo: {
        true: {color: tema.colores.sobreDeshabilitado},
        false: {},
      },
    },
  },
}));
