import {Pressable, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Texto} from './Texto';

type Opcion<T extends string> = {valor: T; titulo: string; cantidad?: number};

type Props<T extends string> = {
  opciones: readonly Opcion<T>[];
  valor: T;
  alCambiar: (valor: T) => void;
};

/** Filtro de pocas opciones excluyentes (pendientes, gestionadas, todas). */
export function Segmentos<T extends string>({
  opciones,
  valor,
  alCambiar,
}: Props<T>) {
  return (
    <View accessibilityRole="tablist" style={styles.contenedor}>
      {opciones.map(opcion => {
        const elegida = opcion.valor === valor;
        const titulo =
          opcion.cantidad === undefined
            ? opcion.titulo
            : `${opcion.titulo} ${opcion.cantidad}`;
        return (
          <Pressable
            key={opcion.valor}
            accessibilityLabel={titulo}
            accessibilityRole="tab"
            accessibilityState={{selected: elegida}}
            style={[styles.opcion, elegida && styles.elegida]}
            onPress={() => alCambiar(opcion.valor)}>
            <Texto
              negrita={elegida}
              numberOfLines={1}
              tono={elegida ? 'normal' : 'secundario'}
              variante="etiqueta">
              {titulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  contenedor: {
    flexDirection: 'row',
    backgroundColor: tema.colores.superficie,
    borderRadius: tema.radio.md,
    padding: tema.espaciado.xs,
    gap: tema.espaciado.xs,
  },
  opcion: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tema.radio.sm,
    paddingHorizontal: tema.espaciado.xs,
  },
  elegida: {
    backgroundColor: tema.colores.fondo,
    borderWidth: 1,
    borderColor: tema.colores.borde,
  },
}));
