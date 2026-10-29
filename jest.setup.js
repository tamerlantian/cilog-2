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
