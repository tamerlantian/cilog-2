import {paleta} from './paleta';

const comun = {
  espaciado: {xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32},
  radio: {sm: 8, md: 14, lg: 18, xl: 28, pill: 999},
  /** Alturas mínimas de toque: el conductor usa la app de pie, con una mano. */
  alto: {control: 52, boton: 56, botonCompacto: 44},
  tipografia: {
    familia: {regular: 'Rubik-Regular', negrita: 'Rubik-Bold'},
    tamano: {
      pie: 12,
      etiqueta: 13,
      cuerpo: 15,
      subtitulo: 20,
      titulo: 26,
      display: 34,
    },
  },
} as const;

/**
 * `marca` es el verde de Cilog en ambos temas (encabezados de marca).
 * `exito`, `advertencia` y `peligro` son para texto e íconos sobre `fondo`
 * (pasan contraste 4.5:1). Las variantes `*Suave` son fondos para chips y avisos.
 */
export const temaClaro = {
  ...comun,
  colores: {
    fondo: paleta.blanco,
    superficie: '#F4F7F7',
    texto: paleta.negro,
    textoSecundario: '#566567',
    borde: paleta.base[50],
    primario: paleta.base[500],
    primarioSuave: '#DCEBEC',
    sobrePrimario: paleta.blanco,
    marca: paleta.base[500],
    sobreMarca: paleta.blanco,
    sobreMarcaSecundario: paleta.base[50],
    acento: paleta.amarillo[400],
    sobreAcento: paleta.base[900],
    exito: '#146C2E',
    exitoSuave: '#E2F4E6',
    advertencia: '#7A4F00',
    advertenciaSuave: '#FDF6E6',
    advertenciaBorde: '#F2D8A0',
    peligro: '#A3193F',
    peligroSuave: '#FCE6EB',
    peligroFuerte: paleta.rojo[700],
    info: '#0B5F7E',
    infoSuave: '#E3F1F7',
    deshabilitado: '#E3E8E8',
    sobreDeshabilitado: '#5E6C6E',
    velo: 'rgba(13, 13, 13, 0.45)',
  },
} as const;

export const temaOscuro = {
  ...comun,
  colores: {
    fondo: '#0B1516',
    superficie: paleta.base[900],
    texto: '#EEF3F3',
    textoSecundario: '#9DB0B2',
    borde: paleta.base[700],
    primario: '#5FB8BE',
    primarioSuave: '#123A3D',
    sobrePrimario: '#06181A',
    marca: paleta.base[600],
    sobreMarca: paleta.blanco,
    sobreMarcaSecundario: paleta.base[50],
    acento: paleta.amarillo[400],
    sobreAcento: paleta.base[900],
    exito: '#4ADE80',
    exitoSuave: '#10331A',
    advertencia: '#F9B61F',
    advertenciaSuave: '#2A2008',
    advertenciaBorde: '#5A4210',
    peligro: '#FF8FA8',
    peligroSuave: '#3A1420',
    peligroFuerte: paleta.rojo[500],
    info: '#7CC8E8',
    infoSuave: '#0E2A36',
    deshabilitado: paleta.base[800],
    sobreDeshabilitado: '#8A9C9E',
    velo: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export type ColorTema = keyof typeof temaClaro.colores;
