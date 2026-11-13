import {StatusBar, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {StyleSheet} from 'react-native-unistyles';

import {Escena, Marca, Texto} from '@/ui';

import {IlustracionRuta} from './IlustracionRuta';

/** Lo que la hoja del formulario se monta sobre la portada (con sus esquinas redondeadas). */
export const SOLAPE_PORTADA = 28;

/**
 * Franja navy arriba del login: ruta, logo y lema. Llega hasta el borde de
 * arriba de la pantalla, así que la pantalla no debe respetar el safe area
 * superior (lo hace esta portada).
 */
export function PortadaLogin() {
  const {top} = useSafeAreaInsets();
  return (
    <Escena nombre="marca">
      {/* Montada después de la de `Pantalla`, así que manda: íconos claros sobre navy. */}
      <StatusBar barStyle="light-content" />
      <View style={styles.portada(top)}>
        <IlustracionRuta />
        <View style={styles.marca}>
          <Marca />
          <Texto tono="secundario">Tus entregas del día, en orden.</Texto>
        </View>
      </View>
    </Escena>
  );
}

const styles = StyleSheet.create(tema => ({
  portada: (arriba: number) => ({
    paddingTop: arriba,
    paddingBottom: SOLAPE_PORTADA,
    backgroundColor: tema.colores.suelo,
  }),
  marca: {
    position: 'absolute',
    left: tema.espaciado.xl + 4,
    bottom: SOLAPE_PORTADA + tema.espaciado.xl + 4,
    gap: tema.espaciado.sm,
  },
}));
