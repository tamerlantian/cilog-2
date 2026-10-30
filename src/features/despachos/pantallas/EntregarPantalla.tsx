import {zodResolver} from '@hookform/resolvers/zod';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {type ComponentRef, useRef} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {Alert, type TextInput} from 'react-native';

import {mensajeUsuario} from '@/core/api';
import {
  Aviso,
  Boton,
  Cargando,
  CircleCheck,
  Encabezado,
  EstadoVacio,
  Info,
  Input,
  mostrarError,
  mostrarExito,
  Pantalla,
  Selector,
  TriangleAlert,
} from '@/ui';

import {ResumenGuia} from '../components/ResumenGuia';
import {
  esquemaFormularioEntrega,
  type FormularioEntrega,
} from '../domain/formularios';
import {PARENTESCOS, puedeEntregar} from '../domain/gestion';
import {useDespacho, useGuia} from '../hooks/useDespachos';
import {useConfiguracionEntrega, useEntregar} from '../hooks/useGestion';
import type {RutasDespachos} from '../rutas';

type Props = NativeStackScreenProps<RutasDespachos, 'Entregar'>;

/** Se guarda en el teléfono con o sin señal; la cola la envía (docs/offline.md §6.2). */
export function EntregarPantalla({navigation, route}: Props) {
  const {tenantDespachoId, codigoGuia} = route.params;
  const identificacionRef = useRef<ComponentRef<typeof TextInput>>(null);
  const celularRef = useRef<ComponentRef<typeof TextInput>>(null);
  const {data: despacho} = useDespacho(tenantDespachoId);
  const {data: guia, isPending} = useGuia(tenantDespachoId, codigoGuia);
  const configuracion = useConfiguracionEntrega();
  const entregar = useEntregar(tenantDespachoId, codigoGuia);
  const {control, handleSubmit} = useForm<FormularioEntrega>({
    resolver: zodResolver(esquemaFormularioEntrega),
    defaultValues: {
      recibe: '',
      numeroIdentificacion: '',
      parentesco: '',
      celular: '',
    },
  });

  const cerrar = () => navigation.goBack();
  const encabezado = (
    <Encabezado
      alVolver={cerrar}
      subtitulo={`Guía ${codigoGuia}`}
      tipoVolver="cerrar"
      titulo="Entregar"
    />
  );

  if (isPending) {
    return (
      <Pantalla>
        <Cargando />
      </Pantalla>
    );
  }

  const permiso =
    guia && despacho
      ? puedeEntregar(despacho, guia, configuracion)
      : {
          permitido: false as const,
          motivo: 'La guía ya no está en el teléfono.',
        };
  if (!guia || !permiso.permitido) {
    return (
      <Pantalla>
        {encabezado}
        <EstadoVacio
          icono={TriangleAlert}
          mensaje={permiso.permitido ? undefined : permiso.motivo}
          titulo="No se puede entregar"
          tono="advertencia"
        />
      </Pantalla>
    );
  }

  const guardar = (datos: FormularioEntrega) =>
    entregar.mutate(datos, {
      onSuccess: () => {
        mostrarExito('Entrega guardada');
        navigation.popTo('Despacho', {tenantDespachoId});
      },
      onError: error => mostrarError(mensajeUsuario(error)),
    });

  // Como en la app anterior: entregar no se deshace, se confirma antes.
  const confirmar = () =>
    handleSubmit(datos =>
      Alert.alert('¿Confirmar la entrega?', `Guía ${codigoGuia}`, [
        {text: 'Cancelar', style: 'cancel'},
        {text: 'Entregar', onPress: () => guardar(datos)},
      ]),
    )();

  return (
    <Pantalla
      desplazable
      pie={
        <Boton
          cargando={entregar.isPending}
          icono={CircleCheck}
          titulo="Confirmar entrega"
          onPress={confirmar}
        />
      }>
      {encabezado}
      <ResumenGuia guia={guia} />

      <Controller
        control={control}
        name="recibe"
        render={({field, fieldState}) => (
          <Input
            autoCapitalize="words"
            error={fieldState.error?.message}
            etiqueta="Recibe"
            returnKeyType="next"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            onSubmitEditing={() => identificacionRef.current?.focus()}
          />
        )}
      />
      <Controller
        control={control}
        name="numeroIdentificacion"
        render={({field, fieldState}) => (
          <Input
            ref={identificacionRef}
            error={fieldState.error?.message}
            etiqueta="Número de identificación"
            keyboardType="number-pad"
            returnKeyType="next"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            onSubmitEditing={() => celularRef.current?.focus()}
          />
        )}
      />
      <Controller
        control={control}
        name="parentesco"
        render={({field, fieldState}) => (
          <Selector
            alCambiar={field.onChange}
            buscable
            error={fieldState.error?.message}
            etiqueta="Parentesco"
            opcional
            opciones={PARENTESCOS}
            vacio="Sin especificar"
            valor={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="celular"
        render={({field, fieldState}) => (
          <Input
            ref={celularRef}
            error={fieldState.error?.message}
            etiqueta="Celular"
            keyboardType="phone-pad"
            returnKeyType="done"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
          />
        )}
      />

      <Aviso
        icono={Info}
        mensaje="Las fotos y la firma llegan en la próxima versión."
        tono="info"
      />
    </Pantalla>
  );
}
