import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import Toast from 'react-native-toast-message';

import {App} from '@/app/App';
import {clienteConsultas} from '@/core/api/clienteConsultas';
import {ErrorApi} from '@/core/api/errores';
import * as api from '@/features/auth/api/auth';
import * as apiDespachos from '@/features/despachos/api/despachos';
import {useSesion} from '@/core/sesion';

import {crearJwt, empresaPrueba, usuarioPrueba} from './helpers';

jest.mock('@/features/auth/api/auth');
jest.mock('@/features/despachos/api/despachos');
const apiSimulada = jest.mocked(api);
// Mis despachos pide la lista al entrar; aquí el usuario aún no tiene despachos.
jest.mocked(apiDespachos).listarAsignacionesApi.mockResolvedValue([]);

/** Las pantallas con sesión leen la base al montar: que terminen dentro de act. */
const esperarConsultas = () =>
  waitFor(() =>
    expect(clienteConsultas.isFetching() + clienteConsultas.isMutating()).toBe(
      0,
    ),
  );

const abrirCuenta = async () => {
  await fireEvent.press(await screen.findByRole('button', {name: 'Mi cuenta'}));
  await screen.findByText('Empresa para ingreso y envíos');
  await esperarConsultas();
};

const llenarLogin = async () => {
  await fireEvent.changeText(
    screen.getByLabelText('Correo'),
    'conductor@prueba.test',
  );
  await fireEvent.changeText(screen.getByLabelText('Clave'), 'secreta123');
  await fireEvent.press(screen.getByRole('button', {name: 'Iniciar sesión'}));
};

describe('App', () => {
  // Los temporizadores de recolección de react-query mantienen vivo el proceso de Jest.
  afterEach(() => clienteConsultas.clear());

  beforeEach(async () => {
    apiSimulada.iniciarSesionApi.mockReset();
    apiSimulada.listarEmpresasApi.mockReset();
    await useSesion.getState().cerrarSesion();
    useSesion.setState({estado: 'iniciando', avisoSesion: null});
  });

  it('sin sesión guardada muestra el login', async () => {
    await render(<App />);
    expect(
      await screen.findByText('Tus entregas del día, en orden.'),
    ).toBeTruthy();
  });

  it('valida el formulario antes de llamar a la API', async () => {
    await render(<App />);
    await screen.findByLabelText('Correo');
    await fireEvent.press(screen.getByRole('button', {name: 'Iniciar sesión'}));

    expect(await screen.findByText('Ingresa tu correo')).toBeTruthy();
    expect(apiSimulada.iniciarSesionApi).not.toHaveBeenCalled();
  });

  it('después del login entra directo, sin pedir empresa', async () => {
    apiSimulada.iniciarSesionApi.mockResolvedValue({
      access_token: crearJwt(600),
      user: usuarioPrueba,
    });

    await render(<App />);
    await screen.findByLabelText('Correo');
    await llenarLogin();

    expect(await screen.findByText('Aún no tienes despachos')).toBeTruthy();
    await esperarConsultas();
    expect(apiSimulada.listarEmpresasApi).not.toHaveBeenCalled();
    expect(apiSimulada.iniciarSesionApi).toHaveBeenCalledWith(
      'conductor@prueba.test',
      'secreta123',
    );
  });

  it('con una sola empresa la elige sola y vuelve al inicio', async () => {
    apiSimulada.iniciarSesionApi.mockResolvedValue({
      access_token: crearJwt(600),
      user: usuarioPrueba,
    });
    apiSimulada.listarEmpresasApi.mockResolvedValue([
      empresaPrueba(7, 'Transportes Sur'),
    ]);

    await render(<App />);
    await screen.findByLabelText('Correo');
    await llenarLogin();
    await abrirCuenta();
    await fireEvent.press(
      await screen.findByRole('button', {name: 'Elegir empresa'}),
    );

    expect(await screen.findByText('Transportes Sur')).toBeTruthy();
    expect(useSesion.getState().empresa?.tenant_id).toBe(7);
    // Con una sola empresa no hay a cuál cambiar.
    expect(
      screen.queryByRole('button', {name: 'Cambiar de empresa'}),
    ).toBeNull();
  });

  it('con varias empresas deja elegir una y cambiarla', async () => {
    apiSimulada.iniciarSesionApi.mockResolvedValue({
      access_token: crearJwt(600),
      user: usuarioPrueba,
    });
    apiSimulada.listarEmpresasApi.mockResolvedValue([
      empresaPrueba(7, 'Transportes Sur'),
      empresaPrueba(8, 'Logística Norte'),
    ]);

    await render(<App />);
    await screen.findByLabelText('Correo');
    await llenarLogin();
    await abrirCuenta();
    await fireEvent.press(
      await screen.findByRole('button', {name: 'Elegir empresa'}),
    );

    expect(
      await screen.findByText('¿Con qué empresa trabajas hoy?'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText('Logística Norte'));

    expect(await screen.findByText('Logística Norte')).toBeTruthy();
    expect(useSesion.getState().empresa?.tenant_id).toBe(8);

    await fireEvent.press(
      screen.getByRole('button', {name: 'Cambiar de empresa'}),
    );
    expect(
      await screen.findByText('¿Con qué empresa trabajas hoy?'),
    ).toBeTruthy();
  });

  it('muestra el error del servidor si las credenciales son inválidas', async () => {
    apiSimulada.iniciarSesionApi.mockRejectedValue(
      new ErrorApi({
        codigo: 'NO_AUTENTICADO',
        mensaje: 'Credenciales inválidas',
        estado: 401,
      }),
    );

    await render(<App />);
    await screen.findByLabelText('Correo');
    await llenarLogin();

    await waitFor(() =>
      expect(apiSimulada.iniciarSesionApi).toHaveBeenCalled(),
    );
    expect(useSesion.getState().estado).toBe('sinSesion');
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({type: 'error', text1: 'Credenciales inválidas'}),
    );
  });

  it('cerrar sesión vuelve al login', async () => {
    apiSimulada.iniciarSesionApi.mockResolvedValue({
      access_token: crearJwt(600),
      user: usuarioPrueba,
    });

    await render(<App />);
    await screen.findByLabelText('Correo');
    await llenarLogin();
    await abrirCuenta();

    await fireEvent.press(screen.getByRole('button', {name: 'Cerrar sesión'}));
    expect(
      await screen.findByText('Tus entregas del día, en orden.'),
    ).toBeTruthy();
  });
});
