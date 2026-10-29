import {leerExpiracion, tokenVencido} from '@/core/sesion/jwt';

import {crearJwt} from '../helpers';

describe('jwt', () => {
  it('lee la expiración del token', () => {
    const exp = leerExpiracion(crearJwt(600));
    expect(exp).toBeGreaterThan(Date.now() / 1000);
  });

  it('un token vigente no está vencido', () => {
    expect(tokenVencido(crearJwt(600))).toBe(false);
  });

  it('un token pasado o dentro del margen de 30 s está vencido', () => {
    expect(tokenVencido(crearJwt(-10))).toBe(true);
    expect(tokenVencido(crearJwt(10))).toBe(true);
  });

  it('un token mal formado cuenta como vencido', () => {
    expect(leerExpiracion('basura')).toBeNull();
    expect(tokenVencido('a.b.c')).toBe(true);
  });
});
