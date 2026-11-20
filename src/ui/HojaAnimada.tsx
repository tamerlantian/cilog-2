import {useEffect, useState, type ReactNode} from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

type Props = {
  visible: boolean;
  /** Atrás de Android. */
  alCerrar: () => void;
  /** Si se da, tocar el velo cierra la hoja. */
  alTocarVelo?: () => void;
  /** Forma de la hoja (fondo, bordes, relleno, alto máximo). */
  estilo: StyleProp<ViewStyle>;
  children: ReactNode;
};

const ABRIR_MS = 280;
const CERRAR_MS = 200;

/**
 * Base de las hojas inferiores. El velo aparece en su sitio (opacidad) y solo
 * la hoja sube desde abajo; al cerrar, la hoja baja y el modal se desmonta
 * cuando termina. Con `animationType="slide"` del Modal el velo subía junto
 * con la hoja.
 */
export function HojaAnimada({
  visible,
  alCerrar,
  alTocarVelo,
  estilo,
  children,
}: Props) {
  const [progreso] = useState(() => new Animated.Value(0));
  const [montada, setMontada] = useState(visible);
  const {height: altoVentana} = useWindowDimensions();
  const [altoHoja, setAltoHoja] = useState<number | null>(null);

  if (visible && !montada) setMontada(true);

  useEffect(() => {
    if (!montada) return;
    const animacion = Animated.timing(progreso, {
      toValue: visible ? 1 : 0,
      duration: visible ? ABRIR_MS : CERRAR_MS,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animacion.start(({finished}) => {
      if (finished && !visible) setMontada(false);
    });
    return () => animacion.stop();
  }, [visible, montada, progreso]);

  const desplazamiento = progreso.interpolate({
    inputRange: [0, 1],
    outputRange: [altoHoja ?? altoVentana, 0],
  });

  return (
    <Modal
      animationType="none"
      navigationBarTranslucent
      statusBarTranslucent
      transparent
      visible={montada}
      onRequestClose={alCerrar}>
      <Animated.View style={[styles.velo, {opacity: progreso}]}>
        {alTocarVelo ? (
          <Pressable
            accessibilityLabel="Cerrar"
            accessibilityRole="button"
            style={styles.relleno}
            onPress={alTocarVelo}
          />
        ) : null}
      </Animated.View>
      <KeyboardAvoidingView
        behavior="padding"
        pointerEvents="box-none"
        style={styles.raiz}>
        <Animated.View
          accessibilityViewIsModal
          style={[estilo, {transform: [{translateY: desplazamiento}]}]}
          onLayout={evento => setAltoHoja(evento.nativeEvent.layout.height)}>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create(tema => ({
  raiz: {flex: 1, justifyContent: 'flex-end'},
  velo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: tema.colores.velo,
  },
  relleno: {flex: 1},
}));
