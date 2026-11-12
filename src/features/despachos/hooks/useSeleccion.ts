import {useCallback, useEffect, useState} from 'react';
import {BackHandler} from 'react-native';

/**
 * Modo selección de la lista del despacho: guías que se gestionan juntas
 * (varios paquetes del mismo cliente). `codigos` es null fuera del modo.
 * El botón atrás de Android sale del modo antes de salir de la pantalla.
 */
export const useSeleccion = () => {
  const [codigos, setCodigos] = useState<readonly number[] | null>(null);
  const activa = codigos !== null;
  // Estable: la pantalla lo usa en efectos.
  const salir = useCallback(() => setCodigos(null), []);

  useEffect(() => {
    if (!activa) return;
    const suscripcion = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        setCodigos(null);
        return true;
      },
    );
    return () => suscripcion.remove();
  }, [activa]);

  return {
    activa,
    codigos: codigos ?? [],
    incluye: (codigo: number) => codigos?.includes(codigo) ?? false,
    /** Entra al modo, con una guía ya marcada o sin ninguna. */
    entrar: (codigo?: number) =>
      setCodigos(codigo === undefined ? [] : [codigo]),
    alternar: (codigo: number) =>
      setCodigos(actual =>
        actual?.includes(codigo)
          ? actual.filter(c => c !== codigo)
          : [...(actual ?? []), codigo],
      ),
    agregar: (codigo: number) =>
      setCodigos(actual =>
        actual?.includes(codigo) ? actual : [...(actual ?? []), codigo],
      ),
    salir,
  };
};
