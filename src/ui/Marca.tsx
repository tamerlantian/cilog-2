import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Truck} from './iconos';
import {Icono} from './Icono';
import {Texto} from './Texto';

type Props = {tamano?: 'grande' | 'compacto'};

/** Ícono y nombre de Cilog, sobre el color de marca. Provisional hasta tener el logo real. */
export function Marca({tamano = 'grande'}: Props) {
  const grande = tamano === 'grande';
  styles.useVariants({grande});
  return (
    <View accessibilityLabel="Cilog" accessible style={styles.fila}>
      <View style={styles.icono}>
        <Icono color="sobreAcento" icono={Truck} tamano={grande ? 30 : 24} />
      </View>
      <Texto negrita tono="sobreMarca" variante={grande ? 'display' : 'titulo'}>
        Cilog
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  fila: {
    variants: {
      grande: {
        true: {gap: tema.espaciado.lg + 2},
        false: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: tema.espaciado.md,
        },
      },
    },
  },
  icono: {
    backgroundColor: tema.colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
    variants: {
      grande: {
        true: {width: 56, height: 56, borderRadius: tema.radio.lg},
        false: {width: 44, height: 44, borderRadius: tema.radio.md},
      },
    },
  },
}));
