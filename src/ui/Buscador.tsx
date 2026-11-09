import {Pressable, TextInput, View} from 'react-native';
import {StyleSheet, useUnistyles} from 'react-native-unistyles';

import {ScanLine, Search, X} from './iconos';
import {Icono} from './Icono';

type Props = {
  valor: string;
  alCambiar: (texto: string) => void;
  /** Lo que lee el lector de pantalla y se ve mientras está vacío. */
  etiqueta: string;
  /** Muestra el botón de escanear mientras el campo está vacío. */
  alEscanear?: () => void;
};

/** Campo de búsqueda compacto, sin etiqueta visible. */
export function Buscador({valor, alCambiar, etiqueta, alEscanear}: Props) {
  const {theme} = useUnistyles();
  return (
    <View style={styles.campo}>
      <Icono color="textoSecundario" icono={Search} tamano={18} />
      <TextInput
        accessibilityLabel={etiqueta}
        autoCorrect={false}
        placeholder={etiqueta}
        placeholderTextColor={theme.colores.sobreDeshabilitado}
        returnKeyType="search"
        selectionColor={theme.colores.primario}
        style={styles.entrada}
        value={valor}
        onChangeText={alCambiar}
      />
      {valor ? (
        <Pressable
          accessibilityLabel="Borrar búsqueda"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => alCambiar('')}>
          <Icono color="textoSecundario" icono={X} tamano={18} />
        </Pressable>
      ) : alEscanear ? (
        <Pressable
          accessibilityLabel="Escanear código"
          accessibilityRole="button"
          hitSlop={12}
          onPress={alEscanear}>
          <Icono color="primario" icono={ScanLine} tamano={24} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.sm,
    minHeight: tema.alto.control,
    borderRadius: tema.radio.lg - 2,
    borderWidth: 1,
    borderColor: tema.colores.bordeCampo,
    paddingHorizontal: tema.espaciado.md + 2,
    backgroundColor: tema.colores.campo,
  },
  entrada: {
    flex: 1,
    paddingVertical: tema.espaciado.sm,
    color: tema.colores.texto,
    fontFamily: tema.tipografia.familia.regular,
    fontSize: tema.tipografia.tamano.campo,
  },
}));
