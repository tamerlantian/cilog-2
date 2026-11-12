import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {eq} from 'drizzle-orm';
import {Alert, PermissionsAndroid, Platform} from 'react-native';
import * as fs from '@dr.pogodin/react-native-fs';
import {getFSInfo} from '@dr.pogodin/react-native-fs';
import {launchCamera} from 'react-native-image-picker';
import Toast from 'react-native-toast-message';

import {App} from '@/app/App';
import {clienteConsultas} from '@/core/api/clienteConsultas';
import {ErrorApi} from '@/core/api';
import {archivos, escribir, guias, leer, operaciones} from '@/core/db';
import {useSesion} from '@/core/sesion';
import {encolar, obtenerMotor} from '@/core/sync';
import * as apiAuth from '@/features/auth/api/auth';
import * as api from '@/features/despachos/api/despachos';
import type {GuiaFluor} from '@/features/despachos/api/despachos';
import * as apiEntrega from '@/features/despachos/api/entrega';
import {claveGuia} from '@/features/despachos/domain/claves';
import {funciones} from '@/features/despachos/domain/gestion';

import {crearJwt, firmar, usuarioPrueba} from '../../helpers';

jest.mock('@/features/auth/api/auth');
jest.mock('@/features/despachos/api/despachos');
jest.mock('@/features/despachos/api/entrega');
const apiSimulada = jest.mocked(api);

const DESPACHO = 10;

/** El mock de react-native-fs guarda ruta -> tamaño. */
const enDisco = (fs as unknown as {__archivos: Map<string, number>}).__archivos;

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
    vr_cobro_entrega: 18000,
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
  await screen.findByLabelText('Despachos');
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
  return botonDespacho();
};

/** La acción de la tarjeta del despacho en curso en Mis despachos. */
const botonDespacho = () =>
  screen.findByRole('button', {name: /^(Continuar entregas|Abrir despacho)$/});

