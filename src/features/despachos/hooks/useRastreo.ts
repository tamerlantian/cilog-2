import {useEffect} from 'react';

import {
  asignacionRastreada,
  detenerRastreo,
  escucharRastreoRechazado,
  iniciarRastreo,
} from '@/core/rastreo';
import {mostrarInfo} from '@/ui';

import {debeDetenerse, puedeRastrearse} from '../domain/rastreo';
import {useActualizarDespachos} from './useAccionesDespacho';
import {useDespachos} from './useDespachos';

type DespachoAbierto = Parameters<typeof puedeRastrearse>[0];

/**
 * Al abrir un despacho en curso se empieza a compartir la ubicación con él (o
 * se cambia a él si se rastreaba otro). Arranca con la app abierta, que es lo
 * que permite no pedir ubicación "todo el tiempo".
 */
export const useRastrearDespacho = (
  despacho: DespachoAbierto | null | undefined,
) => {
  const id = despacho?.tenantDespachoId;
  const enCurso = despacho ? puedeRastrearse(despacho) : false;
  useEffect(() => {
    if (id === undefined || !enCurso) return;
    // Sin permiso o con el GPS apagado el despacho funciona igual.
    iniciarRastreo(id).catch(() => undefined);
  }, [id, enCurso]);
};

/**
 * Vigila el rastreo mientras hay sesión: lo detiene cuando su despacho deja de
 * estar en curso y, si Fluor lo rechaza (despacho cerrado o liberado), avisa y
 * trae el estado actual de los despachos.
 */
export const useVigilarRastreo = () => {
  const {data: despachos} = useDespachos();
  const {mutate: actualizar} = useActualizarDespachos();

  useEffect(() => {
    // Sin datos todavía no se sabe nada: no se detiene por las dudas.
    if (!despachos) return;
    if (debeDetenerse(asignacionRastreada(), despachos)) {
      detenerRastreo({enviarPendientes: true}).catch(() => undefined);
    }
  }, [despachos]);

  useEffect(
    () =>
      escucharRastreoRechazado(() => {
        mostrarInfo(
          'La empresa cerró o liberó el despacho: dejamos de compartir tu ubicación.',
        );
        actualizar();
      }),
    [actualizar],
  );
};
