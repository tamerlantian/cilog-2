const reactNative = require('@react-native/eslint-config/flat');
const tseslint = require('typescript-eslint');

/**
 * Reglas de capas (ver docs/arquitectura.md):
 *   ui        -> no conoce core ni features
 *   core      -> no conoce features ni app
 *   features  -> no conocen app (y no se importan entre si, ver restriccion por feature)
 */
const prohibir = (...grupos) => ({
  'no-restricted-imports': [
    'error',
    {
      patterns: grupos.map(group => ({
        group,
        message: 'Import prohibido por la arquitectura de capas.',
      })),
    },
  ],
});

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      'coverage/**',
      '**/*.js',
    ],
  },
  ...reactNative,
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', {allow: ['warn', 'error']}],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {prefer: 'type-imports'},
      ],
      'react-hooks/exhaustive-deps': 'error',
      'react-native/no-inline-styles': 'error',
      'react-native/no-color-literals': 'error',
      // Los colores salen del tema (ui/tema). `no-color-literals` no ve StyleSheet de unistyles.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
          message:
            'No uses colores literales: toma el color del tema (theme.colores.*).',
        },
      ],
    },
  },
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: prohibir(['@/core/*', '@/features/*', '@/app/*']),
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: prohibir(['@/features/*', '@/app/*']),
  },
  {files: ['src/features/**/*.{ts,tsx}'], rules: prohibir(['@/app/*'])},
  {
    files: ['src/ui/tema/**/*.ts'],
    rules: {
      'react-native/no-color-literals': 'off',
      'no-restricted-syntax': 'off',
    },
  },
];
