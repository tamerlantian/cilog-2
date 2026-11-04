import type {ReactNode} from 'react';
import {Modal, Pressable, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import type {TipoIcono} from './Icono';
import {IconoDestacado} from './IconoDestacado';
import {Texto} from './Texto';

type Props = {
  visible: boolean;
  alCerrar: () => void;
  titulo: string;
  mensaje?: string;
  icono?: TipoIcono;
  /** Contenido entre el mensaje y las acciones (resúmenes, avisos). */
  children?: ReactNode;
  /** Botones, de arriba abajo: el principal primero. */
  acciones: ReactNode;
};

/**
 * Confirmación con contenido propio, cuando un `Alert` del sistema se queda
 * corto (p. ej. terminar el despacho con su resumen). Tocar fuera la cierra.
 */
export function Dialogo({
  visible,
  alCerrar,
  titulo,
  mensaje,
  icono,
  children,
  acciones,
}: Props) {
  return (
    <Modal
      animationType="fade"
      statusBarTranslucent
      transparent
      visible={visible}
      onRequestClose={alCerrar}>
      <View style={styles.raiz}>
        <Pressable
          accessibilityLabel="Cerrar"
          accessibilityRole="button"
          style={styles.velo}
          onPress={alCerrar}
        />
        <View accessibilityViewIsModal style={styles.tarjeta}>
          {icono ? <IconoDestacado icono={icono} /> : null}
          <View style={styles.textos}>
            <Texto accessibilityRole="header" negrita variante="subtitulo">
              {titulo}
            </Texto>
            {mensaje ? <Texto tono="secundario">{mensaje}</Texto> : null}
          </View>
          {children}
          <View style={styles.acciones}>{acciones}</View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create(tema => ({
  raiz: {
    flex: 1,
    justifyContent: 'center',
    padding: tema.espaciado.lg + 4,
  },
  velo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: tema.colores.velo,
  },
  tarjeta: {
    gap: tema.espaciado.lg + 2,
    padding: tema.espaciado.xl,
    borderRadius: tema.radio.xl,
    backgroundColor: tema.colores.fondo,
  },
  textos: {gap: tema.espaciado.xs + 2},
  acciones: {gap: tema.espaciado.xs},
}));
