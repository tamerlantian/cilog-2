import {useMutation, useQueryClient} from '@tanstack/react-query';

import {escribir} from '@/core/db';
import {reintentar, resumenCola, sincronizarAhora} from '@/core/sync';

import {descartarEnvio, leerEnvios} from '../db/repositorio';
import type {ResumenEnvios} from '../domain/envios';
import {clavesDespachos} from './claves';
import {useConsultaLocal, useUsuarioId} from './local';

export const useEnvios = () => {
  const usuarioId = useUsuarioId() ?? 0;
  return useConsultaLocal(
    clavesDespachos.envios(usuarioId),
    db => leerEnvios(db, usuarioId),
    usuarioId > 0,
  );
};

export const useResumenEnvios = () => {
  const usuarioId = useUsuarioId() ?? 0;
  return useConsultaLocal(
    clavesDespachos.resumenEnvios(usuarioId),
    // `confirmada` nunca viene: el resumen solo cuenta lo que falta.
    db => resumenCola(db, usuarioId) as Promise<ResumenEnvios>,
    usuarioId > 0,
  );
};

/** Enviar ahora, reintentar y descartar. Todo es local: funciona sin señal. */
export const useAccionesEnvio = () => {
  const consultas = useQueryClient();
  const opciones = {
    onSettled: () =>
      consultas.invalidateQueries({queryKey: clavesDespachos.todo}),
    networkMode: 'always',
  } as const;

  const enviarAhora = useMutation({
    mutationFn: () => sincronizarAhora({ignorarEspera: true}),
    ...opciones,
  });
  const reintentarEnvio = useMutation({
    mutationFn: async (idOperacion: string) => {
      await escribir(tx => reintentar(tx, idOperacion));
      // No se espera el envío: el conductor ve "Enviando…" en la lista.
      sincronizarAhora({ignorarEspera: true});
    },
    ...opciones,
  });
  const descartarEnvioLocal = useMutation({
    mutationFn: (idOperacion: string) =>
      escribir(tx => descartarEnvio(tx, idOperacion)),
    ...opciones,
  });

  return {
    enviarAhora,
    reintentar: reintentarEnvio,
    descartar: descartarEnvioLocal,
  };
};
