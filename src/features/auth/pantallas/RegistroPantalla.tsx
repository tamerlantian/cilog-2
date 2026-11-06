import {zodResolver} from '@hookform/resolvers/zod';
import {type ComponentRef, useRef, useState} from 'react';
import {Controller, useForm, useWatch, type Control} from 'react-hook-form';
import {type TextInput, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {
  ArrowRight,
  Boton,
  Encabezado,
  Input,
  PROPS_CORREO,
  Requisito,
  Texto,
} from '@/ui';

import {CorreoEnviado} from '../components/CorreoEnviado';
import {PantallaAcceso} from '../components/PantallaAcceso';
import {
  esquemaFormularioRegistro,
  LARGO_MINIMO_CLAVE,
  type FormularioRegistro,
} from '../domain/formularios';
import {useNavegacionAuth} from '../hooks/useNavegacionAuth';
import {useRegistrar, useSolicitarCorreo} from '../hooks/useSolicitudes';

type NombreCampo = keyof FormularioRegistro;

const CAMPOS: Record<
  NombreCampo,
  {etiqueta: string; props?: Partial<React.ComponentProps<typeof Input>>}
> = {
  nombres: {
    etiqueta: 'Nombres',
    props: {autoComplete: 'given-name', textContentType: 'givenName'},
  },
  apellidos: {
    etiqueta: 'Apellidos',
    props: {autoComplete: 'family-name', textContentType: 'familyName'},
  },
  numeroIdentificacion: {
    etiqueta: 'Número de identificación',
    props: {keyboardType: 'number-pad'},
  },
  email: {etiqueta: 'Correo', props: PROPS_CORREO},
  clave: {
    etiqueta: 'Clave',
    props: {
      autoCapitalize: 'none',
      secureTextEntry: true,
      textContentType: 'newPassword',
    },
  },
  confirmarClave: {
    etiqueta: 'Confirmar clave',
    props: {
      autoCapitalize: 'none',
      secureTextEntry: true,
      textContentType: 'newPassword',
    },
  },
};

/** Orden en que el botón "siguiente" del teclado recorre los campos. */
const ORDEN: NombreCampo[] = [
  'nombres',
  'apellidos',
  'numeroIdentificacion',
  'email',
  'clave',
  'confirmarClave',
];

export function RegistroPantalla() {
  const navigation = useNavegacionAuth();
  const refs = useRef<
    Partial<Record<NombreCampo, ComponentRef<typeof TextInput> | null>>
  >({});
  const [correoRegistrado, setCorreoRegistrado] = useState<string | null>(null);
  const registro = useRegistrar();
  const reenvio = useSolicitarCorreo('reenviarVerificacion');
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
  const clave = useWatch({control, name: 'clave'});

  const enviar = () =>
    handleSubmit(datos => {
      registro.mutate(
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
      <CorreoEnviado
        alReenviar={() => reenvio.mutateAsync(correoRegistrado)}
        alVolver={() => navigation.navigate('Login')}
        reenviando={reenvio.isPending}>
        Enviamos un enlace de verificación a{' '}
        <Texto negrita>{correoRegistrado}</Texto>. Ábrelo para activar tu cuenta
        y luego inicia sesión.
      </CorreoEnviado>
    );
  }

  const campo = (nombre: NombreCampo) => {
    const siguiente = ORDEN[ORDEN.indexOf(nombre) + 1];
    return (
      <CampoRegistro
        alEnviar={() =>
          siguiente ? refs.current[siguiente]?.focus() : enviar()
        }
        control={control}
        nombre={nombre}
        referencia={instancia => {
          refs.current[nombre] = instancia;
        }}
        ultimo={!siguiente}
      />
    );
  };

  return (
    <PantallaAcceso
      desplazable
      estiloContenido={styles.contenido}
      pie={
        <>
          <Boton
            cargando={registro.isPending}
            icono={ArrowRight}
            posicionIcono="fin"
            titulo="Crear cuenta"
            onPress={enviar}
          />
          <View style={styles.filaCentrada}>
            <Texto tono="secundario">¿Ya tienes cuenta?</Texto>
            <Boton
              tamano="compacto"
              tipo="texto"
              titulo="Inicia sesión"
              onPress={() => navigation.navigate('Login')}
            />
          </View>
        </>
      }>
      <Encabezado alVolver={() => navigation.goBack()} />
      <View style={styles.formulario}>
        <View style={styles.titulo}>
          <Texto negrita variante="titulo">
            Crea tu cuenta
          </Texto>
          <Texto tono="secundario">
            Te enviaremos un correo para activarla.
          </Texto>
        </View>

        <View style={styles.dosColumnas}>
          <View style={styles.columna}>{campo('nombres')}</View>
          <View style={styles.columna}>{campo('apellidos')}</View>
        </View>
        {campo('numeroIdentificacion')}
        {campo('email')}
        <View style={styles.conRequisito}>
          {campo('clave')}
          <Requisito
            cumplido={clave.length >= LARGO_MINIMO_CLAVE}
            texto={`Al menos ${LARGO_MINIMO_CLAVE} caracteres`}
          />
        </View>
        {campo('confirmarClave')}
      </View>
    </PantallaAcceso>
  );
}

type PropsCampo = {
  nombre: NombreCampo;
  control: Control<FormularioRegistro>;
  alEnviar: () => void;
  referencia: (instancia: ComponentRef<typeof TextInput> | null) => void;
  ultimo: boolean;
};

function CampoRegistro({
  nombre,
  control,
  alEnviar,
  referencia,
  ultimo,
}: PropsCampo) {
  const {etiqueta, props} = CAMPOS[nombre];
  return (
    <Controller
      control={control}
      name={nombre}
      render={({field, fieldState}) => (
        <Input
          ref={referencia}
          error={fieldState.error?.message}
          etiqueta={etiqueta}
          returnKeyType={ultimo ? 'done' : 'next'}
          value={field.value}
          onBlur={field.onBlur}
          onChangeText={field.onChange}
          onSubmitEditing={alEnviar}
          {...props}
        />
      )}
    />
  );
}

const styles = StyleSheet.create(tema => ({
  contenido: {padding: 0, gap: 0},
  formulario: {
    gap: tema.espaciado.lg,
    paddingHorizontal: tema.espaciado.xl,
    paddingBottom: tema.espaciado.xl,
  },
  titulo: {gap: tema.espaciado.xs, paddingTop: tema.espaciado.sm},
  dosColumnas: {flexDirection: 'row', gap: tema.espaciado.md},
  columna: {flex: 1},
  conRequisito: {gap: tema.espaciado.sm},
  filaCentrada: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
