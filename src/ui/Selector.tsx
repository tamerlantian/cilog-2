import {useMemo, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  View,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {StyleSheet} from 'react-native-unistyles';

import {Buscador} from './Buscador';
import {Check, ChevronRight, CircleAlert} from './iconos';
import {Icono} from './Icono';
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
  /** Título de la hoja; por defecto, la etiqueta. */
  pregunta?: string;
  /** Valores que van primero, en "Más usados", mientras no se busca. */
  destacadas?: readonly string[];
};

type Fila = {clave: string; seccion?: string; opcion?: Opcion};

const SIN_DESTACADAS: readonly string[] = [];

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Campo que abre una hoja desde abajo con la lista de opciones. */
export function Selector({
  etiqueta,
  opciones,
  valor,
  alCambiar,
  vacio = 'Elegir',
  error,
  buscable = false,
  opcional = false,
  pregunta = etiqueta,
  destacadas = SIN_DESTACADAS,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const elegida = opciones.find(opcion => opcion.valor === valor);
  styles.useVariants({conError: Boolean(error), vacio: !elegida});

  const filas = useMemo((): Fila[] => {
    const texto = normalizar(busqueda.trim());
    const fila = (opcion: Opcion): Fila => ({
      clave: opcion.valor || 'vacio',
      opcion,
    });
    if (texto) {
      return opciones
        .filter(opcion => normalizar(opcion.titulo).includes(texto))
        .map(fila);
    }
    const vacia = opcional
      ? [fila({valor: '', titulo: 'Sin especificar'})]
      : [];
    const arriba = opciones.filter(o => destacadas.includes(o.valor));
    if (arriba.length === 0) return [...vacia, ...opciones.map(fila)];
    return [
      ...vacia,
      {clave: 'seccion-usados', seccion: 'Más usados'},
      ...arriba.map(fila),
      {clave: 'seccion-todos', seccion: 'Todos'},
      ...opciones.filter(o => !destacadas.includes(o.valor)).map(fila),
    ];
  }, [opciones, busqueda, opcional, destacadas]);

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

      <Modal
        animationType="slide"
        statusBarTranslucent
        transparent
        visible={abierto}
        onRequestClose={cerrar}>
        <SafeAreaProvider>
          <KeyboardAvoidingView behavior="padding" style={styles.raizHoja}>
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              style={styles.velo}
              onPress={cerrar}
            />
            <SafeAreaView edges={['bottom']} style={styles.hoja}>
              <View style={styles.agarradera} />
              <View style={styles.cabeceraHoja}>
                <Texto accessibilityRole="header" negrita variante="subtitulo">
                  {pregunta}
                </Texto>
                {buscable ? (
                  <Buscador
                    alCambiar={setBusqueda}
                    etiqueta={`Buscar entre ${opciones.length} opciones`}
                    valor={busqueda}
                  />
                ) : null}
              </View>
              <FlatList
                contentContainerStyle={styles.lista}
                data={filas}
                keyboardShouldPersistTaps="handled"
                keyExtractor={fila => fila.clave}
                renderItem={({item}) => {
                  if (!item.opcion) {
                    return (
                      <Texto
                        negrita
                        style={styles.seccion}
                        tono="secundario"
                        variante="pie">
                        {item.seccion?.toUpperCase()}
                      </Texto>
                    );
                  }
                  const opcion = item.opcion;
                  const actual = opcion.valor === valor;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{selected: actual}}
                      style={({pressed}) => [
                        styles.opcion,
                        actual && styles.actual,
                        pressed && styles.presionada,
                      ]}
                      onPress={() => {
                        alCambiar(opcion.valor);
                        cerrar();
                      }}>
                      <Texto
                        negrita={actual}
                        style={styles.textoOpcion}
                        tono={actual ? 'primario' : 'normal'}>
                        {opcion.titulo}
                      </Texto>
                      {actual ? <Icono color="primario" icono={Check} /> : null}
                    </Pressable>
                  );
                }}
              />
            </SafeAreaView>
          </KeyboardAvoidingView>
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
  raizHoja: {flex: 1, justifyContent: 'flex-end'},
  velo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: tema.colores.velo,
  },
  hoja: {
    maxHeight: '82%',
    paddingTop: tema.espaciado.sm + 2,
    borderTopLeftRadius: tema.radio.xl,
    borderTopRightRadius: tema.radio.xl,
    backgroundColor: tema.colores.fondo,
  },
  agarradera: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    marginBottom: tema.espaciado.md + 2,
    borderRadius: tema.radio.pill,
    backgroundColor: tema.colores.borde,
  },
  cabeceraHoja: {
    gap: tema.espaciado.md,
    paddingHorizontal: tema.espaciado.lg + 4,
  },
  lista: {
    paddingHorizontal: tema.espaciado.sm,
    paddingTop: tema.espaciado.md,
    paddingBottom: tema.espaciado.lg,
  },
  seccion: {
    paddingHorizontal: tema.espaciado.md,
    paddingTop: tema.espaciado.md,
    paddingBottom: tema.espaciado.xs + 2,
    letterSpacing: 0.6,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.sm,
    minHeight: tema.alto.control,
    paddingHorizontal: tema.espaciado.md,
    borderRadius: tema.radio.md - 2,
  },
  actual: {backgroundColor: tema.colores.primarioSuave},
  textoOpcion: {flex: 1},
  presionada: {backgroundColor: tema.colores.superficie},
}));
