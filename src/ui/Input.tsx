import {type ComponentRef, type Ref, useState} from 'react';
import {Pressable, TextInput, type TextInputProps, View} from 'react-native';
import {StyleSheet, useUnistyles} from 'react-native-unistyles';

import {Texto} from './Texto';

type Props = TextInputProps & {
  etiqueta: string;
  error?: string | undefined;
  ayuda?: string;
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

export function Input({
  etiqueta,
  error,
  ayuda,
  secureTextEntry,
  onFocus,
  onBlur,
  ref,
  ...resto
}: Props) {
  const {theme} = useUnistyles();
  const [enfocado, setEnfocado] = useState(false);
  const [oculto, setOculto] = useState(true);
  const esClave = Boolean(secureTextEntry);
  styles.useVariants({enfocado, conError: Boolean(error)});

  return (
    <View style={styles.contenedor}>
      <Texto variante="pie" tono="secundario" negrita>
        {etiqueta}
      </Texto>
      <View style={styles.campo}>
        <TextInput
          ref={ref}
          accessibilityLabel={etiqueta}
          placeholderTextColor={theme.colores.sobreDeshabilitado}
          secureTextEntry={esClave && oculto}
          style={styles.entrada}
          onBlur={evento => {
            setEnfocado(false);
            onBlur?.(evento);
          }}
          onFocus={evento => {
            setEnfocado(true);
            onFocus?.(evento);
          }}
          {...resto}
        />
        {esClave ? (
          <Pressable
            accessibilityLabel={oculto ? 'Mostrar clave' : 'Ocultar clave'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setOculto(valor => !valor)}>
            <Texto variante="pie" tono="primario" negrita>
              {oculto ? 'Mostrar' : 'Ocultar'}
            </Texto>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Texto accessibilityRole="alert" variante="pie" tono="peligro">
          {error}
        </Texto>
      ) : ayuda ? (
        <Texto variante="pie" tono="secundario">
          {ayuda}
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  contenedor: {gap: tema.espaciado.xs},
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderRadius: tema.radio.md,
    paddingHorizontal: tema.espaciado.md,
    backgroundColor: tema.colores.fondo,
    borderColor: tema.colores.borde,
    variants: {
      enfocado: {
        true: {borderColor: tema.colores.primario},
        false: {},
      },
      conError: {
        true: {borderColor: tema.colores.peligro},
        false: {},
      },
    },
  },
  entrada: {
    flex: 1,
    paddingVertical: tema.espaciado.sm,
    color: tema.colores.texto,
    fontFamily: tema.tipografia.familia.regular,
    fontSize: tema.tipografia.tamano.cuerpo,
  },
}));
