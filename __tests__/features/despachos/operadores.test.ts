import {tenantDeOperador} from '@/features/despachos/domain/operadores';

describe('tenantDeOperador (temporal)', () => {
  it.each([
    [12, 21],
    [16, 32],
    [17, 2],
    [18, 4],
    [31, 35],
  ])('traduce el operador %i al tenant %i', (operador, tenant) => {
    expect(tenantDeOperador(operador)).toBe(tenant);
  });

  it.each([38, 66, 67, 77, 82, 83, 5])('deja %i tal cual', operador => {
    expect(tenantDeOperador(operador)).toBe(operador);
  });
});
