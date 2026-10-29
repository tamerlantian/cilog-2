module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: [
    // Los mocks de unistyles deben ir antes que su configuración.
    'react-native-unistyles/mocks',
    './src/ui/tema/unistyles.ts',
    './jest.setup.js',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-toast-message|@react-navigation|react-native-screens|react-native-keychain|react-native-svg)/)',
  ],
  // Las transiciones de native-stack dejan temporizadores vivos al cambiar de pantalla en Jest.
  forceExit: true,
  // Los íconos de lucide se importan uno a uno (ui/iconos.ts); su build CommonJS no necesita Babel.
  moduleNameMapper: {
    '^lucide-react-native/icons/(.*)$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/$1.js',
  },
  testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}'],
};
