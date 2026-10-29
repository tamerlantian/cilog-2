import {fireEvent, render, screen} from '@testing-library/react-native';
import Toast from 'react-native-toast-message';

import {App} from '@/app/App';
import {clienteConsultas} from '@/core/api/clienteConsultas';
import {ErrorApi} from '@/core/api/errores';
import {useSesion} from '@/core/sesion';
import * as api from '@/features/auth/api/auth';

jest.mock('@/features/auth/api/auth');
const apiSimulada = jest.mocked(api);

const escribir = async (etiqueta: string, texto: string) =>
  fireEvent.changeText(screen.getByLabelText(etiqueta), texto);

const abrirLogin = async () => {
  await render(<App />);
  await screen.findByLabelText('Correo');
};

const llenarRegistro = async (confirmacion = 'clave-segura-1') => {
  await escribir('Nombres', 'Ana');
  await escribir('Apellidos', 'Pérez');
  await escribir('Número de identificación', '1020304050');
  await escribir('Correo', 'ana@prueba.test');
  await escribir('Clave', 'clave-segura-1');
  await escribir('Confirmar clave', confirmacion);
};

describe('cuenta sin sesión', () => {
  beforeEach(async () => {
    apiSimulada.iniciarSesionApi.mockReset();
    apiSimulada.registrarApi.mockReset();
    apiSimulada.recuperarClaveApi.mockReset();
    apiSimulada.reenviarVerificacionApi.mockReset();
    jest.mocked(Toast.show).mockClear();
    await useSesion.getState().cerrarSesion();
    useSesion.setState({estado: 'iniciando', avisoSesion: null});
  });
  afterEach(() => clienteConsultas.clear());

  describe('registro', () => {
    it('valida que las claves coincidan antes de llamar a la API', async () => {
      await abrirLogin();
      await fireEvent.press(screen.getByRole('button', {name: 'Crear cuenta'}));
      await screen.findByText('Te enviaremos un correo para activarla.');

      await llenarRegistro('otra-clave');
      await fireEvent.press(screen.getByRole('button', {name: 'Crear cuenta'}));

      expect(await screen.findByText('Las claves no coinciden')).toBeTruthy();
      expect(apiSimulada.registrarApi).not.toHaveBeenCalled();
    });

    it('muestra el requisito de la clave cumplido mientras se escribe', async () => {
      await abrirLogin();
      await fireEvent.press(screen.getByRole('button', {name: 'Crear cuenta'}));
      await screen.findByText('Te enviaremos un correo para activarla.');

      expect(
        screen.getByLabelText('Al menos 8 caracteres: pendiente'),
      ).toBeTruthy();
      await escribir('Clave', 'clave-segura-1');
      expect(
        screen.getByLabelText('Al menos 8 caracteres: cumplido'),
      ).toBeTruthy();
    });

    it('exige al menos 8 caracteres en la clave', async () => {
      await abrirLogin();
      await fireEvent.press(screen.getByRole('button', {name: 'Crear cuenta'}));
      await screen.findByText('Te enviaremos un correo para activarla.');

      await llenarRegistro();
      await escribir('Clave', 'corta');
      await fireEvent.press(screen.getByRole('button', {name: 'Crear cuenta'}));

      expect(
        await screen.findByText('La clave debe tener al menos 8 caracteres'),
      ).toBeTruthy();
    });

    it('registra con los datos del formulario y pide revisar el correo', async () => {
      apiSimulada.registrarApi.mockResolvedValue(undefined);
      await abrirLogin();
      await fireEvent.press(screen.getByRole('button', {name: 'Crear cuenta'}));
      await screen.findByText('Te enviaremos un correo para activarla.');

      await llenarRegistro();
      await fireEvent.press(screen.getByRole('button', {name: 'Crear cuenta'}));

      expect(await screen.findByText('Revisa tu correo')).toBeTruthy();
      expect(screen.getByText(/ana@prueba\.test/)).toBeTruthy();
      expect(apiSimulada.registrarApi).toHaveBeenCalledWith({
        nombres: 'Ana',
        apellidos: 'Pérez',
        numeroIdentificacion: '1020304050',
        email: 'ana@prueba.test',
        clave: 'clave-segura-1',
      });
    });

    it('muestra el error del servidor si el usuario ya existe', async () => {
      apiSimulada.registrarApi.mockRejectedValue(
        new ErrorApi({
          codigo: 'PETICION_INVALIDA',
          mensaje: 'El usuario ya está registrado',
          estado: 400,
        }),
      );
      await abrirLogin();
      await fireEvent.press(screen.getByRole('button', {name: 'Crear cuenta'}));
      await screen.findByText('Te enviaremos un correo para activarla.');

      await llenarRegistro();
      await fireEvent.press(screen.getByRole('button', {name: 'Crear cuenta'}));

      await screen.findByLabelText('Nombres');
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({text1: 'El usuario ya está registrado'}),
      );
      expect(screen.queryByText('Revisa tu correo')).toBeNull();
    });
  });

  describe('recuperar clave', () => {
    it('llega con el correo escrito en el login y envía el enlace', async () => {
      apiSimulada.recuperarClaveApi.mockResolvedValue(undefined);
      await abrirLogin();
      await escribir('Correo', 'ana@prueba.test');
      await fireEvent.press(
        screen.getByRole('button', {name: 'Olvidé mi clave'}),
      );

      await screen.findByText(
        'Escribe tu correo y te enviaremos un enlace para crear una clave nueva.',
      );
      expect(screen.getByLabelText('Correo').props.value).toBe(
        'ana@prueba.test',
      );

      await fireEvent.press(
        screen.getByRole('button', {name: 'Enviar enlace'}),
      );

      expect(await screen.findByText('Revisa tu correo')).toBeTruthy();
      expect(apiSimulada.recuperarClaveApi).toHaveBeenCalledWith(
        'ana@prueba.test',
      );
      // Fluor admite un reenvío por minuto: el botón espera antes de habilitarse.
      expect(
        screen.getByRole('button', {name: 'Reenviar en 1:00'}),
      ).toBeDisabled();
    });

    it('rechaza un correo inválido sin llamar a la API', async () => {
      await abrirLogin();
      await fireEvent.press(
        screen.getByRole('button', {name: 'Olvidé mi clave'}),
      );
      await screen.findByText('¿Olvidaste tu clave?');

      await escribir('Correo', 'no-es-correo');
      await fireEvent.press(
        screen.getByRole('button', {name: 'Enviar enlace'}),
      );

      expect(await screen.findByText('Correo no válido')).toBeTruthy();
      expect(apiSimulada.recuperarClaveApi).not.toHaveBeenCalled();
    });
  });

  describe('cuenta sin verificar', () => {
    it('el login ofrece reenviar la verificación, sin toast de error', async () => {
      apiSimulada.iniciarSesionApi.mockRejectedValue(
        new ErrorApi({
          codigo: 'SIN_PERMISO',
          mensaje: 'Cuenta no verificada',
          estado: 403,
          extras: {is_verified: false},
        }),
      );
      apiSimulada.reenviarVerificacionApi.mockResolvedValue(undefined);
      await abrirLogin();
      await escribir('Correo', 'ana@prueba.test');
      await escribir('Clave', 'clave-segura-1');
      await fireEvent.press(
        screen.getByRole('button', {name: 'Iniciar sesión'}),
      );

      expect(await screen.findByText('Falta verificar tu correo')).toBeTruthy();
      expect(Toast.show).not.toHaveBeenCalled();

      await fireEvent.press(
        screen.getByRole('button', {name: 'Reenviar correo de verificación'}),
      );
      await screen.findByText('Verifica tu cuenta');
      expect(screen.getByLabelText('Correo').props.value).toBe(
        'ana@prueba.test',
      );

      await fireEvent.press(
        screen.getByRole('button', {name: 'Reenviar correo'}),
      );
      expect(await screen.findByText('Revisa tu correo')).toBeTruthy();
      expect(apiSimulada.reenviarVerificacionApi).toHaveBeenCalledWith(
        'ana@prueba.test',
      );
    });

    it('otros errores de login sí muestran el toast', async () => {
      apiSimulada.iniciarSesionApi.mockRejectedValue(
        new ErrorApi({
          codigo: 'NO_AUTENTICADO',
          mensaje: 'Credenciales inválidas',
          estado: 401,
        }),
      );
      await abrirLogin();
      await escribir('Correo', 'ana@prueba.test');
      await escribir('Clave', 'mala');
      await fireEvent.press(
        screen.getByRole('button', {name: 'Iniciar sesión'}),
      );

      await screen.findByLabelText('Correo');
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({text1: 'Credenciales inválidas'}),
      );
      expect(screen.queryByText('Falta verificar tu correo')).toBeNull();
    });
  });
});
