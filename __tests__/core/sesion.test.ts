import {leerToken} from '@/core/storage/llavero';
import {useSesion} from '@/core/sesion';

import {crearJwt, empresaPrueba, usuarioPrueba} from '../helpers';

const reiniciar = async () => {
  await useSesion.getState().cerrarSesion();
  useSesion.setState({estado: 'iniciando', avisoSesion: null});
};

describe('tienda de sesión', () => {
  beforeEach(reiniciar);

  it('sin token guardado queda sin sesión', async () => {
    await useSesion.getState().restaurar();
    expect(useSesion.getState().estado).toBe('sinSesion');
  });

  it('iniciar sesión guarda el token en el llavero y pide elegir empresa', async () => {
    const token = crearJwt(600);
    await useSesion.getState().iniciarSesion(token, usuarioPrueba);

    expect(useSesion.getState().estado).toBe('sinEmpresa');
    expect(await leerToken()).toBe(token);
  });

  it('con empresa elegida, un reinicio restaura la sesión activa', async () => {
    await useSesion.getState().iniciarSesion(crearJwt(600), usuarioPrueba);
    useSesion.getState().elegirEmpresa(empresaPrueba(7, 'Transportes Sur'));

    useSesion.setState({
      estado: 'iniciando',
      token: null,
      usuario: null,
      empresa: null,
    });
    await useSesion.getState().restaurar();

    const {estado, empresa, usuario} = useSesion.getState();
    expect(estado).toBe('activa');
    expect(empresa?.tenant_id).toBe(7);
    expect(usuario?.email).toBe(usuarioPrueba.email);
  });

  it('un token vencido al arrancar obliga a iniciar sesión y se borra', async () => {
    await useSesion.getState().iniciarSesion(crearJwt(-60), usuarioPrueba);
    useSesion.getState().elegirEmpresa(empresaPrueba(7, 'Transportes Sur'));

    useSesion.setState({
      estado: 'iniciando',
      token: null,
      usuario: null,
      empresa: null,
    });
    await useSesion.getState().restaurar();

    expect(useSesion.getState().estado).toBe('sinSesion');
    expect(await leerToken()).toBeNull();
  });

  it('cambiar de empresa conserva la sesión pero pide elegir de nuevo', async () => {
    await useSesion.getState().iniciarSesion(crearJwt(600), usuarioPrueba);
    useSesion.getState().elegirEmpresa(empresaPrueba(7, 'Transportes Sur'));
    useSesion.getState().cambiarEmpresa();

    expect(useSesion.getState().estado).toBe('sinEmpresa');
    expect(useSesion.getState().token).not.toBeNull();
  });

  it('cerrar sesión borra token y datos, y puede dejar un aviso', async () => {
    await useSesion.getState().iniciarSesion(crearJwt(600), usuarioPrueba);
    await useSesion.getState().cerrarSesion('Tu sesión expiró.');

    const {estado, token, usuario, avisoSesion} = useSesion.getState();
    expect(estado).toBe('sinSesion');
    expect(token).toBeNull();
    expect(usuario).toBeNull();
    expect(avisoSesion).toBe('Tu sesión expiró.');
    expect(await leerToken()).toBeNull();
  });
});
