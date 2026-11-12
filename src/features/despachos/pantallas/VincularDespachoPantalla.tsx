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
  mostrarError,
  mostrarExito,
  Pantalla,
  ScanLine,
  Texto,
} from '@/ui';

import {LectorCodigo} from '../components/LectorCodigo';

import {
  esquemaFormularioVincular,
  type DatosFormularioVincular,
  type FormularioVincular,
  leerQrDespacho,
} from '../domain/formularios';
import {
  mensajeVincular,
  useVincularDespacho,
} from '../hooks/useAccionesDespacho';
import {useLectorGuia} from '../hooks/useLectorGuia';
import {useNavegacionDespachos} from '../hooks/useNavegacionDespachos';

/** Vincular con el QR del manifiesto o escribiendo sus tres datos a mano. */
export function VincularDespachoPantalla() {
  const navegacion = useNavegacionDespachos();
  const despachoRef = useRef<ComponentRef<typeof TextInput>>(null);
  const tokenRef = useRef<ComponentRef<typeof TextInput>>(null);
  const {mutate, isPending, error} = useVincularDespacho();
  const lector = useLectorGuia();
  const {control, handleSubmit, setValue} = useForm<
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

  // Llena el formulario y deja que el conductor confirme con "Vincular".
  const alLeerQr = (crudo: string) => {
    lector.cerrar();
    const datos = leerQrDespacho(crudo);
    if (!datos) {
      mostrarError('Ese código no es el QR de un manifiesto.');
      return;
    }
    const opciones = {shouldValidate: true, shouldDirty: true};
    setValue('operador', datos.operador, opciones);
    setValue('despacho', datos.despacho, opciones);
    setValue('token', datos.token, opciones);
  };

  return (
    <Pantalla
      desplazable
      pie={<Boton cargando={isPending} titulo="Vincular" onPress={enviar} />}>
      {lector.abierto ? (
        <LectorCodigo
          alCerrar={lector.cerrar}
          alLeer={alLeerQr}
          ayuda="Apunta al QR del manifiesto"
          titulo="Escanear manifiesto"
        />
      ) : null}
      <Encabezado alVolver={() => navegacion.goBack()} />
      <View style={styles.cuerpo}>
        <View style={styles.textos}>
          <Texto style={styles.titulo} variante="titulo">
            Vincular despacho
          </Texto>
          <Texto tono="secundario">
            Escanea el QR del manifiesto que te dio el despachador o escribe sus
            datos. Necesitas señal solo para este paso.
          </Texto>
        </View>

        <Boton
          icono={ScanLine}
          tipo="secundario"
          titulo="Escanear QR"
          onPress={lector.abrir}
        />

        <View style={styles.fila}>
          <View style={styles.operador}>
            <Controller
              control={control}
              name="operador"
              render={({field, fieldState}) => (
                <Input
                  error={fieldState.error?.message}
                  etiqueta="Operador"
                  keyboardType="number-pad"
                  mono
                  returnKeyType="next"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  onSubmitEditing={() => despachoRef.current?.focus()}
                />
              )}
            />
          </View>
          <View style={styles.despacho}>
            <Controller
              control={control}
              name="despacho"
              render={({field, fieldState}) => (
                <Input
                  ref={despachoRef}
                  error={fieldState.error?.message}
                  etiqueta="Número de despacho"
                  keyboardType="number-pad"
                  mono
                  returnKeyType="next"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  onSubmitEditing={() => tokenRef.current?.focus()}
                />
              )}
            />
          </View>
        </View>
        <Controller
          control={control}
          name="token"
          render={({field, fieldState}) => (
            <Input
              ref={tokenRef}
              autoCapitalize="characters"
              autoCorrect={false}
              ayuda="Aparece en el manifiesto impreso, junto al número."
              error={fieldState.error?.message}
              etiqueta="Token"
              maxLength={20}
              mono
              returnKeyType="done"
              value={field.value}
              onBlur={field.onBlur}
              // Se ve como se envía: en mayúsculas.
              onChangeText={texto => field.onChange(texto.toUpperCase())}
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
      </View>
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  cuerpo: {gap: tema.espaciado.lg + 2, paddingHorizontal: tema.espaciado.xs},
  textos: {gap: tema.espaciado.sm, paddingTop: tema.espaciado.xs},
  titulo: {fontSize: 26, lineHeight: 32, letterSpacing: -0.6},
  fila: {flexDirection: 'row', gap: tema.espaciado.md},
  operador: {flex: 1},
  despacho: {flex: 1.6},
}));