const abrirDespacho = async () => {
  await fireEvent.press(await conDespacho());
  await screen.findByLabelText('Guía, documento o destinatario');
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
    // Sin señal: lo que se entrega queda en la cola.
    jest
      .mocked(apiEntrega)
      .entregarGuiaApi.mockRejectedValue(
        new ErrorApi({codigo: 'SIN_CONEXION', mensaje: 'Sin red'}),
      );
    jest.mocked(launchCamera).mockClear();
    enDisco.clear();
    jest.mocked(Toast.show).mockClear();
    await useSesion.getState().cerrarSesion();
    useSesion.setState({estado: 'iniciando', avisoSesion: null});
  });
  afterEach(async () => {
    funciones.novedades = false;
    // Lo que invalidaron las mutaciones termina antes de desmontar.
    await waitFor(() =>
      expect(
        clienteConsultas.isFetching() + clienteConsultas.isMutating(),
      ).toBe(0),
    );
    clienteConsultas.clear();
  });

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

    expect(screen.getByText('2 pendientes')).toBeTruthy();
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
      screen.getByLabelText('Guía, documento o destinatario'),
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
    expect(screen.getByText('2 · 12,5 kg')).toBeTruthy();
    expect(
      screen.getByRole('button', {name: 'Llamar a María Peña'}),
    ).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Entregar'})).toBeTruthy();
    // Novedad está apagada hasta que Fluor tenga su endpoint.
    expect(screen.queryByRole('button', {name: 'Novedad'})).toBeNull();
  });

  describe('lector de códigos', () => {
    const escanear = async (codigo: string) => {
      await fireEvent.press(
        screen.getByRole('button', {name: 'Escanear código'}),
      );
      await fireEvent(await screen.findByTestId('camara'), 'readCode', {
        nativeEvent: {codeStringValue: codigo},
      });
    };

    it('abre directo la guía que coincide exacto, aunque ya esté gestionada', async () => {
      await abrirDespacho();

      await escanear('1');

      expect(await screen.findByText('Guía 1')).toBeTruthy();
      expect(screen.queryByTestId('camara')).toBeNull();
    });

    it('sin coincidencia exacta lo deja como búsqueda en Todas', async () => {
      await abrirDespacho();

      await escanear('FAC');

      expect(
        screen.getByLabelText('Guía, documento o destinatario').props.value,
      ).toBe('FAC');
      expect(nombresVisibles()).toHaveLength(3);
      expect(screen.queryByTestId('camara')).toBeNull();
    });

    it('un código que no es de guía avisa y no toca la lista', async () => {
      await abrirDespacho();

      await escanear('{"operador":"a"}');

      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({text1: 'Ese código no es de una guía.'}),
      );
      expect(nombresVisibles()).toEqual(['María Peña', 'Destinatario 3']);
    });

    it('sin permiso de cámara no abre el lector', async () => {
      await abrirDespacho();
      const sistema = Platform.OS;
      Platform.OS = 'android';
      const pedir = jest
        .spyOn(PermissionsAndroid, 'request')
        .mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);

      await fireEvent.press(
        screen.getByRole('button', {name: 'Escanear código'}),
      );

      await waitFor(() =>
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({
            text1: 'Sin permiso de cámara no se pueden leer códigos.',
          }),
        ),
      );
      expect(screen.queryByTestId('camara')).toBeNull();
      pedir.mockRestore();
      Platform.OS = sistema;
    });
  });

  describe('gestión sin señal', () => {
    const abrirGuia = async (nombre: string) => {
      await abrirDespacho();
      await fireEvent.press(screen.getByRole('button', {name: nombre}));
      await screen.findByRole('button', {name: /^Llamar a /});
    };

    const operacionesGuardadas = () =>
      leer(db => db.select().from(operaciones));

    /** Del paso de fotos al de firma, sin llenar nada. */
    const irAFirma = async () => {
      await fireEvent.press(
        await screen.findByRole('button', {name: 'Siguiente'}),
      );
      await fireEvent.press(
        await screen.findByRole('button', {name: 'Siguiente'}),
      );
      await screen.findByLabelText('Paso 3 de 3, Firma');
    };

    it('entregar va por pasos, guarda en el teléfono y vuelve a los pendientes', async () => {
      await abrirGuia('Guía 2, María Peña');
      await fireEvent.press(screen.getByRole('button', {name: 'Entregar'}));

      expect(await screen.findByText('Entregar a María Peña')).toBeTruthy();
      expect(screen.getByText('2 · $ 18.000 por cobrar')).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', {name: 'Siguiente'}));

      // Atajo: recibe el destinatario como titular.
      await fireEvent.press(
        await screen.findByRole('checkbox', {name: 'Recibe María Peña'}),
      );
      expect(screen.getByLabelText('Nombre de quien recibe').props.value).toBe(
        'María Peña',
      );
      expect(
        screen.getByRole('button', {name: 'Parentesco: Titular'}),
      ).toBeTruthy();

      await fireEvent.changeText(
        screen.getByLabelText('Nombre de quien recibe'),
        'Ana Gómez',
      );
      await fireEvent.press(
        screen.getByRole('button', {name: 'Parentesco: Titular'}),
      );
      expect(await screen.findByText('MÁS USADOS')).toBeTruthy();
      await fireEvent.press(screen.getByText('Portería'));
      await fireEvent.changeText(
        screen.getByLabelText('Número de documento'),
        '43A',
      );
      await fireEvent.changeText(
        screen.getByLabelText('Celular (opcional)'),
        '3001234567',
      );

      // No pasa con datos inválidos.
      await fireEvent.press(screen.getByRole('button', {name: 'Siguiente'}));
      expect(await screen.findByText('Solo números')).toBeTruthy();
      await fireEvent.changeText(
        screen.getByLabelText('Número de documento'),
        '43123456',
      );
      await fireEvent.press(screen.getByRole('button', {name: 'Siguiente'}));

      expect(
        await screen.findByText('Cobra $ 18.000 antes de confirmar.'),
      ).toBeTruthy();
      expect(screen.getByText('Ana Gómez · Portería')).toBeTruthy();
      expect(screen.getByText('0 fotos · Doc. 43123456')).toBeTruthy();
      await fireEvent.press(
        screen.getByRole('button', {name: 'Confirmar entrega'}),
      );

      // Vuelve directo a la lista de pendientes del despacho.
      await screen.findByRole('button', {name: '1 por enviar'});
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
        guia: 2,
        recibe: 'Ana Gómez',
        recibe_parentesco: 'PORTERÍA',
        recibe_celular: '3001234567',
        recibe_numero_identificacion: '43123456',
      });
    });

    it('la entrega lleva fotos, firma y ubicación, y las guarda en documentos', async () => {
      await abrirGuia('Guía 2, María Peña');
      await fireEvent.press(screen.getByRole('button', {name: 'Entregar'}));

      await fireEvent.press(
        await screen.findByRole('button', {name: 'Tomar foto'}),
      );
      expect(await screen.findByLabelText('Foto 1')).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', {name: 'Tomar foto'}));
      await fireEvent.press(
        await screen.findByRole('button', {name: 'Quitar foto 1'}),
      );
      expect(screen.getByText('1 de 4')).toBeTruthy();

      await irAFirma();
      expect(
        screen.getByRole('button', {name: 'Borrar'}).props.accessibilityState
          .disabled,
      ).toBe(true);
      await firmar(screen.getByLabelText('Espacio para firmar'));

      // Volver un paso no pierde la firma: queda guardada como imagen.
      await fireEvent.press(screen.getByRole('button', {name: 'Atrás'}));
      await fireEvent.press(
        await screen.findByRole('button', {name: 'Siguiente'}),
      );
      expect(await screen.findByLabelText('Firma recogida')).toBeTruthy();

      await fireEvent.press(
        screen.getByRole('button', {name: 'Confirmar entrega'}),
      );
      await screen.findByRole('button', {name: '1 por enviar'});

      const cola = await operacionesGuardadas();
      expect(cola.map(o => o.tipo)).toEqual(['entrega']);
      expect(JSON.parse(cola[0]!.cuerpo)).toMatchObject({
        latitud: 6.2442,
        longitud: -75.5812,
      });
      const guardados = await leer(db => db.select().from(archivos));
      expect(guardados.map(a => a.ruta)).toEqual([
        expect.stringMatching(/^\/documentos\/evidencias\/.+\.jpg$/),
        expect.stringMatching(/^\/documentos\/evidencias\/.+\.png$/),
      ]);
      // La foto que se quitó nunca se movió a documentos.
      expect(
        [...enDisco.keys()].filter(r => r.startsWith('/documentos')),
      ).toHaveLength(2);
    });

    it('sin espacio no abre la cámara', async () => {
      jest.mocked(getFSInfo).mockResolvedValueOnce({
        freeSpace: 10_000_000,
        freeSpaceEx: 10_000_000,
        totalSpace: 64_000_000_000,
        totalSpaceEx: 64_000_000_000,
      });
      await abrirGuia('Guía 2, María Peña');
      await fireEvent.press(screen.getByRole('button', {name: 'Entregar'}));

      await fireEvent.press(
        await screen.findByRole('button', {name: 'Tomar foto'}),
      );

      await waitFor(() =>
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({
            text1:
              'El teléfono tiene poco espacio. Libera al menos 50 MB para tomar fotos.',
          }),
        ),
      );
      expect(launchCamera).not.toHaveBeenCalled();
    });

    describe('foto sin permiso de cámara (Android)', () => {
      const sistema = Platform.OS;
      let pedir: jest.SpyInstance | undefined;
      afterEach(() => {
        pedir?.mockRestore();
        Platform.OS = sistema;
      });

      const intentarFoto = async (
        resultado: (typeof PermissionsAndroid.RESULTS)[keyof typeof PermissionsAndroid.RESULTS],
      ) => {
        await abrirGuia('Guía 2, María Peña');
        await fireEvent.press(screen.getByRole('button', {name: 'Entregar'}));
        Platform.OS = 'android';
        pedir = jest
          .spyOn(PermissionsAndroid, 'request')
          .mockResolvedValue(resultado);
        await fireEvent.press(
          await screen.findByRole('button', {name: 'Tomar foto'}),
        );
      };

      it('si lo niega, lo explica sin abrir la cámara', async () => {
        await intentarFoto(PermissionsAndroid.RESULTS.DENIED);

        await waitFor(() =>
          expect(Toast.show).toHaveBeenCalledWith(
            expect.objectContaining({
              text1: 'Sin permiso de cámara no se pueden tomar fotos.',
            }),
          ),
        );
        expect(launchCamera).not.toHaveBeenCalled();
      });

      it('si quedó bloqueado, ofrece abrir los ajustes', async () => {
        await intentarFoto(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);

        await waitFor(() =>
          expect(alerta).toHaveBeenCalledWith(
            'Cámara sin permiso',
            'Actívala en los ajustes del teléfono para tomar las fotos de la entrega.',
            expect.arrayContaining([
              expect.objectContaining({text: 'Abrir ajustes'}),
            ]),
          ),
        );
        expect(launchCamera).not.toHaveBeenCalled();
      });

      it('con permiso abre la cámara', async () => {
        await intentarFoto(PermissionsAndroid.RESULTS.GRANTED);

        expect(await screen.findByLabelText('Foto 1')).toBeTruthy();
      });
    });

    it('cerrar la entrega a mitad no guarda nada', async () => {
      await abrirGuia('Guía 2, María Peña');
      await fireEvent.press(screen.getByRole('button', {name: 'Entregar'}));
      await irAFirma();

      await fireEvent.press(screen.getByRole('button', {name: 'Cerrar'}));

      await screen.findByRole('button', {name: /^Llamar a /});
      expect(screen.getByRole('button', {name: 'Entregar'})).toBeTruthy();
      expect(await operacionesGuardadas()).toEqual([]);
    });

    it('la novedad pide el tipo y deja la guía con novedad', async () => {
      funciones.novedades = true;
      await abrirGuia('Guía 3, Destinatario 3');
      await fireEvent.press(screen.getByRole('button', {name: 'Novedad'}));

      await fireEvent.press(
        await screen.findByRole('button', {name: 'Reportar novedad'}),
      );
      expect(await screen.findByText('Elige el tipo de novedad')).toBeTruthy();

      await fireEvent.press(
        screen.getByRole('radio', {name: 'Destinatario ausente'}),
      );
      expect(
        screen.getByRole('radio', {name: 'Destinatario ausente'}).props
          .accessibilityState.checked,
      ).toBe(true);
      await fireEvent.changeText(
        screen.getByLabelText('Detalle (opcional)'),
        'Nadie atiende',
      );
      await fireEvent.press(
        screen.getByRole('button', {name: 'Reportar novedad'}),
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
      await screen.findByRole('button', {name: /^Llamar a /});
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
      await fireEvent.press(await botonDespacho());

      await fireEvent.press(
        await screen.findByRole('button', {name: 'Terminar despacho'}),
      );
      // El diálogo resume el despacho antes de confirmar.
      expect(
        await screen.findByText('¿Terminar el despacho 12345?'),
      ).toBeTruthy();
      expect(screen.getByText('Entregadas')).toBeTruthy();
      await fireEvent.press(
        screen.getAllByRole('button', {name: 'Terminar despacho'}).at(-1)!,
      );

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
      await fireEvent.changeText(
        screen.getByLabelText('Número de despacho'),
        '910',
      );
      // En minúsculas: se envía en mayúsculas, como en la app anterior.
      await fireEvent.changeText(screen.getByLabelText('Token'), 'a1b2');
      await fireEvent.press(screen.getByRole('button', {name: 'Vincular'}));
    };

    const escanearQr = async (codigo: string) => {
      await fireEvent.press(screen.getByRole('button', {name: 'Escanear QR'}));
      await fireEvent(await screen.findByTestId('camara'), 'readCode', {
        nativeEvent: {codeStringValue: codigo},
      });
    };

    it('el QR del manifiesto llena los datos y se vincula con ellos', async () => {
      apiSimulada.vincularDespachoApi.mockResolvedValue(asignacion);
      apiSimulada.descargarGuiasApi.mockResolvedValue(descarga(GUIAS));
      await abrirVincular();

      await escanearQr(
        JSON.stringify({
          operador: 18,
          codigoDespacho: 272345,
          token: '76C7',
          contenido: 'MEC:127416909\nPlaca:SNW554\n',
        }),
      );

      expect(screen.queryByTestId('camara')).toBeNull();
      expect(screen.getByLabelText('Operador').props.value).toBe('18');
      expect(screen.getByLabelText('Número de despacho').props.value).toBe(
        '272345',
      );
      expect(screen.getByLabelText('Token').props.value).toBe('76C7');

      await fireEvent.press(screen.getByRole('button', {name: 'Vincular'}));

      expect(await screen.findByText('María Peña')).toBeTruthy();
      expect(apiSimulada.vincularDespachoApi).toHaveBeenCalledWith({
        tenantId: 18,
        codigoDespacho: 272345,
        token: '76C7',
      });
    });

    it('un QR que no es de manifiesto avisa y no llena nada', async () => {
      await abrirVincular();

      await escanearQr('12345');

      expect(screen.queryByTestId('camara')).toBeNull();
      expect(screen.getByLabelText('Operador').props.value).toBe('');
      expect(apiSimulada.vincularDespachoApi).not.toHaveBeenCalled();
    });

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
      expect(screen.getByText('Despacho #12345')).toBeTruthy();
    });
  });
});
