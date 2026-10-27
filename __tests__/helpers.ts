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
