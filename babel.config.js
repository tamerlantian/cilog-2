module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // zod 4 usa `export * as`; Metro no lo transforma por defecto.
    '@babel/plugin-transform-export-namespace-from',
    // Debe ir antes que cualquier otro plugin que transforme componentes.
    ['react-native-unistyles/plugin', {root: 'src'}],
    [
      'module-resolver',
      {
        alias: {'@': './src'},
        extensions: [
          '.ios.ts',
          '.android.ts',
          '.ts',
          '.ios.tsx',
          '.android.tsx',
          '.tsx',
          '.js',
          '.json',
        ],
      },
    ],
  ],
};
