import {paleta} from './paleta';

const comun = {
  espaciado: {xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32},
  radio: {sm: 6, md: 10, lg: 16, pill: 999},
  tipografia: {
    familia: {regular: 'Rubik-Regular', negrita: 'Rubik-Bold'},
    tamano: {pie: 12, cuerpo: 14, subtitulo: 16, titulo: 22, display: 28},
  },
  gap: (multiplo: number) => multiplo * 4,
} as const;

export const temaClaro = {
  ...comun,
  colores: {
    fondo: paleta.blanco,
    superficie: '#F4F7F7',
    texto: paleta.negro,
    textoSecundario: '#566567',
    borde: paleta.base[50],
    primario: paleta.base[500],
    sobrePrimario: paleta.blanco,
    exito: paleta.verde[600],
    advertencia: paleta.amarillo[500],
    peligro: paleta.rojo[600],
    info: paleta.azul[600],
    deshabilitado: '#E3E8E8',
    sobreDeshabilitado: '#8A9698',
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
    primario: paleta.base[300],
    sobrePrimario: '#06181A',
    exito: paleta.verde[500],
    advertencia: paleta.amarillo[400],
    peligro: paleta.rojo[500],
    info: paleta.azul[500],
    deshabilitado: paleta.base[800],
    sobreDeshabilitado: '#6D8083',
  },
} as const;
