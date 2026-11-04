import {useCallback, useEffect, useState} from 'react';

import {
  ErrorCamara,
  hayEspacioParaEvidencias,
  tomarFoto,
} from '@/core/archivos';
import {obtenerUbicacion, type Ubicacion} from '@/core/ubicacion';
import {mostrarError} from '@/ui';

/**
 * Pide la ubicación al abrir el formulario, para no hacer esperar al
 * conductor al confirmar. Null mientras llega o si no hay GPS.
 */
export const useUbicacion = () => {
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  useEffect(() => {
    let vigente = true;
    obtenerUbicacion().then(posicion => {
      if (vigente) setUbicacion(posicion);
    });
    return () => {
      vigente = false;
    };
  }, []);
  return ubicacion;
};

/** Abre la cámara si hay espacio; devuelve la foto temporal o null. */
export const useTomarFoto = () => {
  const [tomando, setTomando] = useState(false);
  const tomar = useCallback(async () => {
    setTomando(true);
    try {
      if (!(await hayEspacioParaEvidencias())) {
        mostrarError(
          'El teléfono tiene poco espacio. Libera al menos 50 MB para tomar fotos.',
        );
        return null;
      }
      return await tomarFoto();
    } catch (error) {
      mostrarError(
        error instanceof ErrorCamara
          ? error.message
          : 'No se pudo abrir la cámara. Inténtalo de nuevo.',
      );
      return null;
    } finally {
      setTomando(false);
    }
  }, []);
  return {tomar, tomando};
};
