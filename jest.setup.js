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
