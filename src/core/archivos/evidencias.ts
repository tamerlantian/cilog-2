import {
  copyFile,
  DocumentDirectoryPath,
  exists,
  getFSInfo,
  mkdir,
  moveFile,
  stat,
  unlink,
} from '@dr.pogodin/react-native-fs';

/**
 * Fotos y firmas de las entregas. Viven en documentos de la app, no en la
 * caché: el sistema borra la caché cuando le falta espacio y la app anterior
 * perdía evidencias así (docs/offline.md §8).
 */
const CARPETA = `${DocumentDirectoryPath}/evidencias`;

/** Antes de abrir la cámara: por debajo de esto, la foto podría no guardarse. */
export const ESPACIO_MINIMO_BYTES = 50 * 1024 * 1024;

const sinEsquema = (uri: string) => uri.replace(/^file:\/\//, '');

export const hayEspacioParaEvidencias = async () => {
  try {
    const {freeSpace} = await getFSInfo();
    return freeSpace >= ESPACIO_MINIMO_BYTES;
  } catch {
    // Si el sistema no lo informa, no se bloquea al conductor.
    return true;
  }
};

/**
 * Mueve el archivo temporal (cámara o firma) a la carpeta de evidencias con
 * un nombre único. Devuelve la ruta definitiva y su tamaño.
 */
export const guardarEvidencia = async (
  origen: string,
  nombre: string,
  extension: 'jpg' | 'png',
) => {
  if (!(await exists(CARPETA))) await mkdir(CARPETA);
  const ruta = `${CARPETA}/${nombre}.${extension}`;
  await moveFile(sinEsquema(origen), ruta);
  const {size} = await stat(ruta);
  return {ruta, bytes: Number(size)};
};

/**
 * Copia una evidencia ya guardada con otro nombre. Una entrega de varias guías
 * lleva la misma foto y firma en cada una, y cada operación borra sus propios
 * archivos al confirmarse: no pueden compartir el mismo (docs/offline.md §8).
 */
export const copiarEvidencia = async (
  origen: string,
  nombre: string,
  extension: 'jpg' | 'png',
) => {
  const ruta = `${CARPETA}/${nombre}.${extension}`;
  await copyFile(origen, ruta);
  const {size} = await stat(ruta);
  return {ruta, bytes: Number(size)};
};

/** Borra una evidencia; si ya no existe, no pasa nada. */
export const borrarEvidencia = async (ruta: string) => {
  try {
    if (await exists(ruta)) await unlink(ruta);
  } catch {
    // Un archivo que no se pudo borrar solo ocupa espacio: no frena al conductor.
  }
};

/** Para mostrar una evidencia en `<Image>`. */
export const uriEvidencia = (ruta: string) =>
  ruta.startsWith('file://') ? ruta : `file://${ruta}`;
