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

/**
 * En la base se guarda solo el nombre del archivo (`abc.jpg`), nunca la ruta
 * completa: en iOS la carpeta de la app cambia al reinstalar o actualizar, y
 * una ruta guardada antes apunta a una carpeta que ya no existe. La ruta se
 * arma con la carpeta actual cada vez que se usa. Las filas guardadas antes
 * de este cambio traen la ruta completa: se toma el nombre del final.
 */
const nombreDe = (ruta: string) => ruta.slice(ruta.lastIndexOf('/') + 1);

const enCarpeta = (ruta: string) => `${CARPETA}/${nombreDe(ruta)}`;

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
 * un nombre único. Devuelve el nombre con el que queda (lo que va a la base)
 * y su tamaño.
 */
export const guardarEvidencia = async (
  origen: string,
  nombre: string,
  extension: 'jpg' | 'png',
) => {
  if (!(await exists(CARPETA))) await mkdir(CARPETA);
  const ruta = `${nombre}.${extension}`;
  await moveFile(sinEsquema(origen), enCarpeta(ruta));
  const {size} = await stat(enCarpeta(ruta));
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
  const ruta = `${nombre}.${extension}`;
  await copyFile(enCarpeta(origen), enCarpeta(ruta));
  const {size} = await stat(enCarpeta(ruta));
  return {ruta, bytes: Number(size)};
};

/** Borra una evidencia; si ya no existe, no pasa nada. */
export const borrarEvidencia = async (ruta: string) => {
  try {
    if (await exists(enCarpeta(ruta))) await unlink(enCarpeta(ruta));
  } catch {
    // Un archivo que no se pudo borrar solo ocupa espacio: no frena al conductor.
  }
};

/** Si la evidencia sigue en el teléfono (antes de enviarla). */
export const existeEvidencia = (ruta: string) => exists(enCarpeta(ruta));

/** Para mostrar o enviar una evidencia (`<Image>`, multipart). */
export const uriEvidencia = (ruta: string) => `file://${enCarpeta(ruta)}`;
