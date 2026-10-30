import {useQuery} from '@tanstack/react-query';
import {Alert} from 'react-native';

import {leer} from '@/core/db';
import {useSesion} from '@/core/sesion';
import {resumenCola, sincronizarAhora} from '@/core/sync';

/** Operaciones del usuario que todavía no llegan a Fluor. */
const usePendientes = (usuarioId: number | null) =>
  useQuery({
    queryKey: ['cuenta', 'pendientes', usuarioId],
    queryFn: async () => {
      const resumen = await leer(db => resumenCola(db, usuarioId ?? 0));
      return Object.values(resumen).reduce((suma, n) => suma + n, 0);
    },
    enabled: usuarioId !== null,
    staleTime: 0,
    retry: false,
    networkMode: 'always',
  });

/**
 * Cerrar sesión con envíos pendientes avisa primero (docs/offline.md §9): la
 * cola queda guardada con su usuario y solo sale cuando él vuelva a entrar.
 */
export const useCerrarSesion = () => {
  const usuarioId = useSesion(s => s.usuario?.id ?? null);
  const cerrarSesion = useSesion(s => s.cerrarSesion);
  const {data: pendientes = 0} = usePendientes(usuarioId);

  const cerrar = () => {
    if (pendientes === 0) {
      cerrarSesion();
      return;
    }
    Alert.alert(
      `Tienes ${pendientes} ${pendientes === 1 ? 'envío pendiente' : 'envíos pendientes'}`,
      'Si cierras sesión no se enviarán hasta que vuelvas a entrar con esta cuenta.',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Enviar primero',
          onPress: () => sincronizarAhora({ignorarEspera: true}),
        },
        {
          text: 'Cerrar igual',
          style: 'destructive',
          onPress: () => cerrarSesion(),
        },
      ],
    );
  };

  return {cerrar, pendientes};
};
