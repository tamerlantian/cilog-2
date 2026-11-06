import NetInfo from '@react-native-community/netinfo';
import {AppState} from 'react-native';

import {borrarEvidencia} from '@/core/archivos';
import {escribir} from '@/core/db';
import {useSesion} from '@/core/sesion';

import {
  purgarConfirmadas,
  reanudarUsuario,
  recuperarInterrumpidas,
} from './cola';
import {crearMotor, type Enviador, type Motor} from './motor';

/** Con la app abierta y pendientes, por si la red cambia sin avisar (señal falsa). */
const INTERVALO_MS = 60_000;
/** Las confirmadas se conservan para soporte. */
const RETENCION_MS = 7 * 24 * 60 * 60 * 1000;

let motor: Motor | null = null;
const oyentes = new Set<() => void>();
const avisarOyentes = () => oyentes.forEach(oyente => oyente());

const usuarioActual = () => {
  const {estado, usuario} = useSesion.getState();
  return estado === 'activa' && usuario ? usuario.id : null;
};

/** El motor en uso. Null antes de `iniciarSincronizacion`. */
export const obtenerMotor = () => motor;

/**
 * Avisa cada vez que cambia el estado de la cola (sale, se confirma, falla).
 * Sigue funcionando si el motor se reinicia. Devuelve cómo dejar de escuchar.
 */
export const escucharCola = (oyente: () => void) => {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
};

/**
 * Pide enviar lo pendiente. Las features la llaman al guardar una operación;
 * con señal, sale al instante.
 */
export const sincronizarAhora = (opciones?: {ignorarEspera?: boolean}) =>
  motor?.ejecutar(opciones) ?? Promise.resolve();

/**
 * Arranca el motor y sus disparadores. Se llama una vez, con la base ya abierta.
 * NetInfo solo despierta al motor: nunca decide que "no hay red" (ver docs/offline.md §6.3).
 */
export const iniciarSincronizacion = async (
  enviadores: Record<string, Enviador>,
) => {
  motor = crearMotor({enviadores, usuarioActual});
  const actual = motor;
  const dejarMotor = actual.suscribir(avisarOyentes);

  const conSesion = usuarioActual();
  const purgadas = await escribir(async tx => {
    await recuperarInterrumpidas(tx);
    // Con la sesión abierta, nada del usuario debe seguir pausado.
    if (conSesion !== null) await reanudarUsuario(tx, conSesion);
    return purgarConfirmadas(tx, Date.now() - RETENCION_MS);
  });
  await Promise.all(purgadas.map(borrarEvidencia));

  let conectado: boolean | null = null;
  const dejarRed = NetInfo.addEventListener(({isConnected}) => {
    const volvio = isConnected === true && conectado === false;
    conectado = isConnected;
    if (volvio) actual.ejecutar({ignorarEspera: true});
  });

  let intervalo: ReturnType<typeof setInterval> | null = null;
  const programar = (activa: boolean) => {
    if (intervalo) clearInterval(intervalo);
    intervalo = activa
      ? setInterval(() => actual.ejecutar(), INTERVALO_MS)
      : null;
  };
  const dejarApp = AppState.addEventListener('change', estado => {
    // Al ir a segundo plano, un último intento mientras el sistema lo permita.
    actual.ejecutar();
    programar(estado === 'active');
  });
  programar(AppState.currentState === 'active');

  // Al iniciar sesión, la cola pausada de ese usuario sigue donde quedó.
  const dejarSesion = useSesion.subscribe((nuevo, anterior) => {
    const usuarioId = nuevo.usuario?.id;
    if (
      nuevo.estado !== 'activa' ||
      anterior.estado === 'activa' ||
      !usuarioId
    ) {
      return;
    }
    escribir(tx => reanudarUsuario(tx, usuarioId))
      .then(() => actual.ejecutar({ignorarEspera: true}))
      .catch(() => undefined);
  });

  actual.ejecutar();

  return () => {
    dejarMotor();
    dejarRed();
    dejarApp.remove();
    dejarSesion();
    programar(false);
    motor = null;
  };
};
