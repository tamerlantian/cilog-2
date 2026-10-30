import {useMemo, useState} from 'react';
import {FlatList, Modal, Pressable, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StyleSheet} from 'react-native-unistyles';

import {Buscador} from './Buscador';
import {Encabezado} from './Encabezado';
import {Check, ChevronRight, CircleAlert} from './iconos';
import {Icono} from './Icono';
import {Pantalla} from './Pantalla';
import {Texto} from './Texto';

type Opcion = {valor: string; titulo: string};

type Props = {
  etiqueta: string;
  opciones: readonly Opcion[];
  valor: string;
  alCambiar: (valor: string) => void;
  /** Lo que se ve sin nada elegido. */
  vacio?: string;
  error?: string | undefined;
  /** Con muchas opciones, un buscador arriba de la lista. */
  buscable?: boolean;
  /** Permite volver a "sin elegir" (campos opcionales). */
  opcional?: boolean;
};

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Campo que abre una lista a pantalla completa para elegir una opción. */
export function Selector({
  etiqueta,
  opciones,
  valor,
  alCambiar,
  vacio = 'Elegir',
  error,
  buscable = false,
  opcional = false,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const elegida = opciones.find(opcion => opcion.valor === valor);
  styles.useVariants({conError: Boolean(error), vacio: !elegida});

  const visibles = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    const filtradas = texto
      ? opciones.filter(opcion => normalizar(opcion.titulo).includes(texto))
      : opciones;
    return opcional && !texto
      ? [{valor: '', titulo: 'Sin especificar'}, ...filtradas]
      : filtradas;
  }, [opciones, busqueda, opcional]);

  const cerrar = () => {
    setAbierto(false);
    setBusqueda('');
  };

  return (
    <View style={styles.contenedor}>
      <Texto style={styles.etiqueta} variante="etiqueta">
        {etiqueta}
      </Texto>
      <Pressable
        accessibilityLabel={`${etiqueta}: ${elegida?.titulo ?? vacio}`}
        accessibilityRole="button"
        style={styles.campo}
        onPress={() => setAbierto(true)}>
        <Texto numberOfLines={1} style={styles.valor}>
          {elegida?.titulo ?? vacio}
        </Texto>
        <Icono color="textoSecundario" icono={ChevronRight} />
      </Pressable>
      {error ? (
        <View style={styles.mensaje}>
          <Icono color="peligro" icono={CircleAlert} tamano={14} />
          <Texto accessibilityRole="alert" tono="peligro" variante="etiqueta">
            {error}
          </Texto>
        </View>
      ) : null}

      <Modal animationType="slide" visible={abierto} onRequestClose={cerrar}>
        <SafeAreaProvider>
          <Pantalla>
            <Encabezado
              alVolver={cerrar}
              tipoVolver="cerrar"
              titulo={etiqueta}
            />
            {buscable ? (
              <View style={styles.buscador}>
                <Buscador
                  alCambiar={setBusqueda}
                  etiqueta={`Buscar ${etiqueta.toLowerCase()}`}
                  valor={busqueda}
                />
              </View>
            ) : null}
            <FlatList
              data={visibles}
              keyboardShouldPersistTaps="handled"
              keyExtractor={opcion => opcion.valor || 'vacio'}
              renderItem={({item}) => {
                const actual = item.valor === valor;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{selected: actual}}
                    style={({pressed}) => [
                      styles.opcion,
                      pressed && styles.presionada,
                    ]}
                    onPress={() => {
                      alCambiar(item.valor);
                      cerrar();
                    }}>
                    <Texto negrita={actual} style={styles.textoOpcion}>
                      {item.titulo}
                    </Texto>
                    {actual ? <Icono color="primario" icono={Check} /> : null}
                  </Pressable>
                );
              }}
            />
          </Pantalla>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  contenedor: {gap: tema.espaciado.xs + 2},
  etiqueta: {
    color: tema.colores.textoSecundario,
    variants: {
      conError: {true: {color: tema.colores.peligro}, false: {}},
      vacio: {true: {}, false: {}},
    },
  },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.sm,
    minHeight: tema.alto.control,
    borderWidth: 1.5,
    borderRadius: tema.radio.md,
    paddingHorizontal: tema.espaciado.md + 2,
    backgroundColor: tema.colores.fondo,
    borderColor: tema.colores.borde,
    variants: {
      conError: {true: {borderColor: tema.colores.peligro}, false: {}},
      vacio: {true: {}, false: {}},
    },
  },
  valor: {
    flex: 1,
    variants: {
      vacio: {true: {color: tema.colores.sobreDeshabilitado}, false: {}},
      conError: {true: {}, false: {}},
    },
  },
  mensaje: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.xs + 2,
  },
  buscador: {
    paddingHorizontal: tema.espaciado.lg,
    paddingBottom: tema.espaciado.sm,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.sm,
    minHeight: tema.alto.control,
    paddingHorizontal: tema.espaciado.lg,
    borderBottomWidth: 1,
    borderBottomColor: tema.colores.superficie,
  },
  textoOpcion: {flex: 1},
  presionada: {backgroundColor: tema.colores.superficie},
}));
