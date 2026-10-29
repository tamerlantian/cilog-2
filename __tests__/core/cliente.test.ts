import type {InternalAxiosRequestConfig} from 'axios';

import {cliente, configurarSesionApi} from '@/core/api/cliente';
import {ErrorApi} from '@/core/api/errores';

const respuestaFalsa = (
  config: InternalAxiosRequestConfig,
  estado: number,
  data: unknown,
) => ({
  data,
  status: estado,
  statusText: '',
  headers: {},
  config,
});

/** Adaptador que devuelve la configuración recibida para inspeccionar los headers. */
const adaptadorEco =
  (estado = 200, data: unknown = {}) =>
  (config: InternalAxiosRequestConfig) => {
    const respuesta = respuestaFalsa(config, estado, data);
    return estado < 400
      ? Promise.resolve(respuesta)
      : Promise.reject(
          Object.assign(new Error('fallo'), {
            isAxiosError: true,
            config,
            response: respuesta,
          }),
        );
  };

afterEach(() => configurarSesionApi(null));

describe('cliente API', () => {
  it('agrega X-Request-ID válido en cada petición', async () => {
    const {config} = await cliente.get('/health', {adapter: adaptadorEco()});
    const id = String(config.headers.get('X-Request-ID'));
    expect(id).toMatch(/^[A-Za-z0-9-]{1,64}$/);
  });

  it('agrega token y empresa cuando hay sesión', async () => {
    configurarSesionApi({
      obtenerToken: () => 'jwt-123',
      obtenerTenantId: () => 7,
      alSesionInvalida: jest.fn(),
    });
    const {config} = await cliente.get('/tte/guia/lista', {
      adapter: adaptadorEco(),
    });
    expect(config.headers.get('Authorization')).toBe('Bearer jwt-123');
    expect(config.headers.get('X-Tenant-ID')).toBe('7');
  });

  it('no envía Authorization ni X-Tenant-ID sin sesión', async () => {
    const {config} = await cliente.post(
      '/auth/seguridad/login',
      {},
      {adapter: adaptadorEco()},
    );
    expect(config.headers.get('Authorization')).toBeUndefined();
    expect(config.headers.get('X-Tenant-ID')).toBeUndefined();
  });

  it('rechaza con ErrorApi y avisa si el token ya no sirve', async () => {
    const alSesionInvalida = jest.fn();
    configurarSesionApi({
      obtenerToken: () => 'vencido',
      obtenerTenantId: () => 1,
      alSesionInvalida,
    });
    const cuerpo = {
      success: false,
      error: {code: 'UNAUTHORIZED', message: 'No autenticado'},
    };

    await expect(
      cliente.get('/x', {adapter: adaptadorEco(401, cuerpo)}),
    ).rejects.toBeInstanceOf(ErrorApi);
    expect(alSesionInvalida).toHaveBeenCalledTimes(1);
  });

  it('un 401 de una petición con un token anterior no cierra la sesión nueva', async () => {
    const alSesionInvalida = jest.fn();
    let token = 'anterior';
    configurarSesionApi({
      obtenerToken: () => token,
      obtenerTenantId: () => 1,
      alSesionInvalida,
    });
    const cuerpo = {
      success: false,
      error: {code: 'UNAUTHORIZED', message: 'No autenticado'},
    };
    const adaptador = adaptadorEco(401, cuerpo);

    await expect(
      cliente.get('/x', {
        // El usuario vuelve a iniciar sesión mientras la petición está en vuelo.
        adapter: config => {
          token = 'nuevo';
          return adaptador(config);
        },
      }),
    ).rejects.toBeInstanceOf(ErrorApi);
    expect(alSesionInvalida).not.toHaveBeenCalled();
  });

  it('un 401 de login (sin token) no cierra sesión', async () => {
    const alSesionInvalida = jest.fn();
    configurarSesionApi({
      obtenerToken: () => null,
      obtenerTenantId: () => null,
      alSesionInvalida,
    });
    const cuerpo = {
      success: false,
      error: {code: 'UNAUTHORIZED', message: 'Credenciales inválidas'},
    };

    await expect(
      cliente.post(
        '/auth/seguridad/login',
        {},
        {adapter: adaptadorEco(401, cuerpo)},
      ),
    ).rejects.toThrow('Credenciales inválidas');
    expect(alSesionInvalida).not.toHaveBeenCalled();
  });
});
