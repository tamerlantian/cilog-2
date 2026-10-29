import type {ReactNode} from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  type StyleProp,
  View,
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
  /** `marca` para pantallas con encabezado de color (login). */
  fondo?: 'fondo' | 'superficie' | 'marca';
  /** Acciones fijas abajo (botón principal). Suben con el teclado y no se desplazan. */
  pie?: ReactNode;
  estiloContenido?: StyleProp<ViewStyle>;
};

const TODOS_LOS_BORDES: readonly Edge[] = ['top', 'bottom', 'left', 'right'];

/** Contenedor base de toda pantalla: safe areas, teclado, scroll y pie opcionales. */
export function Pantalla({
  children,
  desplazable = false,
  bordes = TODOS_LOS_BORDES,
  fondo = 'fondo',
  pie,
  estiloContenido,
}: Props) {
  styles.useVariants({fondo});
  return (
    <SafeAreaView edges={bordes} style={styles.raiz}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        {desplazable ? (
          <ScrollView
            contentContainerStyle={[styles.contenido, estiloContenido]}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, estiloContenido]}>{children}</View>
        )}
        {pie ? <View style={styles.pie}>{pie}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create(tema => ({
  raiz: {
    flex: 1,
    variants: {
      fondo: {
        fondo: {backgroundColor: tema.colores.fondo},
        superficie: {backgroundColor: tema.colores.superficie},
        marca: {backgroundColor: tema.colores.marca},
      },
    },
  },
  flex: {flex: 1},
  contenido: {flexGrow: 1, padding: tema.espaciado.lg, gap: tema.espaciado.lg},
  pie: {
    paddingHorizontal: tema.espaciado.xl,
    paddingTop: tema.espaciado.md,
    paddingBottom: tema.espaciado.lg,
    gap: tema.espaciado.xs,
    borderTopWidth: 1,
    borderTopColor: tema.colores.superficie,
  },
}));
