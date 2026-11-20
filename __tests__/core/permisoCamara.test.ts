import {Platform, TurboModuleRegistry} from 'react-native';

import {pedirPermisoCamara} from '@/core/archivos';

/** Módulo de camera-kit simulado con el estado del permiso en iOS. */
const conModulo = (estado: boolean | number, alPedir = false) => {
  const modulo = {
    checkDeviceCameraAuthorizationStatus: jest.fn(async () => estado),
    requestDeviceCameraAuthorization: jest.fn(async () => alPedir),
  };
  jest.spyOn(TurboModuleRegistry, 'get').mockReturnValue(modulo as never);
  return modulo;
};

describe('permiso de cámara en iOS', () => {
  afterEach(() => jest.restoreAllMocks());

  it('las pruebas corren como iOS', () => {
    expect(Platform.OS).toBe('ios');
  });

  it('concedido antes: no vuelve a preguntar', async () => {
    const modulo = conModulo(true);
    expect(await pedirPermisoCamara()).toBe('concedido');
    expect(modulo.requestDeviceCameraAuthorization).not.toHaveBeenCalled();
  });

  it('la primera vez muestra el diálogo del sistema', async () => {
    conModulo(-1, true);
    expect(await pedirPermisoCamara()).toBe('concedido');
  });

  it('si lo niega queda bloqueado: iOS no vuelve a preguntar', async () => {
    conModulo(-1, false);
    expect(await pedirPermisoCamara()).toBe('bloqueado');
  });

  it('negado antes: bloqueado, para ofrecer los ajustes', async () => {
    const modulo = conModulo(false);
    expect(await pedirPermisoCamara()).toBe('bloqueado');
    expect(modulo.requestDeviceCameraAuthorization).not.toHaveBeenCalled();
  });

  it('sin el módulo nativo deja que el sistema pregunte', async () => {
    jest.spyOn(TurboModuleRegistry, 'get').mockReturnValue(null);
    expect(await pedirPermisoCamara()).toBe('concedido');
  });
});
