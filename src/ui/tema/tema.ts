import {type Escena, FIRMA, PALETA_ACTIVA} from './paletas';

// Este archivo no lleva colores: salen de `paletas/` (ESLint lo hace cumplir).

const comun = {
  espaciado: {xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32},
  radio: {sm: 8, md: 14, lg: 18, xl: 28, pill: 999},
  /** Alturas mínimas de toque: el conductor usa la app de pie, con una mano. */
  alto: {control: 52, boton: 56, botonCompacto: 44},
  /**
   * Inter para leer, Space Grotesk para títulos y JetBrains Mono para códigos
   * (número de despacho, guía). Los nombres son los de los .ttf en
   * `src/assets/fonts`: Android elige la fuente por el nombre del archivo.
   */
  tipografia: {
    familia: {
      regular: 'Inter-Regular',
      media: 'Inter-Medium',
      negrita: 'Inter-SemiBold',
      titulo: 'SpaceGrotesk-Bold',
      mono: 'JetBrainsMono-Medium',
    },
    tamano: {
      pie: 12,
      etiqueta: 13,
      cuerpo: 15,
      /** Texto que se escribe en un campo: 16 para leerlo de pie y en movimiento. */
      campo: 16,
      subtitulo: 20,
      titulo: 30,
      display: 34,
      /** Nombre de la app en el login. */
      marca: 44,
    },
  },
} as const;

/** Arma un tema de unistyles a partir de una escena de la paleta. */
function crearTema(escena: Escena) {
  return {...comun, colores: {...escena, ...FIRMA}};
}

export type Tema = ReturnType<typeof crearTema>;

export const temaClaro: Tema = crearTema(PALETA_ACTIVA.claro);
export const temaOscuro: Tema = crearTema(PALETA_ACTIVA.oscuro);
/** Superficie de marca (portada del login, tarjeta destacada); igual en claro y oscuro. */
export const temaMarca: Tema = crearTema(PALETA_ACTIVA.marca);

export type ColorTema = keyof Tema['colores'];
