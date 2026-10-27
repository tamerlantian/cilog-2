import {zodResolver} from '@hookform/resolvers/zod';
import {type ComponentRef, useEffect, useRef} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {type TextInput, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {useSesion} from '@/core/sesion';
import {Boton, Input, mostrarInfo, Pantalla, Texto} from '@/ui';

import {esquemaFormularioLogin, type FormularioLogin} from '../esquemas';
import {useIniciarSesion} from '../useIniciarSesion';

export function LoginPantalla() {
  const claveRef = useRef<ComponentRef<typeof TextInput>>(null);
  const avisoSesion = useSesion(s => s.avisoSesion);
  const {mutate, isPending} = useIniciarSesion();
  const {control, handleSubmit} = useForm<FormularioLogin>({
    resolver: zodResolver(esquemaFormularioLogin),
    defaultValues: {email: '', clave: ''},
  });

  useEffect(() => {
    if (avisoSesion) mostrarInfo(avisoSesion);
  }, [avisoSesion]);

  const enviar = () => handleSubmit(datos => mutate(datos))();

  return (
    <Pantalla desplazable estiloContenido={styles.contenido}>
      <View style={styles.encabezado}>
        <Texto variante="display" negrita tono="primario">
          Cilog
        </Texto>
        <Texto tono="secundario">Inicia sesión para ver tus despachos</Texto>
      </View>

      <View style={styles.formulario}>
        <Controller
          control={control}
          name="email"
          render={({field, fieldState}) => (
            <Input
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              error={fieldState.error?.message}
              etiqueta="Correo"
              keyboardType="email-address"
              returnKeyType="next"
              textContentType="emailAddress"
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              onSubmitEditing={() => claveRef.current?.focus()}
            />
          )}
        />
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
        <Boton cargando={isPending} titulo="Iniciar sesión" onPress={enviar} />
      </View>
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  contenido: {justifyContent: 'center'},
  encabezado: {gap: tema.espaciado.xs},
  formulario: {gap: tema.espaciado.lg},
}));
