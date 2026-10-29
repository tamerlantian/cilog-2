import {Pressable} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Icono, type TipoIcono} from './Icono';
import type {ColorTema} from './tema/tema';

type Props = {
  icono: TipoIcono;
  /** Lo que lee el lector de pantalla: el botón no tiene texto visible. */
  etiqueta: string;
  onPress: () => void;
  /** `suave`: círculo de color (llamar, abrir mapa). `plano`: sin fondo (volver, cerrar). */
  variante?: 'plano' | 'suave';
  color?: ColorTema;
};

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
        color={color ?? (variante === 'suave' ? 'primario' : 'texto')}
        icono={icono}
        tamano={variante === 'suave' ? 20 : 24}
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
      },
    },
  },
  presionado: {opacity: 0.6},
}));
