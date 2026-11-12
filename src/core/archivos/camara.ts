import {launchCamera} from 'react-native-image-picker';

import {pedirPermisoCamara} from './permisoCamara';

/** Máximo lado de la foto: ~200 KB, sube con señal débil (docs/offline.md §8). */
const LADO_MAXIMO = 1280;
const CALIDAD = 0.7;

/** `sinPermiso`: para ofrecer los ajustes si el permiso quedó bloqueado. */
export class ErrorCamara extends Error {
  constructor(
    message: string,
    readonly sinPermiso: 'denegado' | 'bloqueado' | null = null,
  ) {
    super(message);
  }
}

/**
 * Abre la cámara del sistema y devuelve el archivo temporal de la foto, o null
 * si el conductor la cerró sin tomarla. La foto no va a la galería.
 */
export const tomarFoto = async (): Promise<string | null> => {
  const permiso = await pedirPermisoCamara();
  if (permiso !== 'concedido') {
    throw new ErrorCamara(
      'Sin permiso de cámara no se pueden tomar fotos.',
      permiso,
    );
  }
  const respuesta = await launchCamera({
    mediaType: 'photo',
    maxWidth: LADO_MAXIMO,
    maxHeight: LADO_MAXIMO,
    quality: CALIDAD,
    saveToPhotos: false,
    includeBase64: false,
  });
  if (respuesta.didCancel) return null;
  if (respuesta.errorCode === 'camera_unavailable') {
    throw new ErrorCamara('Este teléfono no tiene cámara disponible.');
  }
  // iOS: el conductor negó el permiso antes y el sistema ya no vuelve a preguntar.
  if (respuesta.errorCode === 'permission') {
    throw new ErrorCamara(
      'Sin permiso de cámara no se pueden tomar fotos.',
      'bloqueado',
    );
  }
  const uri = respuesta.assets?.[0]?.uri;
  if (respuesta.errorCode || !uri) {
    throw new ErrorCamara('No se pudo tomar la foto. Inténtalo de nuevo.');
  }
  return uri;
};
