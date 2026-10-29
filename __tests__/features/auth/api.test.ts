import {cliente} from '@/core/api/cliente';
import {
  iniciarSesionApi,
  recuperarClaveApi,
  registrarApi,
  reenviarVerificacionApi,
} from '@/features/auth/api/auth';

import {crearJwt, usuarioPrueba} from '../../helpers';

describe('llamadas sin sesión a Fluor', () => {
  const post = jest.spyOn(cliente, 'post');

  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({
      data: {access_token: crearJwt(600), user: usuarioPrueba},
    });
  });

  // Fluor solo pide Turnstile al cliente "web": la app se identifica como "api".
  it('el login va como api y sin token de Turnstile', async () => {
    await iniciarSesionApi('ana@prueba.test', 'clave-segura-1');

    expect(post).toHaveBeenCalledWith('/auth/seguridad/login', {
      email: 'ana@prueba.test',
      password: 'clave-segura-1',
      client_type: 'api',
    });
  });

  it('el registro va como api y mapea los campos al contrato de Fluor', async () => {
    await registrarApi({
      nombres: 'Ana',
      apellidos: 'Pérez',
      numeroIdentificacion: '1020304050',
      email: 'ana@prueba.test',
      clave: 'clave-segura-1',
    });

    expect(post).toHaveBeenCalledWith('/auth/user/registrar', {
      email: 'ana@prueba.test',
      password: 'clave-segura-1',
      nombres: 'Ana',
      apellidos: 'Pérez',
      numero_identificacion: '1020304050',
      client_type: 'api',
    });
  });

  it('recuperar clave y reenviar verificación van como api', async () => {
    await recuperarClaveApi('ana@prueba.test');
    await reenviarVerificacionApi('ana@prueba.test');

    expect(post).toHaveBeenNthCalledWith(1, '/auth/user/recuperar-clave', {
      email: 'ana@prueba.test',
      client_type: 'api',
    });
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/auth/user/reenviar-verificacion',
      {
        email: 'ana@prueba.test',
        client_type: 'api',
      },
    );
  });

  it('ninguna lleva turnstile_token', async () => {
    await recuperarClaveApi('ana@prueba.test');
    const cuerpo = post.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(cuerpo).not.toHaveProperty('turnstile_token');
  });
});
