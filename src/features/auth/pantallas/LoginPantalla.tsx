import {zodResolver} from '@hookform/resolvers/zod';
import {type ComponentRef, useEffect, useRef} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {type TextInput, View} from 'react-native';
import type {Edge} from 'react-native-safe-area-context';
import {StyleSheet} from 'react-native-unistyles';

import {versionApp} from '@/core/config';
import {useSesion} from '@/core/sesion';
import {
  ArrowRight,
  Aviso,
  Boton,
  Input,
  mostrarInfo,
  PROPS_CORREO,
  Texto,
  Mail,
} from '@/ui';

import {PantallaAcceso} from '../components/PantallaAcceso';
import {PortadaLogin, SOLAPE_PORTADA} from '../components/PortadaLogin';
import {
  esquemaFormularioLogin,
  type FormularioLogin,
} from '../domain/formularios';
import {
  esCuentaNoVerificada,
  useIniciarSesion,
} from '../hooks/useIniciarSesion';
import {useNavegacionAuth} from '../hooks/useNavegacionAuth';

/** La portada navy llega hasta arriba y respeta ella misma el safe area. */
const BORDES_SIN_ARRIBA: readonly Edge[] = ['bottom', 'left', 'right'];

export function LoginPantalla() {
  const claveRef = useRef<ComponentRef<typeof TextInput>>(null);
  const avisoSesion = useSesion(s => s.avisoSesion);
  const navigation = useNavegacionAuth();
  const {mutate, isPending, error} = useIniciarSesion();
  const {control, handleSubmit, getValues} = useForm<FormularioLogin>({
    resolver: zodResolver(esquemaFormularioLogin),
    defaultValues: {email: '', clave: ''},
  });

  useEffect(() => {
    if (avisoSesion) mostrarInfo(avisoSesion);
  }, [avisoSesion]);

  const enviar = () => handleSubmit(datos => mutate(datos))();
  const correoEscrito = () => getValues('email').trim();

  return (
    <PantallaAcceso
      bordes={BORDES_SIN_ARRIBA}
      desplazable
      estiloContenido={styles.contenido}>
      <PortadaLogin />

      <View style={styles.formulario}>
        <Texto negrita variante="subtitulo">
          Iniciar sesión
        </Texto>
        <Controller
          control={control}
          name="email"
          render={({field, fieldState}) => (
            <Input
              {...PROPS_CORREO}
              error={fieldState.error?.message}
              etiqueta="Correo"
              returnKeyType="next"
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              onSubmitEditing={() => claveRef.current?.focus()}
            />
          )}
        />
        <View>
          <Controller
            control={control}
            name="clave"
            render={({field, fieldState}) => (
              <Input
                ref={claveRef}
                autoCapitalize="none"
                autoComplete="current-password"
                error={fieldState.error?.message}
                etiqueta="Clave"
                returnKeyType="done"
                secureTextEntry
                textContentType="password"
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                onSubmitEditing={enviar}
              />
            )}
          />
          <View style={styles.olvido}>
            <Boton
              tamano="compacto"
              tipo="texto"
              titulo="Olvidé mi clave"
              onPress={() =>
                navigation.navigate('RecuperarClave', {email: correoEscrito()})
              }
            />
          </View>
        </View>

        {error && esCuentaNoVerificada(error) ? (
          <Aviso
            icono={Mail}
            mensaje={`Abre el enlace que te enviamos a ${correoEscrito()} y vuelve a intentarlo.`}
            titulo="Falta verificar tu correo"
            tono="advertencia">
            <Boton
              tamano="compacto"
              tipo="neutro"
              titulo="Reenviar correo de verificación"
              onPress={() =>
                navigation.navigate('ReenviarVerificacion', {
                  email: correoEscrito(),
                })
              }
            />
          </Aviso>
        ) : null}

        <Boton
          cargando={isPending}
          icono={ArrowRight}
          posicionIcono="fin"
          titulo="Iniciar sesión"
          onPress={enviar}
        />

        <View style={styles.registro}>
          <Texto tono="secundario">¿Eres nuevo?</Texto>
          <Boton
            tamano="compacto"
            tipo="texto"
            titulo="Crear cuenta"
            onPress={() => navigation.navigate('Registro')}
          />
        </View>

        <Texto centrado numerico tono="secundario" variante="pie">
          Versión {versionApp()}
        </Texto>
      </View>
    </PantallaAcceso>
  );
}

const styles = StyleSheet.create(tema => ({
  contenido: {padding: 0, gap: 0},
  // Hoja blanca montada sobre la portada, con las esquinas de arriba redondeadas.
  formulario: {
    flexGrow: 1,
    marginTop: -SOLAPE_PORTADA,
    borderTopLeftRadius: tema.radio.xl,
    borderTopRightRadius: tema.radio.xl,
    backgroundColor: tema.colores.fondo,
    gap: tema.espaciado.lg + 2,
    paddingHorizontal: tema.espaciado.xl + 4,
    paddingTop: tema.espaciado.xxl,
    paddingBottom: tema.espaciado.xl,
  },
  olvido: {alignItems: 'flex-end'},
  registro: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
}));
