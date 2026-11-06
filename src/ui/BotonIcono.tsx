import {Pressable} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Icono, type TipoIcono} from './Icono';
import type {ColorTema} from './tema/tema';

type Props = {
  icono: TipoIcono;
  /** Lo que lee el lector de pantalla: el botón no tiene texto visible. */
  etiqueta: string;
  onPress: () => void;
  /**
   * `plano`: sin fondo (volver, cerrar). `suave`: círculo de color (abrir mapa).
   * `accion`: círculo grande del color de acción (llamar al destinatario).
   */
  variante?: 'plano' | 'suave' | 'accion';
  color?: ColorTema;
};

const COLOR = {
  plano: 'texto',
  suave: 'primario',
  accion: 'sobreAccion',
} as const satisfies Record<NonNullable<Props['variante']>, ColorTema>;

export function BotonIcono({
  icono,
  etiqueta,
  onPress,
  variante = 'plano',
  color,
}: Props) {
  styles.useVariants({variante});
  return (
    <Pressable
      accessibilityLabel={etiqueta}
      accessibilityRole="button"
      hitSlop={4}
      style={({pressed}) => [styles.base, pressed && styles.presionado]}
      onPress={onPress}>
      <Icono
        color={color ?? COLOR[variante]}
        icono={icono}
        tamano={variante === 'plano' ? 24 : 20}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create(tema => ({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tema.radio.pill,
    variants: {
      variante: {
        plano: {
          width: tema.alto.botonCompacto,
          height: tema.alto.botonCompacto,
        },
        suave: {
          width: 48,
          height: 48,
          backgroundColor: tema.colores.primarioSuave,
        },
        accion: {
          width: 52,
          height: 52,
          backgroundColor: tema.colores.accion,
        },
      },
    },
  },
  presionado: {opacity: 0.6},
}));
