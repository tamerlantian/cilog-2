import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {eq} from 'drizzle-orm';
import {Alert} from 'react-native';
import Toast from 'react-native-toast-message';

import {App} from '@/app/App';
import {clienteConsultas} from '@/core/api/clienteConsultas';
import {ErrorApi} from '@/core/api';
import {escribir, guias, leer, operaciones} from '@/core/db';
import {useSesion} from '@/core/sesion';
import {encolar, obtenerMotor} from '@/core/sync';
import * as apiAuth from '@/features/auth/api/auth';
import * as api from '@/features/despachos/api/despachos';
import type {GuiaFluor} from '@/features/despachos/api/despachos';
import {claveGuia} from '@/features/despachos/domain/claves';

import {crearJwt, usuarioPrueba} from '../../helpers';

jest.mock('@/features/auth/api/auth');
jest.mock('@/features/despachos/api/despachos');
const apiSimulada = jest.mocked(api);

const DESPACHO = 10;

const asignacion = {
  id: DESPACHO,
  fecha: '2026-10-30T07:00:00',
  tenant_id: 7,
  tenant_nombre: 'Transportes Sur',
  codigo_despacho: 910,
};

const guia = (codigo: number, cambios: Partial<GuiaFluor> = {}): GuiaFluor => ({
  codigo_despacho_detalle: codigo * 10,
  codigo_guia: codigo,
  documento_cliente: `FAC-${codigo}`,
  nombre_remitente: 'Ferretería El Tornillo',
  nombre_destinatario: `Destinatario ${codigo}`,
  direccion_destinatario: `Calle ${codigo}`,
  telefono_destinatario: '300 123 4567',
  ciudad_destino: 'Bogotá',
  unidades: 2,
  peso_real: 12.5,
  vr_recaudo: 0,
  vr_cobro_entrega: 0,
  orden_ruta: codigo,
  latitud: null,
  longitud: null,
  requiere_cita: false,
  comentario: null,
  estado_entregado: false,
  estado_novedad: false,
  fecha_entrega: null,
  ...cambios,
});

const descarga = (lista: GuiaFluor[]) => ({
  tenant_despacho_id: DESPACHO,
  tenant_id: 7,
  tenant_nombre: 'Transportes Sur',
  codigo_despacho: 910,
  numero: 12345,
  fecha_salida: '2026-10-30T07:30:00',
  total: lista.length,
  guias: lista,
});

const GUIAS = [
  guia(1, {estado_entregado: true}),
  guia(2, {
    nombre_destinatario: 'María Peña',
    ciudad_destino: 'Medellín',
    vr_recaudo: 18000,
  }),
  guia(3),
];

const iniciarSesion = async () => {
  jest.mocked(apiAuth).iniciarSesionApi.mockResolvedValue({
    access_token: crearJwt(600),
    user: usuarioPrueba,
  });
  await render(<App />);
  await fireEvent.changeText(
    await screen.findByLabelText('Correo'),
    usuarioPrueba.email,
  );
  await fireEvent.changeText(screen.getByLabelText('Clave'), 'secreta123');
  await fireEvent.press(screen.getByRole('button', {name: 'Iniciar sesión'}));
  // Mis despachos lee la base y la cola al montar: que termine dentro de act.
  await screen.findByRole('button', {name: 'Mi cuenta'});
  await waitFor(() =>
    expect(clienteConsultas.isFetching() + clienteConsultas.isMutating()).toBe(
      0,
    ),
  );
};

/** Con un despacho asignado y sus guías ya descargadas. */
const conDespacho = async () => {
  apiSimulada.listarAsignacionesApi.mockResolvedValue([asignacion]);
  apiSimulada.descargarGuiasApi.mockResolvedValue(descarga(GUIAS));
  await iniciarSesion();
  return screen.findByText('Despacho 12345');
};

const abrirDespacho = async () => {
  await fireEvent.press(await conDespacho());
  await screen.findByLabelText('Buscar guía, destinatario o dirección');
};

/** Lo que haría el paso 3 al entregar: marca la guía y encola en la misma transacción. */
const entregarLocal = (codigo: number) =>
  escribir(async tx => {
    await tx
      .update(guias)
      .set({gestionLocal: 'entregada'})
      .where(eq(guias.codigoGuia, codigo));
    return encolar(tx, {
      usuarioId: usuarioPrueba.id,
      tipo: 'entrega',
      claveEntidad: claveGuia(DESPACHO, codigo),
      tenantDespachoId: DESPACHO,
      cuerpo: {codigo_guia: codigo},
    });
  });

/** La cola avisa a las pantallas, como cuando el motor envía algo. */
const avisarCambio = () => obtenerMotor()?.avisar();

const nombresVisibles = () =>
  screen
    .queryAllByText(/^Destinatario \d|^María Peña$/)
    .map(t => t.props.children);

