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
import * as apiCuentaReal from '@/features/cuenta/api/cuenta';
import {despachos, escribir, leer} from '@/core/db';
import {useSesion} from '@/core/sesion';
import {encolar} from '@/core/sync';

import {crearJwt, usuarioPrueba} from './helpers';

jest.mock('@/features/auth/api/auth');
jest.mock('@/features/despachos/api/despachos');
jest.mock('@/features/cuenta/api/cuenta');
const apiSimulada = jest.mocked(api);
const apiCuenta = jest.mocked(apiCuentaReal);
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
  await fireEvent.press(await screen.findByLabelText('Cuenta'));
  await screen.findByText('Mi cuenta');
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
  afterEach(async () => {
    // Lo que invalidaron las mutaciones termina antes de desmontar.
    await waitFor(() =>
      expect(
        clienteConsultas.isFetching() + clienteConsultas.isMutating(),
      ).toBe(0),
    );
    clienteConsultas.clear();
  });

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
    expect(screen.getByText('Versión 1.0.0 (1)')).toBeTruthy();
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

  it('Mi cuenta muestra la versión y no ofrece elegir empresa', async () => {
    apiSimulada.iniciarSesionApi.mockResolvedValue({
      access_token: crearJwt(600),
      user: usuarioPrueba,
    });

    await render(<App />);
    await screen.findByLabelText('Correo');
    await llenarLogin();
    await abrirCuenta();

    expect(screen.queryByText(/empresa/i)).toBeNull();
    expect(screen.getByText('Versión 1.0.0 (1)')).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Cerrar sesión'})).toBeTruthy();
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

  describe('eliminar cuenta', () => {
    /** La app abre una base nueva al montar: lo local se guarda antes de abrir Cuenta. */
    const entrarACuenta = async (preparar?: () => Promise<unknown>) => {
      apiSimulada.iniciarSesionApi.mockResolvedValue({
        access_token: crearJwt(600),
        user: usuarioPrueba,
      });
      await render(<App />);
      await screen.findByLabelText('Correo');
      await llenarLogin();
      await screen.findByText('Aún no tienes despachos');
      await esperarConsultas();
      await preparar?.();
      await abrirCuenta();
    };

    /** La tarjeta abre la confirmación; el botón del diálogo es el último. */
    const abrirConfirmacion = async () => {
      await fireEvent.press(
        screen.getByRole('button', {name: 'Eliminar cuenta'}),
      );
      await screen.findByText('¿Eliminar tu cuenta?');
      const botones = screen.getAllByRole('button', {name: 'Eliminar cuenta'});
      return botones[botones.length - 1]!;
    };

    const confirmarConClave = async (clave = 'mi-clave-1') => {
      const boton = await abrirConfirmacion();
      await fireEvent.changeText(
        screen.getByLabelText('Escribe tu clave para confirmar'),
        clave,
      );
      await fireEvent.press(boton);
    };

    beforeEach(() => {
      apiCuenta.eliminarCuentaApi.mockReset();
      jest.mocked(Toast.show).mockClear();
    });

    it('la elimina en Fluor, borra sus datos del teléfono y vuelve al login', async () => {
      apiCuenta.eliminarCuentaApi.mockResolvedValue(undefined);
      await entrarACuenta(() =>
        escribir(tx =>
          tx.insert(despachos).values({
            tenantDespachoId: 5,
            usuarioId: usuarioPrueba.id,
            tenantId: 7,
            codigoDespacho: 905,
            asignadoEn: '2026-11-10T07:00:00',
          }),
        ),
      );

      await confirmarConClave();

      expect(
        await screen.findByText('Tus entregas del día, en orden.'),
      ).toBeTruthy();
      expect(apiCuenta.eliminarCuentaApi).toHaveBeenCalledWith('mi-clave-1');
      expect(await leer(db => db.select().from(despachos))).toEqual([]);
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({text1: 'Tu cuenta fue eliminada.'}),
      );
    });

    it('si Fluor falla, muestra el error y no borra nada', async () => {
      apiCuenta.eliminarCuentaApi.mockRejectedValue(
        new ErrorApi({codigo: 'SIN_CONEXION', mensaje: 'Sin conexión'}),
      );
      await entrarACuenta();

      await confirmarConClave();

      await waitFor(() =>
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            text1: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
          }),
        ),
      );
      expect(useSesion.getState().estado).toBe('activa');
    });

    it('sin clave no se puede confirmar', async () => {
      await entrarACuenta();

      const boton = await abrirConfirmacion();

      expect(boton.props.accessibilityState.disabled).toBe(true);
    });

    it('con la clave incorrecta lo dice en el campo y no cierra la sesión', async () => {
      apiCuenta.eliminarCuentaApi.mockRejectedValue(
        new ErrorApi({
          codigo: 'NO_AUTENTICADO',
          mensaje: 'Clave incorrecta',
          estado: 401,
        }),
      );
      await entrarACuenta();

      await confirmarConClave('otra');

      expect(await screen.findByText('Clave incorrecta')).toBeTruthy();
      expect(Toast.show).not.toHaveBeenCalled();
      expect(useSesion.getState().estado).toBe('activa');
    });

    it('si es el único control de una empresa, muestra cuáles', async () => {
      apiCuenta.eliminarCuentaApi.mockRejectedValue(
        new ErrorApi({
          codigo: 'CONFLICTO',
          mensaje:
            'Eres el único control de estas empresas; asigna otro control antes de eliminar tu cuenta',
          estado: 409,
          extras: {empresas: ['Transportes Sur']},
        }),
      );
      await entrarACuenta();

      await confirmarConClave();

      await waitFor(() =>
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            text1:
              'Eres el único control de estas empresas; asigna otro control antes de eliminar tu cuenta: Transportes Sur.',
          }),
        ),
      );
    });

    it('con envíos pendientes no deja eliminarla', async () => {
      // Novedad no tiene enviador: se queda pendiente sin que el motor la toque.
      await entrarACuenta(() =>
        escribir(tx =>
          encolar(tx, {
            usuarioId: usuarioPrueba.id,
            tipo: 'novedad',
            claveEntidad: 'guia:5:1',
            cuerpo: {},
          }),
        ),
      );

      const boton = await abrirConfirmacion();

      expect(screen.getByText('Tienes 1 envío pendiente')).toBeTruthy();
      expect(boton.props.accessibilityState.disabled).toBe(true);
    });
  });
});
