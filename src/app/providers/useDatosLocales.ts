import {useCallback, useEffect, useState} from 'react';

import {abrirBase} from '@/core/db';
import {iniciarSincronizacion, type Enviador} from '@/core/sync';
import {enviadoresDespachos} from '@/features/despachos';

/**
 * Enviadores por tipo de operación. Un tipo sin enviador (novedad y terminar,
 * hasta que Fluor los publique) espera en la cola.
 */
const ENVIADORES: Record<string, Enviador> = {...enviadoresDespachos};

export type EstadoDatos = 'abriendo' | 'listos' | 'error';

/** Abre la base del teléfono y enciende la sincronización. */
export const useDatosLocales = () => {
  const [estado, setEstado] = useState<EstadoDatos>('abriendo');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let detener: (() => void) | undefined;
    let vigente = true;
    abrirBase()
      .then(() => iniciarSincronizacion(ENVIADORES))
      .then(detenerSincronizacion => {
        detener = detenerSincronizacion;
        if (vigente) setEstado('listos');
        else detenerSincronizacion();
      })
      .catch(() => {
        if (vigente) setEstado('error');
      });
    return () => {
      vigente = false;
      detener?.();
    };
  }, [intento]);

  const reintentar = useCallback(() => {
    setEstado('abriendo');
    setIntento(n => n + 1);
  }, []);

  return {estado, reintentar};
};
