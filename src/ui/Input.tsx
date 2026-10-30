import {type ComponentRef, type Ref, useState} from 'react';
import {Pressable, TextInput, type TextInputProps, View} from 'react-native';
import {StyleSheet, useUnistyles} from 'react-native-unistyles';

import {CircleAlert, Eye, EyeOff} from './iconos';
import {Icono} from './Icono';
import {Texto} from './Texto';

/** Props de todo campo de correo: teclado, autocompletado y sin mayúsculas. */
export const PROPS_CORREO = {
  autoCapitalize: 'none',
  autoComplete: 'email',
  autoCorrect: false,
  keyboardType: 'email-address',
  textContentType: 'emailAddress',
} as const satisfies TextInputProps;

type Props = TextInputProps & {
  etiqueta: string;
  error?: string | undefined;
  ayuda?: string;
  /** Texto largo (descripción): varias líneas y campo más alto. */
  multilinea?: boolean;
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

export function Input({
  etiqueta,
  error,
  ayuda,
  multilinea = false,
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
  const conError = Boolean(error);
  styles.useVariants({enfocado, conError, multilinea});

  return (
    <View style={styles.contenedor}>
      <Texto style={styles.etiqueta} variante="etiqueta">
        {etiqueta}
      </Texto>
      <View style={styles.campo}>
        <TextInput
          ref={ref}
          accessibilityLabel={etiqueta}
          multiline={multilinea}
          textAlignVertical={multilinea ? 'top' : 'center'}
          placeholderTextColor={theme.colores.sobreDeshabilitado}
          secureTextEntry={esClave && oculto}
          selectionColor={theme.colores.primario}
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
            hitSlop={4}
            style={styles.ojo}
            onPress={() => setOculto(valor => !valor)}>
            <Icono
              color="textoSecundario"
              icono={oculto ? Eye : EyeOff}
              tamano={20}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.mensaje}>
          <Icono color="peligro" icono={CircleAlert} tamano={14} />
          <Texto accessibilityRole="alert" tono="peligro" variante="etiqueta">
            {error}
          </Texto>
        </View>
      ) : ayuda ? (
        <Texto tono="secundario" variante="etiqueta">
          {ayuda}
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  contenedor: {gap: tema.espaciado.xs + 2},
  etiqueta: {
    color: tema.colores.textoSecundario,
    variants: {
      enfocado: {true: {color: tema.colores.primario}, false: {}},
      conError: {true: {color: tema.colores.peligro}, false: {}},
    },
  },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tema.alto.control,
    borderWidth: 1.5,
    borderRadius: tema.radio.md,
    paddingLeft: tema.espaciado.md + 2,
    paddingRight: tema.espaciado.xs,
    backgroundColor: tema.colores.fondo,
    borderColor: tema.colores.borde,
    variants: {
      enfocado: {
        true: {borderColor: tema.colores.primario, borderWidth: 2},
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
    paddingRight: tema.espaciado.sm,
    color: tema.colores.texto,
    fontFamily: tema.tipografia.familia.regular,
    fontSize: tema.tipografia.tamano.cuerpo,
    variants: {
      multilinea: {
        true: {minHeight: 120, paddingTop: tema.espaciado.md},
        false: {},
      },
    },
  },
  ojo: {
    width: tema.alto.botonCompacto,
    height: tema.alto.botonCompacto,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mensaje: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.xs + 2,
  },
}));
