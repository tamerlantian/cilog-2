import {createMMKV} from 'react-native-mmkv';

/** Almacenamiento clave-valor síncrono. No guardar tokens aquí: usar el llavero seguro. */
export const almacen = createMMKV({id: 'plutonio'});

/** Adaptador para `persist` de zustand. */
export const almacenZustand = {
  getItem: (nombre: string) => almacen.getString(nombre) ?? null,
  setItem: (nombre: string, valor: string) => almacen.set(nombre, valor),
  removeItem: (nombre: string) => {
    almacen.remove(nombre);
  },
};
