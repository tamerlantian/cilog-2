import type {ReactNode} from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';
import {StyleSheet} from 'react-native-unistyles';

type Props = {
  children: ReactNode;
  /** Envuelve el contenido en un ScrollView que respeta el teclado. */
  desplazable?: boolean;
  /** Bordes con safe area. Con edge-to-edge activo hay que respetarlos siempre. */
  bordes?: readonly Edge[];
  estiloContenido?: StyleProp<ViewStyle>;
};

const TODOS_LOS_BORDES: readonly Edge[] = ['top', 'bottom', 'left', 'right'];

/** Contenedor base de toda pantalla: safe areas, teclado y scroll opcional. */
export function Pantalla({
  children,
  desplazable = false,
  bordes = TODOS_LOS_BORDES,
  estiloContenido,
}: Props) {
  return (
    <SafeAreaView edges={bordes} style={styles.raiz}>
      <KeyboardAvoidingView behavior="padding" style={styles.raiz}>
        {desplazable ? (
          <ScrollView
            contentContainerStyle={[styles.contenido, estiloContenido]}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create(tema => ({
  raiz: {flex: 1, backgroundColor: tema.colores.fondo},
  contenido: {flexGrow: 1, padding: tema.espaciado.lg, gap: tema.espaciado.lg},
}));
