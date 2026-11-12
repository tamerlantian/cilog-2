// El mock de unistyles dibuja ScopedTheme como null; aquí debe mostrar su contenido.
require('react-native-unistyles').ScopedTheme = ({children}) => children;

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {API_URL: 'https://api.prueba.test', ENTORNO: 'dev'},
}));

jest.mock('react-native-mmkv', () => {
  const datos = new Map();
  return {
    createMMKV: () => ({
      getString: clave => datos.get(clave),
      set: (clave, valor) => datos.set(clave, valor),
      remove: clave => datos.delete(clave),
    }),
  };
});

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('react-native-keychain', () => {
  const guardado = {valor: null};
  return {
    ACCESSIBLE: {
      AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AfterFirstUnlockThisDeviceOnly',
    },
    setGenericPassword: jest.fn(async (usuario, clave) => {
      guardado.valor = {username: usuario, password: clave};
      return true;
    }),
    getGenericPassword: jest.fn(async () => guardado.valor ?? false),
    resetGenericPassword: jest.fn(async () => {
      guardado.valor = null;
      return true;
    }),
  };
});

jest.mock('react-native-device-info', () => ({
  getVersion: () => '1.0.0',
  getBuildNumber: () => '1',
}));

jest.mock('react-native-bootsplash', () => ({
  __esModule: true,
  default: {hide: jest.fn().mockResolvedValue(undefined)},
}));

// La cámara es nativa: en Jest es una vista a la que se le disparan lecturas.
jest.mock('react-native-camera-kit', () => {
  const {createElement} = require('react');
  const {View} = require('react-native');
  return {
    CameraType: {Back: 'back'},
    Camera: props => createElement(View, {...props, testID: 'camara'}),
  };
});

// El toast real deja temporizadores vivos; en pruebas solo importa qué se muestra.
jest.mock('react-native-toast-message', () => {
  const Toast = () => null;
  Toast.show = jest.fn();
  Toast.hide = jest.fn();
  return {__esModule: true, default: Toast};
});

// op-sqlite es nativo: en Jest cada `open` es una base SQLite en memoria (libsql,
// una sola conexión como en el teléfono, así BEGIN/COMMIT se comportan igual).
jest.mock('@op-engineering/op-sqlite', () => {
  const Database = require('libsql');
  return {
    open: () => {
      const db = new Database(':memory:');
      const executeRaw = async (sql, params = []) => {
        const sentencia = db.prepare(sql);
        if (!sentencia.reader) {
          const {changes} = sentencia.run(params);
          return {rowsAffected: changes, rawRows: [], columnNames: []};
        }
        return {
          rowsAffected: 0,
          rawRows: sentencia.raw(true).all(params),
          columnNames: [],
        };
      };
      return {execute: executeRaw, executeRaw};
    },
  };
});

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

// Sistema de archivos en memoria: ruta -> tamaño. `__archivos` deja ver qué quedó.
jest.mock('@dr.pogodin/react-native-fs', () => {
  const archivos = new Map();
  const carpetas = new Set();
  return {
    __archivos: archivos,
    DocumentDirectoryPath: '/documentos',
    CachesDirectoryPath: '/cache',
    exists: jest.fn(async ruta => archivos.has(ruta) || carpetas.has(ruta)),
    mkdir: jest.fn(async ruta => {
      carpetas.add(ruta);
    }),
    // Lo que llega de la cámara o de la firma no está en el mapa: pesa 200 KB.
    moveFile: jest.fn(async (origen, destino) => {
      archivos.set(destino, archivos.get(origen) ?? 200_000);
      archivos.delete(origen);
    }),
    copyFile: jest.fn(async (origen, destino) => {
      archivos.set(destino, archivos.get(origen) ?? 0);
    }),
    stat: jest.fn(async ruta => ({size: archivos.get(ruta) ?? 0})),
    unlink: jest.fn(async ruta => {
      archivos.delete(ruta);
    }),
    getFSInfo: jest.fn(async () => ({
      freeSpace: 4_000_000_000,
      totalSpace: 64_000_000_000,
    })),
  };
});

jest.mock('@react-native-community/geolocation', () => ({
  setRNConfiguration: jest.fn(),
  requestAuthorization: jest.fn(),
  getCurrentPosition: jest.fn(exito =>
    exito({coords: {latitude: 6.2442, longitude: -75.5812}, timestamp: 0}),
  ),
}));

jest.mock('react-native-image-picker', () => {
  let n = 0;
  return {
    launchCamera: jest.fn(async () => {
      n += 1;
      return {
        assets: [{uri: `file:///cache/foto-${n}.jpg`, fileSize: 200_000}],
      };
    }),
  };
});

jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(async () => 'file:///cache/firma.png'),
}));

// Rastreo de ubicación (Transistorsoft): nativo. Guarda los oyentes para que
// las pruebas disparen respuestas de Fluor o renovaciones de token.
jest.mock('react-native-background-geolocation', () => {
  const oyentes = {};
  const suscribir = nombre =>
    jest.fn(cb => {
      oyentes[nombre] = cb;
      return {remove: jest.fn()};
    });
  const estado = {enabled: false};
  const BackgroundGeolocation = {
    __oyentes: oyentes,
    __estado: estado,
    onHttp: suscribir('http'),
    onAuthorization: suscribir('authorization'),
    onHeartbeat: suscribir('heartbeat'),
    ready: jest.fn(async () => ({...estado})),
    setConfig: jest.fn(async () => ({...estado})),
    getState: jest.fn(async () => ({...estado})),
    start: jest.fn(async () => {
      estado.enabled = true;
      return {...estado};
    }),
    stop: jest.fn(async () => {
      estado.enabled = false;
      return {...estado};
    }),
    sync: jest.fn(async () => []),
    destroyLocations: jest.fn(async () => true),
    getCurrentPosition: jest.fn(async () => ({})),
  };
  return {
    __esModule: true,
    default: BackgroundGeolocation,
    AuthorizationStrategy: {Jwt: 'jwt', Sas: 'sas'},
    DesiredAccuracy: {High: -1},
    LogLevel: {Warning: 2, Verbose: 5},
  };
});
