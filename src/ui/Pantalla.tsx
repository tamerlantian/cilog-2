import type {ReactNode} from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';
import {StyleSheet, useUnistyles} from 'react-native-unistyles';

import {esFondoOscuro} from './tema/color';

type Props = {
  children: ReactNode;
  /** Envuelve el contenido en un ScrollView que respeta el teclado. */
  desplazable?: boolean;
  /** Bordes con safe area. Con edge-to-edge activo hay que respetarlos siempre. */
  bordes?: readonly Edge[];
  /** `suelo` (por defecto) es el fondo de pantalla. Para la superficie de marca, envolver en `Escena`. */
  fondo?: 'suelo' | 'fondo' | 'superficie';
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
  fondo = 'suelo',
  pie,
  estiloContenido,
}: Props) {
  styles.useVariants({fondo});
  const {theme} = useUnistyles();
  // Edge-to-edge: la barra de estado va sobre el fondo de la pantalla.
  const barra = esFondoOscuro(theme.colores[fondo])
    ? 'light-content'
    : 'dark-content';
  return (
    // El fondo va en un View de React Native: unistyles no aplica la escena
    // (`ScopedTheme`) a componentes de terceros como SafeAreaView.
    <View style={styles.raiz}>
      <StatusBar barStyle={barra} />
      <SafeAreaView edges={bordes} style={styles.flex}>
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
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  raiz: {
    flex: 1,
    variants: {
      fondo: {
        suelo: {backgroundColor: tema.colores.suelo},
        fondo: {backgroundColor: tema.colores.fondo},
        superficie: {backgroundColor: tema.colores.superficie},
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
