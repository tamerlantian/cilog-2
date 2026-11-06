import {Pressable, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {CircleAlert} from './iconos';
import {Icono} from './Icono';
import {Texto} from './Texto';

type Opcion = {valor: string; titulo: string};

type Props = {
  /** La pregunta, arriba de las opciones ("¿Qué pasó?"). */
  etiqueta: string;
  opciones: readonly Opcion[];
  valor: string;
  alCambiar: (valor: string) => void;
  error?: string | undefined;
  /** Color de la opción elegida: `advertencia` para novedades. */
  tono?: 'primario' | 'advertencia';
};

/** Opciones a la vista, una por tarjeta, para elegir con un toque. Para listas cortas. */
export function ListaOpciones({
  etiqueta,
  opciones,
  valor,
  alCambiar,
  error,
  tono = 'primario',
}: Props) {
  return (
    <View accessibilityRole="radiogroup" style={styles.contenedor}>
      <Texto style={styles.pregunta} variante="titulo">
        {etiqueta}
      </Texto>
      {opciones.map(opcion => {
        const elegida = opcion.valor === valor;
        return (
          <Pressable
            key={opcion.valor}
            accessibilityLabel={opcion.titulo}
            accessibilityRole="radio"
            accessibilityState={{checked: elegida}}
            style={({pressed}) => [
              styles.opcion,
              elegida &&
                (tono === 'advertencia'
                  ? styles.elegidaAdvertencia
                  : styles.elegidaPrimario),
              pressed && styles.presionada,
            ]}
            onPress={() => alCambiar(opcion.valor)}>
            <View
              style={[
                styles.radio,
                elegida &&
                  (tono === 'advertencia'
                    ? styles.radioAdvertencia
                    : styles.radioPrimario),
              ]}>
              {elegida ? (
                <View
                  style={[
                    styles.punto,
                    tono === 'advertencia'
                      ? styles.puntoAdvertencia
                      : styles.puntoPrimario,
                  ]}
                />
              ) : null}
            </View>
            <Texto
              negrita={elegida}
              style={styles.titulo}
              tono={elegida ? tono : 'normal'}>
              {opcion.titulo}
            </Texto>
          </Pressable>
        );
      })}
      {error ? (
        <View style={styles.mensaje}>
          <Icono color="peligro" icono={CircleAlert} tamano={14} />
          <Texto accessibilityRole="alert" tono="peligro" variante="etiqueta">
            {error}
          </Texto>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  contenedor: {gap: tema.espaciado.sm},
  pregunta: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.6,
    marginBottom: tema.espaciado.xs,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.md,
    minHeight: 54,
    paddingHorizontal: tema.espaciado.md + 2,
    borderRadius: tema.radio.md,
    borderWidth: 1,
    borderColor: tema.colores.bordeCampo,
    backgroundColor: tema.colores.campo,
  },
  elegidaPrimario: {
    borderWidth: 2,
    borderColor: tema.colores.primario,
    backgroundColor: tema.colores.primarioSuave,
  },
  elegidaAdvertencia: {
    borderWidth: 2,
    borderColor: tema.colores.advertencia,
    backgroundColor: tema.colores.advertenciaSuave,
  },
  presionada: {opacity: 0.85},
  radio: {
    width: 20,
    height: 20,
    borderRadius: tema.radio.pill,
    borderWidth: 2,
    borderColor: tema.colores.textoSecundario,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioPrimario: {borderColor: tema.colores.primario},
  radioAdvertencia: {borderColor: tema.colores.advertencia},
  punto: {width: 10, height: 10, borderRadius: tema.radio.pill},
  puntoPrimario: {backgroundColor: tema.colores.primario},
  puntoAdvertencia: {backgroundColor: tema.colores.advertencia},
  titulo: {flex: 1},
  mensaje: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.xs + 2,
  },
}));
