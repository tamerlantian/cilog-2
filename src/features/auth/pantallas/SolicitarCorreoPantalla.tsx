import {zodResolver} from '@hookform/resolvers/zod';
import type {RouteProp} from '@react-navigation/native';
import {Controller, useForm} from 'react-hook-form';
import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Boton, EstadoVacio, Input, Pantalla, PROPS_CORREO, Texto} from '@/ui';

import {
  esquemaFormularioCorreo,
  type FormularioCorreo,
} from '../domain/formularios';
import {useNavegacionAuth} from '../hooks/useNavegacionAuth';
import {
  type TipoSolicitudCorreo,
  useSolicitarCorreo,
} from '../hooks/useSolicitudes';
import type {RutasAuth} from '../rutas';

type Textos = {
  titulo: string;
  descripcion: string;
  boton: string;
  exito: string;
};

const TEXTOS: Record<TipoSolicitudCorreo, Textos> = {
  recuperarClave: {
    titulo: 'Recuperar clave',
    descripcion:
      'Escribe tu correo y te enviaremos un enlace para crear una clave nueva.',
    boton: 'Enviar enlace',
    exito:
      'Si el correo está registrado, te enviamos las instrucciones. El enlace abre la página donde creas tu clave nueva.',
  },
  reenviarVerificacion: {
    titulo: 'Verifica tu cuenta',
    descripcion:
      'Tu cuenta aún no está verificada. Te reenviamos el enlace por correo.',
    boton: 'Reenviar correo',
    exito:
      'Si la cuenta existe y no está verificada, te enviamos el enlace. Ábrelo y luego inicia sesión.',
  },
};

/** Formulario de un solo campo (correo) que comparten recuperar clave y reenviar verificación. */
function SolicitarCorreo({
  tipo,
  emailInicial = '',
}: {
  tipo: TipoSolicitudCorreo;
  emailInicial?: string;
}) {
  const navigation = useNavegacionAuth();
  const textos = TEXTOS[tipo];
  const {mutate, isPending, isSuccess} = useSolicitarCorreo(tipo);
  const {control, handleSubmit} = useForm<FormularioCorreo>({
    resolver: zodResolver(esquemaFormularioCorreo),
    defaultValues: {email: emailInicial},
  });

  const enviar = () => handleSubmit(({email}) => mutate(email))();

  if (isSuccess) {
    return (
      <Pantalla>
        <EstadoVacio
          accion={{
            titulo: 'Volver a iniciar sesión',
            alPresionar: () => navigation.navigate('Login'),
          }}
          mensaje={textos.exito}
          titulo="Revisa tu correo"
        />
      </Pantalla>
    );
  }

  return (
    <Pantalla desplazable>
      <View style={styles.encabezado}>
        <Texto variante="titulo" negrita tono="primario">
          {textos.titulo}
        </Texto>
        <Texto tono="secundario">{textos.descripcion}</Texto>
      </View>
      <Controller
        control={control}
        name="email"
        render={({field, fieldState}) => (
          <Input
            {...PROPS_CORREO}
            error={fieldState.error?.message}
            etiqueta="Correo"
            returnKeyType="done"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            onSubmitEditing={enviar}
          />
        )}
      />
      <Boton cargando={isPending} titulo={textos.boton} onPress={enviar} />
      <Boton
        tipo="texto"
        titulo="Volver"
        onPress={() => navigation.navigate('Login')}
      />
    </Pantalla>
  );
}

export const RecuperarClavePantalla = ({
  route,
}: {
  route: RouteProp<RutasAuth, 'RecuperarClave'>;
}) => (
  <SolicitarCorreo emailInicial={route.params?.email} tipo="recuperarClave" />
);

export const ReenviarVerificacionPantalla = ({
  route,
}: {
  route: RouteProp<RutasAuth, 'ReenviarVerificacion'>;
}) => (
  <SolicitarCorreo
    emailInicial={route.params?.email}
    tipo="reenviarVerificacion"
  />
);

const styles = StyleSheet.create(tema => ({
  encabezado: {gap: tema.espaciado.xs, paddingTop: tema.espaciado.xl},
}));
