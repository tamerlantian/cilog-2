import type {ReactNode} from 'react';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {StyleSheet} from 'react-native-unistyles';

import {HojaAnimada} from './HojaAnimada';
import {Icono, type TipoIcono} from './Icono';
import {Texto} from './Texto';

type Props = {
  visible: boolean;
  /** Atrás de Android. La hoja no se cierra tocando fuera: pide una decisión. */
  alCerrar: () => void;
  titulo: string;
  icono: TipoIcono;
  children?: ReactNode;
  /** Botones, de arriba abajo: el principal primero. */
  acciones: ReactNode;
};

/**
 * Hoja inferior sobre la pantalla actual, que se ve atenuada detrás: explica
 * algo antes de una decisión sin sacar al usuario de lo que estaba haciendo.
 */
export function Hoja({
  visible,
  alCerrar,
  titulo,
  icono,
  children,
  acciones,
}: Props) {
  const {bottom} = useSafeAreaInsets();
  return (
    <HojaAnimada
      alCerrar={alCerrar}
      estilo={[styles.hoja, {paddingBottom: bottom + 20}]}
      visible={visible}>
      <View style={styles.asa} />
      <View style={styles.encabezado}>
        <View style={styles.icono}>
          <Icono color="info" icono={icono} tamano={26} />
        </View>
        <Texto
          accessibilityRole="header"
          style={styles.titulo}
          variante="titulo">
          {titulo}
        </Texto>
      </View>
      {children}
      <View style={styles.acciones}>{acciones}</View>
    </HojaAnimada>
  );
}

const styles = StyleSheet.create(tema => ({
  hoja: {
    gap: tema.espaciado.lg + 2,
    paddingTop: tema.espaciado.sm + 2,
    paddingHorizontal: tema.espaciado.lg + 4,
    borderTopLeftRadius: tema.radio.xl,
    borderTopRightRadius: tema.radio.xl,
    backgroundColor: tema.colores.fondo,
  },
  asa: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: tema.radio.pill,
    backgroundColor: tema.colores.borde,
  },
  encabezado: {flexDirection: 'row', alignItems: 'center', gap: 14},
  icono: {
    width: 52,
    height: 52,
    borderRadius: tema.radio.lg - 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tema.colores.infoSuave,
  },
  titulo: {flex: 1, fontSize: 22, lineHeight: 27, letterSpacing: -0.4},
  acciones: {gap: tema.espaciado.xs, paddingTop: tema.espaciado.xs},
}));
