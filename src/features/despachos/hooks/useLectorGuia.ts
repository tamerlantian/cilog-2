import {useState} from 'react';

import {
  avisarPermisoCamaraBloqueado,
  pedirPermisoCamara,
} from '@/core/archivos';
import {mostrarError} from '@/ui';

/** Abre el lector solo si hay permiso de cámara. */
export const useLectorGuia = () => {
  const [abierto, setAbierto] = useState(false);

  const abrir = async () => {
    const permiso = await pedirPermisoCamara();
    if (permiso === 'concedido') {
      setAbierto(true);
    } else if (permiso === 'bloqueado') {
      avisarPermisoCamaraBloqueado('leer códigos');
    } else {
      mostrarError('Sin permiso de cámara no se pueden leer códigos.');
    }
  };

  return {abierto, abrir, cerrar: () => setAbierto(false)};
};
