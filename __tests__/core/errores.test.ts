import {AxiosError, type AxiosResponse} from 'axios';

import {ErrorApi, mensajeUsuario, traducirError} from '@/core/api/errores';

const respuesta = (
  estado: number,
  data: unknown,
  headers: Record<string, string> = {},
) =>
  new AxiosError('fallo', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: estado,
    data,
    headers,
  } as unknown as AxiosResponse);

describe('traducirError', () => {
  it('lee el formato de error de Fluor', () => {
    const error = traducirError(
      respuesta(401, {
        success: false,
        error: {code: 'UNAUTHORIZED', message: 'Credenciales inválidas'},
        request_id: 'abc-123',
      }),
    );
    expect(error.codigo).toBe('NO_AUTENTICADO');
    expect(error.estado).toBe(401);
    expect(error.requestId).toBe('abc-123');
    expect(error.message).toBe('Credenciales inválidas');
  });

  it('conserva los campos extra, como is_verified', () => {
    const error = traducirError(
      respuesta(403, {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Cuenta no verificada',
          is_verified: false,
        },
      }),
    );
    expect(error.codigo).toBe('SIN_PERMISO');
    expect(error.extras).toEqual({is_verified: false});
  });

  it('extrae los errores de validación 422', () => {
    const error = traducirError(
      respuesta(422, {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos inválidos',
          errores: [{campo: 'unidades', mensaje: 'Debe ser mayor que 0'}],
        },
      }),
    );
    expect(error.codigo).toBe('VALIDACION');
    expect(error.detalles).toEqual([
      {campo: 'unidades', mensaje: 'Debe ser mayor que 0'},
    ]);
    expect(mensajeUsuario(error)).toBe('Debe ser mayor que 0');
  });

  it('lee Retry-After en un 429', () => {
    const error = traducirError(
      respuesta(
        429,
        {success: false, error: {code: 'RATE_LIMIT_EXCEEDED', message: 'x'}},
        {'retry-after': '30'},
      ),
    );
    expect(error.codigo).toBe('LIMITE_EXCEDIDO');
    expect(error.reintentarEn).toBe(30);
  });

  it('clasifica por estado cuando el cuerpo no es de Fluor', () => {
    expect(
      traducirError(respuesta(502, '<html>Bad gateway</html>')).codigo,
    ).toBe('SERVIDOR');
    expect(traducirError(respuesta(404, null)).codigo).toBe('NO_ENCONTRADO');
  });

  it('distingue sin conexión de tiempo agotado', () => {
    expect(
      traducirError(new AxiosError('Network Error', 'ERR_NETWORK')).codigo,
    ).toBe('SIN_CONEXION');
    expect(
      traducirError(new AxiosError('timeout', 'ECONNABORTED')).codigo,
    ).toBe('TIEMPO_AGOTADO');
  });

  it('no vuelve a envolver un ErrorApi', () => {
    const original = new ErrorApi({codigo: 'CONFLICTO', mensaje: 'ya existe'});
    expect(traducirError(original)).toBe(original);
  });

  it('maneja valores que no son errores de axios', () => {
    expect(traducirError('texto').codigo).toBe('DESCONOCIDO');
    expect(traducirError(new Error('boom')).message).toBe('boom');
  });
});

describe('mensajeUsuario', () => {
  it('usa mensajes fijos para fallos técnicos', () => {
    expect(
      mensajeUsuario(new AxiosError('Network Error', 'ERR_NETWORK')),
    ).toMatch(/Sin conexión/);
    expect(
      mensajeUsuario(new ErrorApi({codigo: 'SERVIDOR', mensaje: 'stacktrace'})),
    ).not.toMatch(/stacktrace/);
  });

  it('muestra el mensaje de negocio de Fluor tal cual', () => {
    expect(
      mensajeUsuario(
        new ErrorApi({codigo: 'CONFLICTO', mensaje: 'La guía ya fue recogida'}),
      ),
    ).toBe('La guía ya fue recogida');
  });
});
