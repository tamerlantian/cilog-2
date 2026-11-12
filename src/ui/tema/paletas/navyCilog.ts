import type {Escena, Paleta} from './tipos';

/**
 * Colores de marca de Cilog: navy principal (#143049), navy profundo
 * (#0D2035), azul cielo secundario (#77AAD7) y el azul exacto del logo
 * (#1875C5) para la acción y los estados activos. El resto de la escala se
 * deriva del navy. Sobre fondos navy un botón en el azul del logo se pierde,
 * así que ahí la acción va en azul cielo. Ícono y pantalla de carga:
 * `assets/marca/*.svg` (ver *Marca* en `docs/arquitectura.md`).
 */
const navy = {
  950: '#0A1828',
  900: '#0D2035',
  800: '#143049',
  700: '#1C3D5A',
  600: '#2E5577',
  500: '#5F7F9C',
  400: '#86A2BC',
  200: '#C5D5E4',
  100: '#D6E2EE',
  50: '#E6EFF8',
} as const;

const azul = {cielo: '#77AAD7', logo: '#1875C5'} as const;

const neutro = {
  blanco: '#FFFFFF',
  suelo: '#F3F6F9',
  superficie: '#E8EEF4',
  texto: navy[900],
  secundario: '#4A5B6C',
  bordeCampo: '#7A8896',
  deshabilitado: '#E3E8ED',
  sobreDeshabilitado: '#56626E',
} as const;

const claro: Escena = {
  suelo: neutro.suelo,
  fondo: neutro.blanco,
  superficie: neutro.superficie,
  campo: neutro.blanco,
  bordeCampo: neutro.bordeCampo,
  borde: navy[100],
  texto: neutro.texto,
  textoSecundario: neutro.secundario,
  primario: navy[800],
  primarioSuave: navy[50],
  sobrePrimario: neutro.blanco,
  accion: azul.logo,
  sobreAccion: neutro.blanco,
  acento: azul.logo,
  sobreAcento: neutro.blanco,
  exito: '#146C2E',
  exitoSuave: '#E2F4E6',
  advertencia: '#7A4F00',
  advertenciaSuave: '#FDF6E6',
  advertenciaBorde: '#F2D8A0',
  advertenciaRelleno: '#F9B61F',
  peligro: '#A3193F',
  peligroSuave: '#FCE6EB',
  peligroFuerte: '#C92251',
  info: '#0B5F7E',
  infoSuave: '#E3F1F7',
  deshabilitado: neutro.deshabilitado,
  sobreDeshabilitado: neutro.sobreDeshabilitado,
  velo: 'rgba(13, 32, 53, 0.45)',
  traza: navy[100],
  nodo: navy[500],
  marca: navy[800],
  sobreMarca: neutro.blanco,
};

/** Estados sobre fondos navy (marca y oscuro). */
const estadosSobreNavy = {
  exito: '#7FD99A',
  exitoSuave: '#12331F',
  advertencia: '#F9B61F',
  advertenciaSuave: '#2A2008',
  advertenciaBorde: '#5A4210',
  advertenciaRelleno: '#F9B61F',
  peligro: '#FF9DB0',
  peligroSuave: '#3A1420',
  peligroFuerte: '#EF2D57',
  info: '#7CC8E8',
  infoSuave: '#0E2A36',
} as const;

const marca: Escena = {
  ...estadosSobreNavy,
  // Sobre navy, los avisos van en el color del campo con el borde del estado.
  advertenciaSuave: navy[700],
  advertenciaBorde: estadosSobreNavy.advertencia,
  suelo: navy[800],
  fondo: navy[700],
  superficie: navy[700],
  campo: navy[700],
  bordeCampo: azul.cielo,
  borde: navy[600],
  texto: neutro.blanco,
  textoSecundario: navy[200],
  primario: azul.cielo,
  primarioSuave: navy[900],
  sobrePrimario: navy[900],
  accion: azul.cielo,
  sobreAccion: navy[900],
  // El punto del logo va en su azul exacto también sobre navy (como el ícono).
  acento: azul.logo,
  sobreAcento: neutro.blanco,
  deshabilitado: navy[600],
  sobreDeshabilitado: navy[200],
  velo: 'rgba(0, 0, 0, 0.6)',
  traza: navy[600],
  nodo: navy[400],
  marca: navy[700],
  sobreMarca: neutro.blanco,
};

const oscuro: Escena = {
  ...marca,
  suelo: navy[950],
  fondo: navy[900],
  superficie: navy[800],
  borde: navy[700],
  texto: '#EEF3F8',
  marca: navy[900],
};

export const navyCilog: Paleta = {
  nombre: 'Navy Cilog',
  claro,
  oscuro,
  marca,
};
