import {fireEvent} from '@testing-library/react-native';

// Jest corre en Node; los tipos de React Native no declaran Buffer.
declare const Buffer: {
  from: (texto: string) => {toString: (codificacion: 'base64url') => string};
};

const base64Url = (objeto: object) =>
  Buffer.from(JSON.stringify(objeto)).toString('base64url');

/** JWT de prueba (sin firma real) que vence en `segundos` desde ahora. */
export const crearJwt = (segundos: number) =>
  `${base64Url({alg: 'HS256'})}.${base64Url({
    sub: '1',
    exp: Math.floor(Date.now() / 1000) + segundos,
  })}.firma`;

export const usuarioPrueba = {
  id: 1,
  email: 'conductor@prueba.test',
  role: 'user',
  numero_identificacion: '123',
};

export const empresaPrueba = (id: number, nombre: string) => ({
  id,
  tenant_id: id,
  tenant_nombre: nombre,
  activo: true,
});

/** Evento táctil mínimo que entiende PanResponder. */
export const toque = (x: number, y: number, tiempo: number) => {
  const punto = {
    touchActive: true,
    startPageX: x,
    startPageY: y,
    startTimeStamp: tiempo,
    currentPageX: x,
    currentPageY: y,
    currentTimeStamp: tiempo,
    previousPageX: x,
    previousPageY: y,
    previousTimeStamp: tiempo,
  };
  return {
    nativeEvent: {
      locationX: x,
      locationY: y,
      pageX: x,
      pageY: y,
      timestamp: tiempo,
    },
    touchHistory: {
      touchBank: [punto],
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: tiempo,
    },
  };
};

/** Un trazo con el dedo sobre el panel de firma. */
export const firmar = async (lienzo: Parameters<typeof fireEvent>[0]) => {
  await fireEvent(lienzo, 'responderGrant', toque(10, 10, 1));
  await fireEvent(lienzo, 'responderMove', toque(40, 30, 2));
  await fireEvent(lienzo, 'responderRelease', toque(40, 30, 3));
};
