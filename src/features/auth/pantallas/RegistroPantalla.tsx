import {zodResolver} from '@hookform/resolvers/zod';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {type ComponentRef, useRef, useState} from 'react';
import {Controller, useForm, type Control} from 'react-hook-form';
import {type TextInput, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Boton, EstadoVacio, Input, Pantalla, Texto} from '@/ui';

import {esquemaFormularioRegistro, type FormularioRegistro} from '../esquemas';
import type {RutasAuth} from '../rutas';
import {useRegistrar} from '../useSolicitudes';

type Campo = {
  nombre: keyof FormularioRegistro;
  etiqueta: string;
  props?: Partial<React.ComponentProps<typeof Input>>;
};

const CAMPOS: Campo[] = [
  {
    nombre: 'nombres',
    etiqueta: 'Nombres',
    props: {autoComplete: 'given-name', textContentType: 'givenName'},
  },
  {
    nombre: 'apellidos',
    etiqueta: 'Apellidos',
    props: {autoComplete: 'family-name', textContentType: 'familyName'},
  },
  {
    nombre: 'numeroIdentificacion',
    etiqueta: 'Número de identificación',
    props: {keyboardType: 'number-pad'},
  },
  {
    nombre: 'email',
    etiqueta: 'Correo',
    props: {
      autoCapitalize: 'none',
      autoComplete: 'email',
      autoCorrect: false,
      keyboardType: 'email-address',
      textContentType: 'emailAddress',
    },
  },
  {
    nombre: 'clave',
    etiqueta: 'Clave',
    props: {
      autoCapitalize: 'none',
      secureTextEntry: true,
      textContentType: 'newPassword',
    },
  },
  {
    nombre: 'confirmarClave',
    etiqueta: 'Confirmar clave',
    props: {
      autoCapitalize: 'none',
      secureTextEntry: true,
      textContentType: 'newPassword',
    },
  },
];

export function RegistroPantalla() {
  const navigation = useNavigation<NativeStackNavigationProp<RutasAuth>>();
  const refs = useRef<Record<string, ComponentRef<typeof TextInput> | null>>(
    {},
  );
  const [correoRegistrado, setCorreoRegistrado] = useState<string | null>(null);
  const {mutate, isPending} = useRegistrar();
  const {control, handleSubmit} = useForm<FormularioRegistro>({
    resolver: zodResolver(esquemaFormularioRegistro),
    defaultValues: {
      nombres: '',
      apellidos: '',
      numeroIdentificacion: '',
      email: '',
      clave: '',
      confirmarClave: '',
    },
  });

  const enviar = () =>
    handleSubmit(datos => {
      mutate(
        {
          nombres: datos.nombres,
          apellidos: datos.apellidos,
          numeroIdentificacion: datos.numeroIdentificacion,
          email: datos.email,
          clave: datos.clave,
        },
        {onSuccess: () => setCorreoRegistrado(datos.email)},
      );
    })();

  if (correoRegistrado) {
    return (
      <Pantalla>
        <EstadoVacio
          accion={{
            titulo: 'Ir a iniciar sesión',
            alPresionar: () => navigation.navigate('Login'),
          }}
          mensaje={`Enviamos un enlace de verificación a ${correoRegistrado}. Ábrelo para activar tu cuenta y luego inicia sesión.`}
          titulo="Revisa tu correo"
        />
      </Pantalla>
    );
  }

  return (
    <Pantalla desplazable>
      <View style={styles.encabezado}>
        <Texto variante="titulo" negrita tono="primario">
          Crear cuenta
        </Texto>
        <Texto tono="secundario">
          Te enviaremos un correo para verificarla.
        </Texto>
      </View>

      {CAMPOS.map((campo, indice) => {
        const siguiente = CAMPOS[indice + 1];
        return (
          <CampoRegistro
            key={campo.nombre}
            campo={campo}
            control={control}
            alEnviar={() =>
              siguiente ? refs.current[siguiente.nombre]?.focus() : enviar()
            }
            referencia={instancia => {
              refs.current[campo.nombre] = instancia;
            }}
            ultimo={!siguiente}
          />
        );
      })}

      <Boton cargando={isPending} titulo="Crear cuenta" onPress={enviar} />
      <Boton
        tipo="texto"
        titulo="Ya tengo cuenta"
        onPress={() => navigation.navigate('Login')}
      />
    </Pantalla>
  );
}

type PropsCampo = {
  campo: Campo;
  control: Control<FormularioRegistro>;
  alEnviar: () => void;
  referencia: (instancia: ComponentRef<typeof TextInput> | null) => void;
  ultimo: boolean;
};

function CampoRegistro({
  campo,
  control,
  alEnviar,
  referencia,
  ultimo,
}: PropsCampo) {
  return (
    <Controller
      control={control}
      name={campo.nombre}
      render={({field, fieldState}) => (
        <Input
          ref={referencia}
          error={fieldState.error?.message}
          etiqueta={campo.etiqueta}
          returnKeyType={ultimo ? 'done' : 'next'}
          value={field.value}
          onBlur={field.onBlur}
          onChangeText={field.onChange}
          onSubmitEditing={alEnviar}
          {...campo.props}
        />
      )}
    />
  );
}

const styles = StyleSheet.create(tema => ({
  encabezado: {gap: tema.espaciado.xs, paddingTop: tema.espaciado.xl},
}));
