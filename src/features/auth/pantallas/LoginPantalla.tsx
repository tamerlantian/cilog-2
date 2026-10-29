import {zodResolver} from '@hookform/resolvers/zod';
import {type ComponentRef, useEffect, useRef} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {type TextInput, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {useSesion} from '@/core/sesion';
import {
  Aviso,
  Boton,
  Input,
  Marca,
  mostrarInfo,
  Pantalla,
  PROPS_CORREO,
  Texto,
  Mail,
} from '@/ui';

import {
  esquemaFormularioLogin,
  type FormularioLogin,
} from '../domain/formularios';
import {
  esCuentaNoVerificada,
  useIniciarSesion,
} from '../hooks/useIniciarSesion';
import {useNavegacionAuth} from '../hooks/useNavegacionAuth';

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
    <Pantalla
      bordes={['top', 'left', 'right']}
      desplazable
      estiloContenido={styles.contenido}
      fondo="marca">
      <View style={styles.marca}>
        <Marca />
        <Texto tono="sobreMarcaSecundario" variante="subtitulo">
          Tus entregas del día, en orden.
        </Texto>
      </View>

      <View style={styles.hoja}>
        <Texto negrita variante="subtitulo">
          Inicia sesión
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
              tipo="secundario"
              titulo="Reenviar correo de verificación"
              onPress={() =>
                navigation.navigate('ReenviarVerificacion', {
                  email: correoEscrito(),
                })
              }
            />
          </Aviso>
        ) : null}

        <Boton cargando={isPending} titulo="Iniciar sesión" onPress={enviar} />

        <View style={styles.registro}>
          <Texto tono="secundario">¿Eres nuevo?</Texto>
          <Boton
            tamano="compacto"
            tipo="texto"
            titulo="Crear cuenta"
            onPress={() => navigation.navigate('Registro')}
          />
        </View>
      </View>
    </Pantalla>
  );
}

const styles = StyleSheet.create((tema, rt) => ({
  contenido: {padding: 0, gap: 0},
  marca: {
    gap: tema.espaciado.sm,
    paddingHorizontal: tema.espaciado.xl + 4,
    paddingTop: tema.espaciado.xxl + tema.espaciado.lg,
    paddingBottom: tema.espaciado.xxl,
  },
  hoja: {
    flexGrow: 1,
    gap: tema.espaciado.lg + 2,
    backgroundColor: tema.colores.fondo,
    borderTopLeftRadius: tema.radio.xl + 4,
    borderTopRightRadius: tema.radio.xl + 4,
    paddingHorizontal: tema.espaciado.xl,
    paddingTop: tema.espaciado.xxl,
    paddingBottom: tema.espaciado.xl + rt.insets.bottom,
  },
  olvido: {alignItems: 'flex-end'},
  registro: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
}));
