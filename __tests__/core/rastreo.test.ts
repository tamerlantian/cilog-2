import type * as ModuloRastreo from '@/core/rastreo';
import type * as ModuloSesion from '@/core/sesion';
import type * as ModuloStorage from '@/core/storage';

type Oyentes = Record<'http' | 'authorization', (evento: unknown) => void>;

type Metodo =
  | 'ready'
  | 'setConfig'
  | 'getState'
  | 'start'
  | 'stop'
  | 'sync'
  | 'destroyLocations';

type PluginSimulado = Record<Metodo, jest.Mock> & {
  __oyentes: Oyentes;
  __estado: {enabled: boolean};
};

/** Los oyentes son asíncronos: deja correr sus promesas. */
const esperar = () => new Promise<void>(resolver => setImmediate(resolver));

const proveedor = () => ({
  credenciales: () => ({token: 'acceso-1', tokenRenovacion: 'renovacion-1'}),
  alRenovarToken: jest.fn(async () => undefined),
  alSesionInvalida: jest.fn(),
});

let plugin: PluginSimulado;
let almacen: typeof ModuloStorage.almacen;
let rastreoAislado: typeof ModuloRastreo;
let sesion: typeof ModuloSesion;

const cargarRastreo = () => rastreoAislado;

describe('rastreo de ubicación', () => {
  // El módulo recuerda si ya se preparó: cada prueba lo carga de cero, junto
  // con el plugin y MMKV simulados (en un registro aislado son instancias nuevas).
  beforeEach(() => {
    jest.isolateModules(() => {
      plugin = jest.requireMock<{default: PluginSimulado}>(
        'react-native-background-geolocation',
      ).default;
      almacen =
        jest.requireActual<typeof ModuloStorage>('@/core/storage').almacen;
      rastreoAislado =
        jest.requireActual<typeof ModuloRastreo>('@/core/rastreo');
      sesion = jest.requireActual<typeof ModuloSesion>('@/core/sesion');
    });
  });

  it('prepara el plugin con el formato de Fluor y el token de la sesión', async () => {
    const rastreo = cargarRastreo();
    await rastreo.prepararRastreo(proveedor());

    const config = plugin.ready.mock.calls[0][0];
    expect(config.http).toMatchObject({
      url: 'https://api.prueba.test/tte/movil/despacho/ubicacion-lote',
      rootProperty: 'ubicaciones',
      batchSync: true,
      headers: {},
    });
    expect(config.persistence.locationTemplate).toContain(
      '"fecha":"<%= timestamp %>"',
    );
    // La plantilla con valores de ejemplo debe ser JSON válido.
    const ejemplo = config.persistence.locationTemplate.replace(
      /<%= (\w+) %>/g,
      (_: string, campo: string) => (campo === 'timestamp' ? 'x' : '1'),
    );
    expect(Object.keys(JSON.parse(ejemplo))).toEqual([
      'fecha',
      'latitud',
      'longitud',
      'velocidad',
      'altitud',
      'exactitud',
      'exactitud_altitud',
    ]);
    expect(config.authorization).toMatchObject({
      accessToken: 'acceso-1',
      refreshToken: 'renovacion-1',
      refreshUrl: 'https://api.prueba.test/auth/seguridad/refresh',
    });
    expect(config.geolocation.locationAuthorizationRequest).toBe('WhenInUse');
  });

  it('al volver a abrir la app retoma la asignación que estaba rastreando', async () => {
    almacen.set('rastreo.asignacion', '77');
    const rastreo = cargarRastreo();
    await rastreo.prepararRastreo(proveedor());

    expect(plugin.ready.mock.calls[0][0].http.headers).toEqual({
      'X-Tenant-Despacho-ID': '77',
    });
  });

  it('iniciar guarda la asignación, pone el encabezado y arranca', async () => {
    const rastreo = cargarRastreo();
    await rastreo.prepararRastreo(proveedor());
    await rastreo.iniciarRastreo(10);

    expect(rastreo.asignacionRastreada()).toBe(10);
    expect(plugin.setConfig.mock.calls[0][0].http.headers).toEqual({
      'X-Tenant-Despacho-ID': '10',
    });
    expect(plugin.start).toHaveBeenCalledTimes(1);
    expect(plugin.destroyLocations).not.toHaveBeenCalled();
  });

  it('al cambiar de asignación envía o borra los puntos de la anterior antes', async () => {
    const rastreo = cargarRastreo();
    await rastreo.prepararRastreo(proveedor());
    await rastreo.iniciarRastreo(10);
    await rastreo.iniciarRastreo(20);

    const orden = (mock: jest.Mock) => mock.mock.invocationCallOrder[0] ?? 0;
    expect(orden(plugin.sync)).toBeLessThan(orden(plugin.destroyLocations));
    expect(orden(plugin.destroyLocations)).toBeLessThan(
      plugin.setConfig.mock.invocationCallOrder[1] ?? 0,
    );
    expect(rastreo.asignacionRastreada()).toBe(20);
    // Ya estaba encendido: no arranca dos veces.
    expect(plugin.start).toHaveBeenCalledTimes(1);
  });

  it('iniciar sin preparar falla', async () => {
    const rastreo = cargarRastreo();
    await expect(rastreo.iniciarRastreo(10)).rejects.toThrow('prepararRastreo');
  });

  it.each([404, 409])(
    'un %i de Fluor detiene el rastreo, borra los puntos y avisa',
    async estado => {
      const rastreo = cargarRastreo();
      const oyente = jest.fn();
      rastreo.escucharRastreoRechazado(oyente);
      await rastreo.prepararRastreo(proveedor());
      await rastreo.iniciarRastreo(10);

      plugin.__oyentes.http({success: false, status: estado, responseText: ''});
      await esperar();

      expect(plugin.stop).toHaveBeenCalled();
      expect(plugin.destroyLocations).toHaveBeenCalled();
      expect(rastreo.asignacionRastreada()).toBeNull();
      expect(oyente).toHaveBeenCalledWith(10);
    },
  );

  it('una asignación rechazada no vuelve a arrancar hasta cerrar sesión', async () => {
    const rastreo = cargarRastreo();
    await rastreo.prepararRastreo(proveedor());
    await rastreo.iniciarRastreo(10);
    plugin.__oyentes.http({success: false, status: 409, responseText: ''});
    await esperar();
    plugin.start.mockClear();

    await expect(rastreo.iniciarRastreo(10)).resolves.toBe(false);
    expect(plugin.start).not.toHaveBeenCalled();
    expect(rastreo.fueRechazada(10)).toBe(true);
    // Otra asignación sí arranca.
    await expect(rastreo.iniciarRastreo(20)).resolves.toBe(true);

    rastreo.olvidarRechazadas();
    expect(rastreo.fueRechazada(10)).toBe(false);
  });

  it('un 422 descarta el lote pero sigue rastreando', async () => {
    const rastreo = cargarRastreo();
    await rastreo.prepararRastreo(proveedor());
    await rastreo.iniciarRastreo(10);

    plugin.__oyentes.http({success: false, status: 422, responseText: ''});
    await esperar();

    expect(plugin.destroyLocations).toHaveBeenCalled();
    expect(plugin.stop).not.toHaveBeenCalled();
    expect(rastreo.asignacionRastreada()).toBe(10);
  });

  it('sin señal o con un 500 deja que el plugin reintente', async () => {
    const rastreo = cargarRastreo();
    await rastreo.prepararRastreo(proveedor());
    await rastreo.iniciarRastreo(10);

    plugin.__oyentes.http({success: false, status: 0, responseText: ''});
    plugin.__oyentes.http({success: false, status: 500, responseText: ''});
    await esperar();

    expect(plugin.destroyLocations).not.toHaveBeenCalled();
    expect(plugin.stop).not.toHaveBeenCalled();
  });

  it('guarda en la sesión el token que renovó el plugin', async () => {
    const rastreo = cargarRastreo();
    const conductor = proveedor();
    await rastreo.prepararRastreo(conductor);

    plugin.__oyentes.authorization({
      success: true,
      status: 200,
      error: null,
      response: {access_token: 'acceso-2', token_type: 'bearer'},
    });
    await esperar();

    expect(conductor.alRenovarToken).toHaveBeenCalledWith('acceso-2');
  });

  it('si Fluor rechaza el refresh cierra la sesión; sin señal no', async () => {
    const rastreo = cargarRastreo();
    const conductor = proveedor();
    await rastreo.prepararRastreo(conductor);

    plugin.__oyentes.authorization({
      success: false,
      status: 0,
      error: 'sin red',
      response: null,
    });
    await esperar();
    expect(conductor.alSesionInvalida).not.toHaveBeenCalled();

    plugin.__oyentes.authorization({
      success: false,
      status: 401,
      error: 'vencido',
      response: null,
    });
    await esperar();
    expect(conductor.alSesionInvalida).toHaveBeenCalledTimes(1);
  });

  it('detener intenta enviar lo pendiente y luego lo borra', async () => {
    const rastreo = cargarRastreo();
    await rastreo.prepararRastreo(proveedor());
    await rastreo.iniciarRastreo(10);
    plugin.sync.mockRejectedValueOnce(new Error('sin red'));

    await rastreo.detenerRastreo({enviarPendientes: true});

    expect(plugin.stop).toHaveBeenCalled();
    expect(plugin.sync).toHaveBeenCalled();
    expect(plugin.destroyLocations).toHaveBeenCalled();
    expect(rastreo.asignacionRastreada()).toBeNull();
  });

  it('la sesión le pasa el token nuevo al plugin y al cerrarla lo detiene', async () => {
    const desconectar = sesion.conectarSesionConRastreo();
    await rastreoAislado.iniciarRastreo(10);

    sesion.useSesion.setState({estado: 'activa', token: 'acceso-2'});
    await esperar();
    const autorizacion = plugin.setConfig.mock.calls
      .map(([config]) => config.authorization)
      .filter(Boolean);
    expect(autorizacion.at(-1)).toMatchObject({accessToken: 'acceso-2'});

    await sesion.useSesion.getState().cerrarSesion();
    await esperar();
    expect(plugin.stop).toHaveBeenCalled();
    expect(plugin.sync).not.toHaveBeenCalled();
    expect(plugin.destroyLocations).toHaveBeenCalled();
    desconectar();
  });
});
