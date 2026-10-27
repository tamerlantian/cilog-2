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