describe('pantallas de despachos', () => {
  const alerta = jest.spyOn(Alert, 'alert');

  beforeEach(async () => {
    // Solo las APIs: los mocks de jest.setup (llavero, toast) guardan su implementación.
    for (const simulado of [apiSimulada, jest.mocked(apiAuth)]) {
      Object.values(simulado).forEach(f => {
        if (jest.isMockFunction(f)) f.mockReset();
      });
    }
    alerta.mockReset();
    jest.mocked(Toast.show).mockClear();
    await useSesion.getState().cerrarSesion();
    useSesion.setState({estado: 'iniciando', avisoSesion: null});
  });
  afterEach(() => clienteConsultas.clear());

  it('sin despachos invita a vincular uno', async () => {
    apiSimulada.listarAsignacionesApi.mockResolvedValue([]);
    await iniciarSesion();

    expect(await screen.findByText('Aún no tienes despachos')).toBeTruthy();
    expect(
      screen.getByRole('button', {name: 'Vincular despacho'}),
    ).toBeTruthy();
  });

  it('al entrar trae los despachos de Fluor con su avance', async () => {
    await conDespacho();

    expect(screen.getByText('1 de 3')).toBeTruthy();
    expect(apiSimulada.descargarGuiasApi).toHaveBeenCalledWith(DESPACHO);
  });

  it('sin señal muestra el aviso y deja ver lo guardado', async () => {
    apiSimulada.listarAsignacionesApi.mockRejectedValue(
      new ErrorApi({codigo: 'SIN_CONEXION', mensaje: 'sin red'}),
    );
    await iniciarSesion();

    expect(await screen.findByText('No pudimos actualizar')).toBeTruthy();
    expect(screen.getByText('Aún no tienes despachos')).toBeTruthy();
  });

  it('el despacho abre en pendientes y filtra por estado', async () => {
    await abrirDespacho();

    expect(nombresVisibles()).toEqual(['María Peña', 'Destinatario 3']);

    await fireEvent.press(screen.getByRole('tab', {name: 'Gestionadas 1'}));
    expect(nombresVisibles()).toEqual(['Destinatario 1']);

    await fireEvent.press(screen.getByRole('tab', {name: 'Todas 3'}));
    expect(nombresVisibles()).toHaveLength(3);
  });

  it('la búsqueda ignora tildes y mayúsculas', async () => {
    await abrirDespacho();

    await fireEvent.changeText(
      screen.getByLabelText('Buscar guía, destinatario o dirección'),
      'medellin',
    );

    expect(nombresVisibles()).toEqual(['María Peña']);
  });

  it('el detalle muestra la guía y sus acciones', async () => {
    await abrirDespacho();

    await fireEvent.press(
      screen.getByRole('button', {name: 'Guía 2, María Peña'}),
    );

    expect(await screen.findByText('$ 18.000')).toBeTruthy();
    expect(screen.getByText('12,5 kg')).toBeTruthy();
    expect(
      screen.getByRole('button', {name: 'Llamar al destinatario'}),
    ).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Entregar'})).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Novedad'})).toBeTruthy();
  });

  describe('gestión sin señal', () => {
    const abrirGuia = async (nombre: string) => {
      await abrirDespacho();
      await fireEvent.press(screen.getByRole('button', {name: nombre}));
      await screen.findByRole('button', {name: 'Llamar al destinatario'});
    };

    /** Responde al Alert de confirmación con el botón indicado. */
    const confirmarAlerta = (boton: string) => {
      const botones = alerta.mock.calls.at(-1)?.[2] ?? [];
      botones.find(b => b.text === boton)?.onPress?.();
    };

    const operacionesGuardadas = () =>
      leer(db => db.select().from(operaciones));

    it('entregar guarda en el teléfono, encola y vuelve al despacho', async () => {
      await abrirGuia('Guía 2, María Peña');
      await fireEvent.press(screen.getByRole('button', {name: 'Entregar'}));

      await fireEvent.changeText(
        await screen.findByLabelText('Recibe'),
        'Ana Gómez',
      );
      await fireEvent.press(
        screen.getByRole('button', {name: 'Parentesco: Sin especificar'}),
      );
      await fireEvent.press(await screen.findByText('Portería'));
      await fireEvent.changeText(
        screen.getByLabelText('Celular'),
        '3001234567',
      );
      await fireEvent.press(
        screen.getByRole('button', {name: 'Confirmar entrega'}),
      );
      confirmarAlerta('Entregar');

      expect(
        await screen.findByRole('button', {name: '1 por enviar'}),
      ).toBeTruthy();
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({text1: 'Entrega guardada'}),
      );
      expect(nombresVisibles()).toEqual(['Destinatario 3']);

      const [operacion] = await operacionesGuardadas();
      expect(operacion).toMatchObject({
        tipo: 'entrega',
        estado: 'pendiente',
        claveEntidad: claveGuia(DESPACHO, 2),
      });
      expect(JSON.parse(operacion!.cuerpo)).toMatchObject({
        codigo_guia_pk: 2,
        codigo_despacho_fk: 910,
        recibe: 'Ana Gómez',
        parentesco: 'PORTERÍA',
        celular: '3001234567',
        numero_identificacion: null,
      });
    });

    it('cancelar la confirmación no guarda nada', async () => {
      await abrirGuia('Guía 2, María Peña');
      await fireEvent.press(screen.getByRole('button', {name: 'Entregar'}));
      await fireEvent.press(
        await screen.findByRole('button', {name: 'Confirmar entrega'}),
      );
      await waitFor(() => expect(alerta).toHaveBeenCalled());

      expect(await operacionesGuardadas()).toEqual([]);
    });

    it('la novedad pide el tipo y deja la guía con novedad', async () => {
      await abrirGuia('Guía 3, Destinatario 3');
      await fireEvent.press(screen.getByRole('button', {name: 'Novedad'}));

      await fireEvent.press(
        await screen.findByRole('button', {name: 'Guardar novedad'}),
      );
      expect(await screen.findByText('Elige el tipo de novedad')).toBeTruthy();

      await fireEvent.press(
        screen.getByRole('button', {name: 'Tipo de novedad: Elegir'}),
      );
      await fireEvent.press(await screen.findByText('Destinatario ausente'));
      await fireEvent.changeText(
        screen.getByLabelText('Descripción'),
        'Nadie atiende',
      );
      await fireEvent.press(
        screen.getByRole('button', {name: 'Guardar novedad'}),
      );

      await screen.findByRole('button', {name: '1 por enviar'});
      await fireEvent.press(screen.getByRole('tab', {name: 'Gestionadas 2'}));
      expect(screen.getByText('Con novedad')).toBeTruthy();
      const [operacion] = await operacionesGuardadas();
      expect(JSON.parse(operacion!.cuerpo)).toMatchObject({
        codigo_novedad_tipo_fk: 'AUSENTE',
        descripcion: 'Nadie atiende',
      });

      // La empresa no permite entregar con novedad (configuración provisional).
      await fireEvent.press(
        screen.getByRole('button', {name: 'Guía 3, Destinatario 3'}),
      );
      await screen.findByRole('button', {name: 'Llamar al destinatario'});
      expect(screen.queryByRole('button', {name: 'Entregar'})).toBeNull();
    });

    it('terminar queda bloqueado mientras haya envíos sin confirmar', async () => {
      await abrirDespacho();
      await entregarLocal(2);
      await entregarLocal(3);
      avisarCambio();

      expect(
        await screen.findByText(
          'Tienes 2 envíos sin confirmar. Envíalos antes de terminar.',
        ),
      ).toBeTruthy();
      expect(
        screen.getByRole('button', {name: 'Terminar despacho'}).props
          .accessibilityState.disabled,
      ).toBe(true);
    });

    it('con todo gestionado y enviado, terminar encola y marca el despacho', async () => {
      apiSimulada.listarAsignacionesApi.mockResolvedValue([asignacion]);
      apiSimulada.descargarGuiasApi.mockResolvedValue(
        descarga([
          guia(1, {estado_entregado: true}),
          guia(2, {estado_novedad: true}),
        ]),
      );
      await iniciarSesion();
      await fireEvent.press(await screen.findByText('Despacho 12345'));

      await fireEvent.press(
        await screen.findByRole('button', {name: 'Terminar despacho'}),
      );
      confirmarAlerta('Terminar');

      expect(await screen.findByText('Despacho terminado')).toBeTruthy();
      expect(
        screen.getByText('Se enviará a la empresa cuando haya señal.'),
      ).toBeTruthy();
      const [operacion] = await operacionesGuardadas();
      expect(operacion).toMatchObject({tipo: 'terminar'});
      expect(JSON.parse(operacion!.cuerpo)).toMatchObject({
        codigo_despacho_pk: 910,
      });
    });
  });

  it('actualizar sin señal avisa y deja las guías como estaban', async () => {
    await abrirDespacho();
    apiSimulada.descargarGuiasApi.mockRejectedValue(
      new ErrorApi({codigo: 'SIN_CONEXION', mensaje: 'sin red'}),
    );

    await fireEvent.press(
      screen.getByRole('button', {name: 'Actualizar guías'}),
    );

    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text1: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
        }),
      ),
    );
    expect(nombresVisibles()).toEqual(['María Peña', 'Destinatario 3']);
  });

  it('una entrega sin enviar se ve en la guía, en la barra y bloquea desvincular', async () => {
    await abrirDespacho();

    await entregarLocal(3);
    avisarCambio();

    expect(
      await screen.findByRole('button', {name: '1 por enviar'}),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', {name: 'Gestionadas 2'}));
    expect(screen.getAllByText('Por enviar').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', {name: 'Desvincular despacho'}).props
        .accessibilityState.disabled,
    ).toBe(true);
  });

  it('desvincular pide confirmación, libera en Fluor y vuelve a la lista', async () => {
    apiSimulada.desvincularDespachoApi.mockResolvedValue();
    await abrirDespacho();

    await fireEvent.press(
      screen.getByRole('button', {name: 'Desvincular despacho'}),
    );
    // Después de liberarlo, Fluor ya no lo lista.
    apiSimulada.listarAsignacionesApi.mockResolvedValue([]);
    const botones = alerta.mock.calls[0]?.[2] ?? [];
    botones.find(b => b.text === 'Desvincular')?.onPress?.();

    expect(await screen.findByText('Aún no tienes despachos')).toBeTruthy();
    expect(apiSimulada.desvincularDespachoApi).toHaveBeenCalledWith(DESPACHO);
  });

  it('Envíos muestra la rechazada con su motivo y deja descartarla', async () => {
    await abrirDespacho();
    const id = await entregarLocal(3);
    await escribir(tx =>
      tx
        .update(operaciones)
        .set({estado: 'rechazada', ultimoError: 'La guía ya fue entregada'})
        .where(eq(operaciones.idOperacion, id)),
    );
    avisarCambio();

    await fireEvent.press(
      await screen.findByRole('button', {
        name: '1 envío no se pudo enviar · revisar',
      }),
    );
    expect(await screen.findByText('Entrega · guía 3')).toBeTruthy();
    expect(screen.getByText('La guía ya fue entregada')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', {name: 'Descartar'}));
    const botones = alerta.mock.calls[0]?.[2] ?? [];
    botones.find(b => b.text === 'Descartar')?.onPress?.();

    expect(await screen.findByText('Nada por enviar')).toBeTruthy();
  });

  describe('vincular', () => {
    const abrirVincular = async () => {
      apiSimulada.listarAsignacionesApi.mockResolvedValue([]);
      await iniciarSesion();
      await fireEvent.press(
        await screen.findByRole('button', {name: 'Vincular despacho'}),
      );
      await screen.findByLabelText('Operador');
    };

    const llenar = async () => {
      await fireEvent.changeText(screen.getByLabelText('Operador'), '7');
      await fireEvent.changeText(screen.getByLabelText('Despacho'), '910');
      await fireEvent.changeText(screen.getByLabelText('Token'), 'A1B2');
      await fireEvent.press(screen.getByRole('button', {name: 'Vincular'}));
    };

    it('valida los datos antes de llamar a Fluor', async () => {
      await abrirVincular();
      await fireEvent.changeText(screen.getByLabelText('Operador'), '7a');
      await fireEvent.press(screen.getByRole('button', {name: 'Vincular'}));

      expect(await screen.findByText('Solo números')).toBeTruthy();
      expect(screen.getByText('Ingresa el token')).toBeTruthy();
      expect(apiSimulada.vincularDespachoApi).not.toHaveBeenCalled();
    });

    it('explica el 404 sin decir cuál dato falló', async () => {
      apiSimulada.vincularDespachoApi.mockRejectedValue(
        new ErrorApi({codigo: 'NO_ENCONTRADO', mensaje: 'x', estado: 404}),
      );
      await abrirVincular();
      await llenar();

      expect(
        await screen.findByText(
          'No encontramos un despacho activo con esos datos. Revisa el operador, el número y el token.',
        ),
      ).toBeTruthy();
    });

    it('si es de otro conductor lo dice', async () => {
      apiSimulada.vincularDespachoApi.mockRejectedValue(
        new ErrorApi({codigo: 'CONFLICTO', mensaje: 'x', estado: 409}),
      );
      await abrirVincular();
      await llenar();

      expect(
        await screen.findByText(
          'Este despacho ya está asignado a otro conductor.',
        ),
      ).toBeTruthy();
    });

    it('al vincular abre el despacho con sus guías', async () => {
      apiSimulada.vincularDespachoApi.mockResolvedValue(asignacion);
      apiSimulada.descargarGuiasApi.mockResolvedValue(descarga(GUIAS));
      await abrirVincular();
      await llenar();

      expect(await screen.findByText('María Peña')).toBeTruthy();
      expect(apiSimulada.vincularDespachoApi).toHaveBeenCalledWith({
        tenantId: 7,
        codigoDespacho: 910,
        token: 'A1B2',
      });
      expect(screen.getByText('Despacho 12345')).toBeTruthy();
    });
  });
});
