import {useQuery, useQueryClient, type QueryKey} from '@tanstack/react-query';
import {useEffect} from 'react';

import {leer, type Base} from '@/core/db';
import {useSesion} from '@/core/sesion';
import {escucharCola} from '@/core/sync';

import {clavesDespachos} from './claves';

/** El usuario con sesión. Las pantallas de la feature solo existen con sesión. */
export const useUsuarioId = () => useSesion(s => s.usuario?.id ?? null);

/**
 * Consulta a la base del teléfono. No espera red ni se reintenta: lo que está
 * guardado es la verdad para la pantalla. Se refresca al invalidar 'despachos'.
 */
export const useConsultaLocal = <T>(
  queryKey: QueryKey,
  consulta: (db: Base) => Promise<T>,
  habilitada = true,
) =>
  useQuery({
    queryKey,
    queryFn: () => leer(consulta),
    enabled: habilitada,
    staleTime: Infinity,
    retry: false,
    networkMode: 'always',
  });

/** Cuando la cola cambia (sale, se confirma, falla), las pantallas se actualizan. */
export const useEscucharCola = () => {
  const consultas = useQueryClient();
  useEffect(
    () =>
      escucharCola(() =>
        consultas.invalidateQueries({queryKey: clavesDespachos.todo}),
      ),
    [consultas],
  );
};
