import type {InternalAxiosRequestConfig} from 'axios';

import {
  cliente,
  clienteRenovacion,
  configurarSesionApi,
  type ProveedorSesion,
} from '@/core/api/cliente';
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

const responder = (
  config: InternalAxiosRequestConfig,
  estado: number,
  data: unknown,
) => {
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

/** Adaptador que devuelve la configuración recibida para inspeccionar los headers. */
const adaptadorEco =
  (estado = 200, data: unknown = {}) =>
  (config: InternalAxiosRequestConfig) =>
    responder(config, estado, data);

/** Responde con cada estado en orden y guarda el Authorization de cada intento. */
const adaptadorSecuencia = (...estados: number[]) => {
  const autorizaciones: unknown[] = [];
  const adaptador = (config: InternalAxiosRequestConfig) => {
    autorizaciones.push(config.headers.get('Authorization'));
    const estado = estados[autorizaciones.length - 1] ?? 200;
    return responder(
      config,
      estado,
      estado === 401 ? NO_AUTENTICADO : {ok: true},
    );
  };
  return {adaptador, autorizaciones};
};

const NO_AUTENTICADO = {
  success: false,
  error: {code: 'UNAUTHORIZED', message: 'No autenticado'},
};

/** Sesión en memoria, con los valores por defecto de una sesión activa sin refresh token. */
const crearSesion = (cambios: Partial<ProveedorSesion> = {}) => {
  const estado = {token: 'jwt-123' as string | null};
  const proveedor: ProveedorSesion = {
    obtenerToken: () => estado.token,
    obtenerTokenRenovacion: () => null,
    obtenerTenantId: () => 7,
    alRenovarToken: jest.fn(async (token: string) => {
      estado.token = token;
    }),
    alSesionInvalida: jest.fn(),
    ...cambios,
  };
  configurarSesionApi(proveedor);
  return proveedor;
};

const renovacionResponde = (estado: number, data: unknown = {}) => {
  const adaptador = jest.fn((config: InternalAxiosRequestConfig) =>
    responder(config, estado, data),
  );
  clienteRenovacion.defaults.adapter = adaptador;
  return adaptador;
};

afterEach(() => {
  configurarSesionApi(null);
  clienteRenovacion.defaults.adapter = undefined;
});

describe('cliente API', () => {
  it('agrega X-Request-ID válido en cada petición', async () => {
    const {config} = await cliente.get('/health', {adapter: adaptadorEco()});
    const id = String(config.headers.get('X-Request-ID'));
    expect(id).toMatch(/^[A-Za-z0-9-]{1,64}$/);
  });

  it('agrega token y empresa cuando hay sesión', async () => {
    crearSesion();
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

  it('sin refresh token, un 401 rechaza con ErrorApi y cierra la sesión', async () => {
    const sesion = crearSesion();

    await expect(
      cliente.get('/x', {adapter: adaptadorEco(401, NO_AUTENTICADO)}),
    ).rejects.toBeInstanceOf(ErrorApi);
    expect(sesion.alSesionInvalida).toHaveBeenCalledTimes(1);
  });

  it('un 401 de una petición con un token anterior no cierra la sesión nueva', async () => {
    const sesion = crearSesion({obtenerToken: () => 'token-de-otro-login'});

    await expect(
      cliente.get('/x', {
        // El usuario vuelve a iniciar sesión mientras la petición está en vuelo.
        adapter: config => {
          config.headers.set('Authorization', 'Bearer token-viejo');
          return responder(config, 401, NO_AUTENTICADO);
        },
      }),
    ).rejects.toBeInstanceOf(ErrorApi);
    expect(sesion.alSesionInvalida).not.toHaveBeenCalled();
  });

  it('un 401 de login (sin token) no cierra sesión', async () => {
    const sesion = crearSesion({obtenerToken: () => null});

    await expect(
      cliente.post(
        '/auth/seguridad/login',
        {},
        {
          adapter: adaptadorEco(401, {
            success: false,
            error: {code: 'UNAUTHORIZED', message: 'Credenciales inválidas'},
          }),
        },
      ),
    ).rejects.toThrow('Credenciales inválidas');
    expect(sesion.alSesionInvalida).not.toHaveBeenCalled();
  });

  describe('renovación del token', () => {
    it('ante un 401 renueva el token y reintenta la petición', async () => {
      const sesion = crearSesion({obtenerTokenRenovacion: () => 'refresh-1'});
      const renovacion = renovacionResponde(200, {
        access_token: 'jwt-nuevo',
        token_type: 'bearer',
      });
      const {adaptador, autorizaciones} = adaptadorSecuencia(401, 200);

      const {data} = await cliente.get('/x', {adapter: adaptador});

      expect(data).toEqual({ok: true});
      expect(autorizaciones).toEqual(['Bearer jwt-123', 'Bearer jwt-nuevo']);
      expect(JSON.parse(renovacion.mock.calls[0]![0].data)).toEqual({
        refresh_token: 'refresh-1',
      });
      expect(sesion.alRenovarToken).toHaveBeenCalledWith('jwt-nuevo');
      expect(sesion.alSesionInvalida).not.toHaveBeenCalled();
    });

    it('si el servidor rechaza el refresh token, cierra la sesión', async () => {
      const sesion = crearSesion({obtenerTokenRenovacion: () => 'vencido'});
      renovacionResponde(401, NO_AUTENTICADO);

      await expect(
        cliente.get('/x', {adapter: adaptadorEco(401, NO_AUTENTICADO)}),
      ).rejects.toMatchObject({estado: 401});
      expect(sesion.alSesionInvalida).toHaveBeenCalledTimes(1);
    });

    it('sin red al renovar no cierra la sesión: el conductor sigue offline', async () => {
      const sesion = crearSesion({obtenerTokenRenovacion: () => 'refresh-1'});
      clienteRenovacion.defaults.adapter = config =>
        Promise.reject(
          Object.assign(new Error('Network Error'), {
            isAxiosError: true,
            config,
          }),
        );

      await expect(
        cliente.get('/x', {adapter: adaptadorEco(401, NO_AUTENTICADO)}),
      ).rejects.toMatchObject({codigo: 'SIN_CONEXION'});
      expect(sesion.alSesionInvalida).not.toHaveBeenCalled();
    });

    it('varias peticiones con 401 a la vez hacen una sola renovación', async () => {
      crearSesion({obtenerTokenRenovacion: () => 'refresh-1'});
      const renovacion = renovacionResponde(200, {access_token: 'jwt-nuevo'});
      const a = adaptadorSecuencia(401, 200);
      const b = adaptadorSecuencia(401, 200);

      await Promise.all([
        cliente.get('/a', {adapter: a.adaptador}),
        cliente.get('/b', {adapter: b.adaptador}),
      ]);

      expect(renovacion).toHaveBeenCalledTimes(1);
      expect(a.autorizaciones[1]).toBe('Bearer jwt-nuevo');
      expect(b.autorizaciones[1]).toBe('Bearer jwt-nuevo');
    });

    it('si el reintento con el token nuevo también da 401, cierra la sesión', async () => {
      const sesion = crearSesion({obtenerTokenRenovacion: () => 'refresh-1'});
      const renovacion = renovacionResponde(200, {access_token: 'jwt-nuevo'});
      const {adaptador} = adaptadorSecuencia(401, 401);

      await expect(
        cliente.get('/x', {adapter: adaptador}),
      ).rejects.toMatchObject({estado: 401});
      expect(renovacion).toHaveBeenCalledTimes(1);
      expect(sesion.alSesionInvalida).toHaveBeenCalledTimes(1);
    });
  });
});
