import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Texto} from './Texto';

type Props = {
  pasos: readonly string[];
  /** Índice del paso actual, desde 0. */
  actual: number;
};

/** Avance de un flujo por pasos: una barra por paso y "Paso 1 de 3 · Fotos". */
export function Pasos({pasos, actual}: Props) {
  return (
    <View
      accessibilityLabel={`Paso ${actual + 1} de ${pasos.length}, ${pasos[actual]}`}
      accessible
      style={styles.contenedor}>
      <View style={styles.barras}>
        {pasos.map((paso, indice) => (
          <View
            key={paso}
            style={[styles.barra, indice <= actual && styles.hecha]}
          />
        ))}
      </View>
      <Texto tono="secundario" variante="pie">
        Paso {actual + 1} de {pasos.length} · {pasos[actual]}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  contenedor: {gap: tema.espaciado.sm, paddingHorizontal: tema.espaciado.md},
  barras: {flexDirection: 'row', gap: tema.espaciado.xs + 2},
  barra: {
    flex: 1,
    height: 5,
    borderRadius: tema.radio.pill,
    backgroundColor: tema.colores.borde,
  },
  hecha: {backgroundColor: tema.colores.primario},
}));
