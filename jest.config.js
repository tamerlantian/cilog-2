module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: [
    // Los mocks de unistyles deben ir antes que su configuración.
    'react-native-unistyles/mocks',
    './src/ui/tema/unistyles.ts',
    './jest.setup.js',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-toast-message|@react-navigation|react-native-screens|react-native-keychain)/)',
  ],
  // Las transiciones de native-stack dejan temporizadores vivos al cambiar de pantalla en Jest.
  forceExit: true,
  testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}'],
};
