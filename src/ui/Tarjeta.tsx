import type {ReactNode} from 'react';
import {Pressable, type StyleProp, View, type ViewStyle} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

type Props = {
  children: ReactNode;
  /** Si se pasa, toda la tarjeta es un botón. */
  alPresionar?: () => void;
  /** Lo que lee el lector de pantalla cuando la tarjeta es un botón. */
  etiqueta?: string;
  /** Borde de color: la opción actual o la siguiente acción sugerida. */
  destacada?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Tarjeta({
  children,
  alPresionar,
  etiqueta,
  destacada = false,
  style,
}: Props) {
  styles.useVariants({destacada});

  if (!alPresionar) {
    return <View style={[styles.tarjeta, style]}>{children}</View>;
  }
  return (
    <Pressable
      accessibilityLabel={etiqueta}
      accessibilityRole="button"
      style={({pressed}) => [
        styles.tarjeta,
        pressed && styles.presionada,
        style,
      ]}
      onPress={alPresionar}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create(tema => ({
  tarjeta: {
    backgroundColor: tema.colores.fondo,
    borderColor: tema.colores.borde,
    borderWidth: 1,
    borderRadius: tema.radio.lg,
    padding: tema.espaciado.lg,
    gap: tema.espaciado.sm,
    variants: {
      destacada: {
        true: {
          borderWidth: 2,
          borderColor: tema.colores.primario,
          shadowColor: tema.colores.primario,
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: {width: 0, height: 6},
          elevation: 3,
        },
        false: {},
      },
    },
  },
  presionada: {opacity: 0.85, transform: [{scale: 0.99}]},
}));
