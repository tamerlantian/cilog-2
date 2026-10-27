import Toast from 'react-native-toast-message';

/** Avisos breves. Un solo lugar para cambiar duración, posición y estilo. */
export const mostrarExito = (texto: string) =>
  Toast.show({type: 'success', text1: texto, visibilityTime: 3000});

export const mostrarError = (texto: string) =>
  Toast.show({type: 'error', text1: texto, visibilityTime: 5000});

export const mostrarInfo = (texto: string) =>
  Toast.show({type: 'info', text1: texto, visibilityTime: 3000});

export function ContenedorMensajes() {
  return <Toast />;
}
