import {zodResolver} from '@hookform/resolvers/zod';
import type {RouteProp} from '@react-navigation/native';
import {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {
  Boton,
  Encabezado,
  IconoDestacado,
  Input,
  Pantalla,
  PROPS_CORREO,
  Texto,
  type TipoIcono,
  KeyRound,
  MailWarning,
} from '@/ui';

import {CorreoEnviado} from '../components/CorreoEnviado';
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
  icono: TipoIcono;
  titulo: string;
  descripcion: string;
  boton: string;
  /** El mensaje de éxito va partido para resaltar el correo en medio. */
  exito: [antes: string, despues: string];
};

const TEXTOS: Record<TipoSolicitudCorreo, Textos> = {
  recuperarClave: {
    icono: KeyRound,
    titulo: '¿Olvidaste tu clave?',
    descripcion:
      'Escribe tu correo y te enviaremos un enlace para crear una clave nueva.',
    boton: 'Enviar enlace',
    exito: [
      'Si ',
      ' está registrado, te llegará un enlace. Ábrelo para crear tu clave nueva.',
    ],
  },
  reenviarVerificacion: {
    icono: MailWarning,
    titulo: 'Verifica tu cuenta',
    descripcion:
      'Tu cuenta aún no está verificada. Te reenviamos el enlace por correo.',
    boton: 'Reenviar correo',
    exito: [
      'Si ',
      ' tiene una cuenta sin verificar, te llegará un enlace. Ábrelo y luego inicia sesión.',
    ],
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
  const [correoEnviado, setCorreoEnviado] = useState<string | null>(null);
  const {mutate, mutateAsync, isPending} = useSolicitarCorreo(tipo);
  const {control, handleSubmit} = useForm<FormularioCorreo>({
    resolver: zodResolver(esquemaFormularioCorreo),
    defaultValues: {email: emailInicial},
  });

  const enviar = () =>
    handleSubmit(({email}) =>
      mutate(email, {onSuccess: () => setCorreoEnviado(email)}),
    )();
  const volver = () => navigation.navigate('Login');

  if (correoEnviado) {
    const [antes, despues] = textos.exito;
    return (
      <CorreoEnviado
        alReenviar={() => mutateAsync(correoEnviado)}
        alVolver={volver}
        reenviando={isPending}>
        {antes}
        <Texto negrita>{correoEnviado}</Texto>
        {despues}
      </CorreoEnviado>
    );
  }

  return (
    <Pantalla
      desplazable
      estiloContenido={styles.contenido}
      pie={
        <>
          <Boton cargando={isPending} titulo={textos.boton} onPress={enviar} />
          <Boton
            tamano="compacto"
            tipo="texto"
            titulo="Volver a iniciar sesión"
            onPress={volver}
          />
        </>
      }>
      <Encabezado alVolver={() => navigation.goBack()} />
      <View style={styles.cuerpo}>
        <IconoDestacado icono={textos.icono} />
        <View style={styles.textos}>
          <Texto negrita variante="titulo">
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
      </View>
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
  contenido: {padding: 0, gap: 0},
  cuerpo: {
    gap: tema.espaciado.xl - 4,
    paddingHorizontal: tema.espaciado.xl,
    paddingTop: tema.espaciado.lg,
  },
  textos: {gap: tema.espaciado.sm},
}));
