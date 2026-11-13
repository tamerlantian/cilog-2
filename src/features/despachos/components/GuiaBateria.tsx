import {Modal, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {
  BatteryWarning,
  Boton,
  BotonIcono,
  IconoDestacado,
  Pantalla,
  Tarjeta,
  Texto,
  X,
} from '@/ui';

import type {GuiaBateria as Guia} from '../domain/rastreo';

type Props = {
  visible: boolean;
  guia: Guia;
  alAbrirAjustes: () => void;
  alTerminar: () => void;
  alCerrar: () => void;
};

/** Cómo sacar a Cilog del ahorro de batería en la marca de este teléfono. */
export function GuiaBateria({
  visible,
  guia,
  alAbrirAjustes,
  alTerminar,
  alCerrar,
}: Props) {
  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent
      statusBarTranslucent
      visible={visible}
      onRequestClose={alCerrar}>
      <Pantalla
        desplazable
        estiloContenido={styles.pantalla}
        pie={
          <View style={styles.acciones}>
            <Boton titulo="Abrir ajustes" onPress={alAbrirAjustes} />
            <Boton tipo="texto" titulo="Ya lo hice" onPress={alTerminar} />
          </View>
        }>
        <View style={styles.cerrar}>
          <BotonIcono etiqueta="Cerrar" icono={X} onPress={alCerrar} />
        </View>
        <View style={styles.contenido}>
          <IconoDestacado icono={BatteryWarning} tono="advertencia" />
          <Texto accessibilityRole="header" variante="titulo">
            Que tu teléfono no apague Cilog en la ruta
          </Texto>
          <Texto tono="secundario">
            Algunos teléfonos cierran las apps con la pantalla apagada para
            ahorrar batería. Si pasa, la empresa deja de verte hasta que vuelvas
            a abrir Cilog.
          </Texto>
          <Tarjeta>
            <Texto media tono="secundario" variante="etiqueta">
              {`En tu ${guia.marca}`}
            </Texto>
            {guia.pasos.map((paso, indice) => (
              <View key={paso} style={styles.paso}>
                <View style={styles.numero}>
                  <Texto mono variante="pie">
                    {indice + 1}
                  </Texto>
                </View>
                <Texto style={styles.textoPaso}>{paso}</Texto>
              </View>
            ))}
          </Tarjeta>
        </View>
      </Pantalla>
    </Modal>
  );
}

const styles = StyleSheet.create(tema => ({
  // Mismo margen lateral que el pie, para que todo quede alineado.
  pantalla: {
    paddingHorizontal: tema.espaciado.xl,
    paddingTop: tema.espaciado.sm,
  },
  cerrar: {alignItems: 'flex-start', marginLeft: -tema.espaciado.sm},
  contenido: {gap: tema.espaciado.lg},
  paso: {flexDirection: 'row', gap: tema.espaciado.md},
  numero: {
    width: 24,
    height: 24,
    borderRadius: tema.radio.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tema.colores.infoSuave,
  },
  textoPaso: {flex: 1},
  acciones: {gap: tema.espaciado.xs},
}));
