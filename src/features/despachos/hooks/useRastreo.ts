import {useCallback, useEffect, useMemo, useState} from 'react';
import {AppState, Linking} from 'react-native';

import {
  abrirAjustesBateria,
  asignacionRastreada,
  bateriaSinRestricciones,
  detenerRastreo,
  escucharEstadoUbicacion,
  escucharRastreoRechazado,
  fueRechazada,
  iniciarRastreo,
  leerEstadoUbicacion,
  marcaTelefono,
  pedirPermisoNotificaciones,
  pedirPermisoUbicacion,
  type EstadoUbicacion,
} from '@/core/rastreo';
import {almacen} from '@/core/storage';
import {mostrarInfo} from '@/ui';

import {
  debeDetenerse,
  guiaBateria,
  indicadorUbicacion,
  puedeRastrearse,
} from '../domain/rastreo';
import {useActualizarDespachos} from './useAccionesDespacho';
import {useDespachos} from './useDespachos';
import {useUsuarioId} from './local';

type DespachoAbierto = Parameters<typeof puedeRastrearse>[0];

/** El conductor leyó el aviso y siguió. Por usuario: otro conductor lo ve de nuevo. */
export const claveAvisoUbicacion = (usuarioId: number) =>
  `rastreo.aviso.${usuarioId}`;

/** Ya vio la guía de batería y dijo "Ya lo hice": no se le insiste. */
const CLAVE_BATERIA = 'rastreo.bateriaRevisada';

const sinFallar = (promesa: Promise<unknown>) => {
  promesa.catch(() => undefined);
};

/**
 * Compartir la ubicación es obligatorio con un despacho en curso. La primera
 * vez se explica (aviso) y se pide el permiso; desde ahí arranca al abrir el
 * despacho, con la app abierta, que es lo que permite no pedir ubicación
 * "todo el tiempo". Solo arranca con el permiso concedido: así Android no
 * vuelve a mostrar su diálogo cada vez que el conductor regresa a la app.
 */
export const useUbicacionDespacho = (
  despacho: DespachoAbierto | null | undefined,
) => {
  const usuarioId = useUsuarioId();
  const id = despacho?.tenantDespachoId;
  const enCurso =
    despacho !== null &&
    despacho !== undefined &&
    puedeRastrearse(despacho) &&
    !fueRechazada(despacho.tenantDespachoId);

  const [avisoAceptado, setAvisoAceptado] = useState(
    () =>
      usuarioId !== null &&
      almacen.getString(claveAvisoUbicacion(usuarioId)) === '1',
  );
  const [estado, setEstado] = useState<EstadoUbicacion | null>(null);
  const [bateriaLibre, setBateriaLibre] = useState(true);
  const [bateriaRevisada, setBateriaRevisada] = useState(
    () => almacen.getString(CLAVE_BATERIA) === '1',
  );
  const [guiaVisible, setGuiaVisible] = useState(false);

  /** Lee permiso, GPS y batería, y arranca si se puede. */
  const actualizar = useCallback(async () => {
    if (id === undefined) return;
    const actual = await leerEstadoUbicacion();
    if (actual.permiso === 'concedido') {
      await iniciarRastreo(id).catch(() => undefined);
      // Después del de ubicación: así ve la notificación de ruta en curso.
      await pedirPermisoNotificaciones();
    }
    const libre = await bateriaSinRestricciones();
    // Juntos: la línea cambia una sola vez, ya con todo leído.
    setEstado(actual);
    setBateriaLibre(libre);
  }, [id]);

  const activo = enCurso && avisoAceptado;

  useEffect(() => {
    if (!activo) return;
    sinFallar(actualizar());
    // Vuelve de los ajustes, o cambia el permiso o el GPS: se relee.
    const quitarEstado = escucharEstadoUbicacion(() => sinFallar(actualizar()));
    const app = AppState.addEventListener('change', estadoApp => {
      if (estadoApp === 'active') sinFallar(actualizar());
    });
    return () => {
      quitarEstado();
      app.remove();
    };
  }, [activo, actualizar]);

  const aceptarAviso = useCallback(async () => {
    await pedirPermisoUbicacion();
    if (usuarioId !== null) {
      almacen.set(claveAvisoUbicacion(usuarioId), '1');
    }
    setAvisoAceptado(true);
  }, [usuarioId]);

  const indicador =
    activo && estado
      ? indicadorUbicacion({
          ...estado,
          bateriaSinRestricciones: bateriaLibre,
          bateriaRevisada,
        })
      : null;

  /** La acción de la línea según lo que falte. */
  const resolver = useCallback(async () => {
    if (indicador === 'sinPermiso') {
      const permiso =
        estado?.permiso === 'bloqueado'
          ? 'bloqueado'
          : await pedirPermisoUbicacion();
      // Tras negarlo dos veces Android ya no muestra el diálogo y el plugin
      // responde "negado" (no "bloqueado"): sin esto el botón no haría nada.
      if (permiso !== 'concedido') await Linking.openSettings();
      await actualizar();
    } else if (indicador === 'gpsApagado') {
      await Linking.sendIntent(
        'android.settings.LOCATION_SOURCE_SETTINGS',
      ).catch(() => Linking.openSettings());
    } else if (indicador === 'bateria') {
      setGuiaVisible(true);
    }
  }, [indicador, estado, actualizar]);

  const guia = useMemo(() => guiaBateria(marcaTelefono()), []);

  return {
    avisoVisible: enCurso && !avisoAceptado,
    aceptarAviso,
    indicador,
    resolver,
    bateria: {
      visible: guiaVisible,
      guia,
      abrirAjustes: () =>
        sinFallar(abrirAjustesBateria().catch(() => Linking.openSettings())),
      listo: () => {
        almacen.set(CLAVE_BATERIA, '1');
        setBateriaRevisada(true);
        setGuiaVisible(false);
      },
      cerrar: () => setGuiaVisible(false),
    },
  };
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
