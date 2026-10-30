import {almacen, leerCredenciales} from '@/core/storage';
import {useSesion} from '@/core/sesion';

import {crearJwt, empresaPrueba, usuarioPrueba} from '../helpers';

/** Credenciales con un access token que vence en `segundos` y, opcional, un refresh token. */
const credenciales = (segundos: number, renovacionSegundos?: number) => ({
  token: crearJwt(segundos),
  tokenRenovacion:
    renovacionSegundos === undefined ? null : crearJwt(renovacionSegundos),
});

const tokenGuardado = async () => (await leerCredenciales())?.token ?? null;

/** Simula cerrar y abrir la app: borra la memoria y restaura desde el llavero y MMKV. */
const reabrirApp = async () => {
  useSesion.setState({
    estado: 'iniciando',
    token: null,
    tokenRenovacion: null,
    usuario: null,
    empresa: null,
  });
  await useSesion.getState().restaurar();
};

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

  it('iniciar sesión guarda el token y entra sin pedir empresa', async () => {
    const nuevas = credenciales(600);
    await useSesion.getState().iniciarSesion(nuevas, usuarioPrueba);

    expect(useSesion.getState().estado).toBe('activa');
    expect(useSesion.getState().empresa).toBeNull();
    expect(await tokenGuardado()).toBe(nuevas.token);
  });

  it('sin empresa elegida, un reinicio restaura la sesión activa', async () => {
    await useSesion.getState().iniciarSesion(credenciales(600), usuarioPrueba);

    await reabrirApp();

    expect(useSesion.getState().estado).toBe('activa');
    expect(useSesion.getState().empresa).toBeNull();
  });

  it('con empresa elegida, un reinicio restaura la sesión activa', async () => {
    await useSesion.getState().iniciarSesion(credenciales(600), usuarioPrueba);
    useSesion
      .getState()
      .elegirEmpresa(empresaPrueba(7, 'Transportes Sur'), true);

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
    await useSesion.getState().iniciarSesion(credenciales(-60), usuarioPrueba);
    useSesion
      .getState()
      .elegirEmpresa(empresaPrueba(7, 'Transportes Sur'), true);

    useSesion.setState({
      estado: 'iniciando',
      token: null,
      usuario: null,
      empresa: null,
    });
    await useSesion.getState().restaurar();

    expect(useSesion.getState().estado).toBe('sinSesion');
    expect(await tokenGuardado()).toBeNull();
  });

  it('con el access token vencido pero el refresh vigente, la sesión sigue', async () => {
    await useSesion
      .getState()
      .iniciarSesion(credenciales(-60, 3600), usuarioPrueba);
    useSesion
      .getState()
      .elegirEmpresa(empresaPrueba(7, 'Transportes Sur'), true);

    await reabrirApp();

    expect(useSesion.getState().estado).toBe('activa');
    expect(useSesion.getState().tokenRenovacion).not.toBeNull();
  });

  it('con ambos tokens vencidos pide iniciar sesión', async () => {
    await useSesion
      .getState()
      .iniciarSesion(credenciales(-60, -60), usuarioPrueba);

    await reabrirApp();

    expect(useSesion.getState().estado).toBe('sinSesion');
    expect(await leerCredenciales()).toBeNull();
  });

  it('renovar el token lo guarda en el llavero y conserva el refresh', async () => {
    const iniciales = credenciales(600, 3600);
    await useSesion.getState().iniciarSesion(iniciales, usuarioPrueba);

    await useSesion.getState().renovarToken('jwt-renovado');

    expect(useSesion.getState().token).toBe('jwt-renovado');
    expect(await leerCredenciales()).toEqual({
      token: 'jwt-renovado',
      tokenRenovacion: iniciales.tokenRenovacion,
    });
  });

  it('cambiar de empresa conserva la sesión', async () => {
    await useSesion.getState().iniciarSesion(credenciales(600), usuarioPrueba);
    useSesion
      .getState()
      .elegirEmpresa(empresaPrueba(7, 'Transportes Sur'), true);
    useSesion
      .getState()
      .elegirEmpresa(empresaPrueba(8, 'Logística Norte'), true);

    await reabrirApp();

    expect(useSesion.getState().estado).toBe('activa');
    expect(useSesion.getState().empresa?.tenant_id).toBe(8);
  });

  it('un perfil guardado con otra forma se descarta y pide login', async () => {
    await useSesion.getState().iniciarSesion(credenciales(600), usuarioPrueba);
    // Perfil de una versión anterior: sin `tieneVariasEmpresas`.
    almacen.set(
      'sesion.perfil',
      JSON.stringify({usuario: usuarioPrueba, empresa: null}),
    );

    useSesion.setState({estado: 'iniciando', token: null, usuario: null});
    await useSesion.getState().restaurar();

    expect(useSesion.getState().estado).toBe('sinSesion');
    expect(await tokenGuardado()).toBeNull();
  });

  it('cerrar sesión borra token y datos, y puede dejar un aviso', async () => {
    await useSesion.getState().iniciarSesion(credenciales(600), usuarioPrueba);
    await useSesion.getState().cerrarSesion('Tu sesión expiró.');

    const {estado, token, usuario, avisoSesion} = useSesion.getState();
    expect(estado).toBe('sinSesion');
    expect(token).toBeNull();
    expect(usuario).toBeNull();
    expect(avisoSesion).toBe('Tu sesión expiró.');
    expect(await tokenGuardado()).toBeNull();
  });
});
