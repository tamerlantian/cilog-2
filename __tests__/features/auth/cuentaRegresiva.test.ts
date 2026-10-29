import {formatoMinutos} from '@/features/auth/hooks/useCuentaRegresiva';

describe('formatoMinutos', () => {
  it.each([
    [60, '1:00'],
    [42, '0:42'],
    [5, '0:05'],
    [0, '0:00'],
  ])('%i segundos se muestran como %s', (segundos, esperado) => {
    expect(formatoMinutos(segundos)).toBe(esperado);
  });
});
