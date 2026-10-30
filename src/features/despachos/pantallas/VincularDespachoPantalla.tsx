import {zodResolver} from '@hookform/resolvers/zod';
import {type ComponentRef, useRef} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {type TextInput, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {
  Aviso,
  Boton,
  CircleAlert,
  Encabezado,
  Input,
  mostrarExito,
  Pantalla,
  Texto,
} from '@/ui';

import {
  esquemaFormularioVincular,
  type DatosFormularioVincular,
  type FormularioVincular,
} from '../domain/formularios';
import {
  mensajeVincular,
  useVincularDespacho,
} from '../hooks/useAccionesDespacho';
import {useNavegacionDespachos} from '../hooks/useNavegacionDespachos';

/** Vincular a mano con los datos del QR. El escáner llega cuando se conozca su formato. */
export function VincularDespachoPantalla() {
  const navegacion = useNavegacionDespachos();
  const despachoRef = useRef<ComponentRef<typeof TextInput>>(null);
  const tokenRef = useRef<ComponentRef<typeof TextInput>>(null);
  const {mutate, isPending, error} = useVincularDespacho();
  const {control, handleSubmit} = useForm<
    FormularioVincular,
    unknown,
    DatosFormularioVincular
  >({
    resolver: zodResolver(esquemaFormularioVincular),
    defaultValues: {operador: '', despacho: '', token: ''},
  });

  const enviar = () =>
    handleSubmit(datos =>
      mutate(datos, {
        onSuccess: asignacion => {
          mostrarExito('Despacho vinculado');
          navegacion.replace('Despacho', {tenantDespachoId: asignacion.id});
        },
      }),
    )();

  return (
    <Pantalla
      desplazable
      pie={<Boton cargando={isPending} titulo="Vincular" onPress={enviar} />}>
      <Encabezado alVolver={() => navegacion.goBack()} />
      <View style={styles.textos}>
        <Texto negrita variante="titulo">
          Vincular despacho
        </Texto>
        <Texto tono="secundario">
          Escribe los datos que te dio la empresa. Necesitas señal solo para
          este paso.
        </Texto>
      </View>

      <Controller
        control={control}
        name="operador"
        render={({field, fieldState}) => (
          <Input
            ayuda="El código de la empresa de transporte"
            error={fieldState.error?.message}
            etiqueta="Operador"
            keyboardType="number-pad"
            returnKeyType="next"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            onSubmitEditing={() => despachoRef.current?.focus()}
          />
        )}
      />
      <Controller
        control={control}
        name="despacho"
        render={({field, fieldState}) => (
          <Input
            ref={despachoRef}
            error={fieldState.error?.message}
            etiqueta="Despacho"
            keyboardType="number-pad"
            returnKeyType="next"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            onSubmitEditing={() => tokenRef.current?.focus()}
          />
        )}
      />
      <Controller
        control={control}
        name="token"
        render={({field, fieldState}) => (
          <Input
            ref={tokenRef}
            autoCapitalize="none"
            autoCorrect={false}
            error={fieldState.error?.message}
            etiqueta="Token"
            maxLength={20}
            returnKeyType="done"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            onSubmitEditing={enviar}
          />
        )}
      />

      {error ? (
        <Aviso
          icono={CircleAlert}
          mensaje={mensajeVincular(error)}
          titulo="No se pudo vincular"
          tono="peligro"
        />
      ) : null}
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  textos: {gap: tema.espaciado.sm},
}));
