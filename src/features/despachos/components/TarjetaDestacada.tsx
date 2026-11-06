import type {ReactNode} from 'react';
import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Escena} from '@/ui';

/**
 * Tarjeta sobre la superficie de marca: lo siguiente que hay que hacer
 * (despacho en curso, próxima entrega). Todo lo de adentro toma la escena.
 */
export function TarjetaDestacada({
  children,
  etiqueta,
}: {
  children: ReactNode;
  /** Nombre de la región para el lector de pantalla. */
  etiqueta: string;
}) {
  return (
    <Escena nombre="marca">
      <View accessibilityLabel={etiqueta} style={styles.tarjeta}>
        {children}
      </View>
    </Escena>
  );
}

const styles = StyleSheet.create(tema => ({
  tarjeta: {
    gap: tema.espaciado.md,
    padding: tema.espaciado.lg,
    borderRadius: tema.radio.lg + 2,
    backgroundColor: tema.colores.suelo,
  },
}));
