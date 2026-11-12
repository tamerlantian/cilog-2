import {bosqueLima} from './bosqueLima';
import {cilogClasica} from './cilogClasica';
import {navyCilog} from './navyCilog';

export type {Escena, Paleta} from './tipos';

/** Todas las paletas disponibles. Las pruebas de contraste recorren esta lista. */
export const paletas = {navyCilog, bosqueLima, cilogClasica} as const;

/**
 * La paleta de la app. Para cambiarla basta con apuntar aquí a otra de `paletas`
 * (o crear un archivo nuevo junto a `navyCilog.ts` y registrarlo arriba).
 */
export const PALETA_ACTIVA = paletas.navyCilog;

/** La firma se guarda como imagen para la empresa: tinta oscura sobre blanco en toda paleta. */
export const FIRMA = {papel: '#FFFFFF', tinta: '#0D0D0D'} as const;
