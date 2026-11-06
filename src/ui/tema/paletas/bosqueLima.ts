import type {Escena, Paleta} from './tipos';

/**
 * "Bosque y lima": variante Ruta del canvas de diseño
 * (https://claude.ai/artifact/DHeeTJvpyQEjdpSax84QgP).
 * Acceso sobre bosque oscuro con acción en lima; la operación sobre suelo
 * claro con la tarjeta destacada en bosque. La escena oscura no está en el
 * mockup: se deriva de la de marca.
 */
const bosque = {
  950: '#0A1E18',
  900: '#0F2A22',
  800: '#183A2F',
  700: '#2C4A3F',
  600: '#3D5F52',
  500: '#6B8F80',
  400: '#86A698',
  200: '#C4D6CD',
  100: '#D3DED7',
  50: '#E4EEDF',
} as const;

const lima = {500: '#A8E05F', 900: '#1F3D2A'} as const;

const neutro = {
  blanco: '#FFFFFF',
  suelo: '#F3F6F2',
  superficie: '#E9EFE8',
  texto: '#0F2A22',
  secundario: '#4A5F56',
  bordeCampo: '#7D8B85',
  deshabilitado: '#E3E8E5',
  sobreDeshabilitado: '#56645F',
} as const;

const claro: Escena = {
  suelo: neutro.suelo,
  fondo: neutro.blanco,
  superficie: neutro.superficie,
  campo: neutro.blanco,
  bordeCampo: neutro.bordeCampo,
  borde: bosque[100],
  texto: neutro.texto,
  textoSecundario: neutro.secundario,
  primario: bosque[900],
  primarioSuave: bosque[50],
  sobrePrimario: neutro.blanco,
  accion: lima[500],
  sobreAccion: bosque[900],
  acento: lima[500],
  sobreAcento: bosque[900],
  exito: '#146C2E',
  exitoSuave: '#E2F4E6',
  advertencia: '#7A4F00',
  advertenciaSuave: '#FDF6E6',
  advertenciaBorde: '#F2D8A0',
  peligro: '#A3193F',
  peligroSuave: '#FCE6EB',
  peligroFuerte: '#C92251',
  info: '#0B5F7E',
  infoSuave: '#E3F1F7',
  deshabilitado: neutro.deshabilitado,
  sobreDeshabilitado: neutro.sobreDeshabilitado,
  velo: 'rgba(15, 42, 34, 0.45)',
  traza: bosque[100],
  nodo: bosque[500],
  marca: bosque[900],
  sobreMarca: neutro.blanco,
};

/** Estados sobre fondos de bosque (marca y oscuro). */
const estadosSobreBosque = {
  exito: '#7FD99A',
  exitoSuave: '#12331F',
  advertencia: '#F9B61F',
  advertenciaSuave: '#2A2008',
  advertenciaBorde: '#5A4210',
  peligro: '#FF9DB0',
  peligroSuave: '#3A1420',
  peligroFuerte: '#EF2D57',
  info: '#7CC8E8',
  infoSuave: '#0E2A36',
} as const;

const marca: Escena = {
  ...estadosSobreBosque,
  // Sobre bosque, los avisos van en el color del campo con el borde del estado.
  advertenciaSuave: bosque[800],
  advertenciaBorde: estadosSobreBosque.advertencia,
  suelo: bosque[900],
  fondo: bosque[800],
  superficie: bosque[800],
  campo: bosque[800],
  bordeCampo: bosque[500],
  borde: bosque[600],
  texto: neutro.blanco,
  textoSecundario: bosque[200],
  primario: lima[500],
  primarioSuave: lima[900],
  sobrePrimario: bosque[900],
  accion: lima[500],
  sobreAccion: bosque[900],
  acento: lima[500],
  sobreAcento: bosque[900],
  deshabilitado: bosque[700],
  sobreDeshabilitado: bosque[200],
  velo: 'rgba(0, 0, 0, 0.6)',
  traza: bosque[600],
  nodo: bosque[400],
  marca: bosque[800],
  sobreMarca: neutro.blanco,
};

const oscuro: Escena = {
  ...marca,
  ...estadosSobreBosque,
  suelo: bosque[950],
  fondo: bosque[900],
  superficie: bosque[800],
  borde: bosque[700],
  texto: '#EEF4F0',
  marca: bosque[900],
};

export const bosqueLima: Paleta = {
  nombre: 'Bosque y lima',
  claro,
  oscuro,
  marca,
};
