import {ActivityIndicator, Pressable, type PressableProps} from 'react-native';
import {StyleSheet, useUnistyles} from 'react-native-unistyles';

import {Icono, type TipoIcono} from './Icono';
import type {ColorTema} from './tema/tema';
import {Texto} from './Texto';

/** `advertenciaSuave`: acción de aviso que no es la principal (reportar novedad). */
/** `neutro`: acción de igual peso que la principal pero sin color (novedad junto a entregar). */
type Tipo =
  | 'primario'
  | 'secundario'
  | 'neutro'
  | 'advertencia'
  | 'advertenciaSuave'
  | 'peligro'
  | 'texto';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  titulo: string;
  tipo?: Tipo;
  /** `compacto` (44) para acciones secundarias dentro de tarjetas o filas. */
  tamano?: 'normal' | 'compacto';
  icono?: TipoIcono;
  /** `fin` para acciones que avanzan (flecha a la derecha del texto). */
  posicionIcono?: 'inicio' | 'fin';
  cargando?: boolean;
};

const COLOR_CONTENIDO: Record<Tipo, ColorTema> = {
  primario: 'sobreAccion',
  advertencia: 'sobrePrimario',
  advertenciaSuave: 'advertencia',
  peligro: 'sobrePrimario',
  secundario: 'primario',
  neutro: 'texto',
  texto: 'primario',
};

export function Boton({
  titulo,
  tipo = 'primario',
  tamano = 'normal',
  icono,
  posicionIcono = 'inicio',
  cargando = false,
  disabled,
  onPress,
  ...resto
}: Props) {
  const {theme} = useUnistyles();
  const inactivo = Boolean(disabled) || cargando;
  const relleno =
    tipo !== 'secundario' && tipo !== 'neutro' && tipo !== 'texto';
  styles.useVariants({tipo, tamano, inactivo: inactivo && relleno});
  const colorContenido: ColorTema =
    inactivo && relleno ? 'sobreDeshabilitado' : COLOR_CONTENIDO[tipo];

  const iconoBoton = icono ? (
    <Icono
      color={colorContenido}
      grosor={2.4}
      icono={icono}
      tamano={tamano === 'compacto' ? 18 : 20}
    />
  ) : null;

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
          {posicionIcono === 'inicio' ? iconoBoton : null}
          <Texto media={!relleno} negrita={relleno} style={styles.texto}>
            {titulo}
          </Texto>
          {posicionIcono === 'fin' ? iconoBoton : null}
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
          backgroundColor: tema.colores.accion,
          borderColor: tema.colores.accion,
        },
        secundario: {
          backgroundColor: 'transparent',
          borderColor: tema.colores.primario,
        },
        neutro: {
          backgroundColor: tema.colores.campo,
          borderColor: tema.colores.bordeCampo,
          borderWidth: 1,
        },
        advertencia: {
          backgroundColor: tema.colores.advertencia,
          borderColor: tema.colores.advertencia,
        },
        advertenciaSuave: {
          backgroundColor: tema.colores.advertenciaSuave,
          borderColor: tema.colores.advertenciaBorde,
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
        primario: {color: tema.colores.sobreAccion},
        secundario: {color: tema.colores.primario},
        neutro: {color: tema.colores.texto},
        advertencia: {color: tema.colores.sobrePrimario},
        advertenciaSuave: {color: tema.colores.advertencia},
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
