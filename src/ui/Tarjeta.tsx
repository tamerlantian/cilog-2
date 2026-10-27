import {View, type ViewProps} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

export function Tarjeta({style, ...resto}: ViewProps) {
  return <View style={[styles.tarjeta, style]} {...resto} />;
}

const styles = StyleSheet.create(tema => ({
  tarjeta: {
    backgroundColor: tema.colores.superficie,
    borderColor: tema.colores.borde,
    borderWidth: 1,
    borderRadius: tema.radio.lg,
    padding: tema.espaciado.lg,
    gap: tema.espaciado.sm,
  },
}));
