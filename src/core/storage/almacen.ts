import {createMMKV} from 'react-native-mmkv';

/** Almacenamiento clave-valor síncrono. No guardar tokens aquí: usar el llavero seguro. */
export const almacen = createMMKV({id: 'plutonio'});
