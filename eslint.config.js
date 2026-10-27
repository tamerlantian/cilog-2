const fs = require('node:fs');
const reactNative = require('@react-native/eslint-config/flat');
const tseslint = require('typescript-eslint');

/**
 * Reglas de capas (ver docs/arquitectura.md):
 *   ui        -> no conoce core ni features
 *   core      -> no conoce features ni app
 *   features  -> no conocen app (y no se importan entre si, ver restriccion por feature)
 */
const features = fs
  .readdirSync('src/features', {withFileTypes: true})
  .filter(entrada => entrada.isDirectory())
  .map(entrada => entrada.name);

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
  // Cada feature solo ve core y ui: se calcula con los directorios que existan.
  ...features.map(feature => ({
    files: [`src/features/${feature}/**/*.{ts,tsx}`],
    rules: prohibir([
      '@/app/*',
      ...features
        .filter(otra => otra !== feature)
        .map(otra => `@/features/${otra}`),
    ]),
  })),
  {
    files: ['src/ui/tema/**/*.ts'],
    rules: {
      'react-native/no-color-literals': 'off',
      'no-restricted-syntax': 'off',
    },
  },
];
