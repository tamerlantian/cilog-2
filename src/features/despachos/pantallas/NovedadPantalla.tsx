import {zodResolver} from '@hookform/resolvers/zod';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Controller, useForm} from 'react-hook-form';

import {mensajeUsuario} from '@/core/api';
import {
  Boton,
  Cargando,
  Encabezado,
  EstadoVacio,
  Input,
  mostrarError,
  mostrarExito,
  Pantalla,
  Selector,
  TriangleAlert,
} from '@/ui';

import {ResumenGuia} from '../components/ResumenGuia';
import {
  esquemaFormularioNovedad,
  type FormularioNovedad,
} from '../domain/formularios';
import {
  LARGO_MAXIMO_DESCRIPCION,
  puedeReportarNovedad,
} from '../domain/gestion';
import {useDespacho, useGuia} from '../hooks/useDespachos';
import {useReportarNovedad, useTiposNovedad} from '../hooks/useGestion';
import type {RutasDespachos} from '../rutas';

type Props = NativeStackScreenProps<RutasDespachos, 'Novedad'>;

export function NovedadPantalla({navigation, route}: Props) {
  const {tenantDespachoId, codigoGuia} = route.params;
  const {data: despacho} = useDespacho(tenantDespachoId);
  const {data: guia, isPending} = useGuia(tenantDespachoId, codigoGuia);
  const tipos = useTiposNovedad();
  const reportar = useReportarNovedad(tenantDespachoId, codigoGuia);
  const {control, handleSubmit} = useForm<FormularioNovedad>({
    resolver: zodResolver(esquemaFormularioNovedad),
    defaultValues: {tipo: '', descripcion: ''},
  });

  const encabezado = (
    <Encabezado
      alVolver={() => navigation.goBack()}
      subtitulo={`Guía ${codigoGuia}`}
      tipoVolver="cerrar"
      titulo="Reportar novedad"
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
      ? puedeReportarNovedad(despacho, guia)
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
          titulo="No se puede reportar novedad"
          tono="advertencia"
        />
      </Pantalla>
    );
  }

  const guardar = () =>
    handleSubmit(datos =>
      reportar.mutate(datos, {
        onSuccess: () => {
          mostrarExito('Novedad guardada');
          navigation.popTo('Despacho', {tenantDespachoId});
        },
        onError: error => mostrarError(mensajeUsuario(error)),
      }),
    )();

  return (
    <Pantalla
      desplazable
      pie={
        <Boton
          cargando={reportar.isPending}
          titulo="Guardar novedad"
          tipo="advertencia"
          onPress={guardar}
        />
      }>
      {encabezado}
      <ResumenGuia guia={guia} />
      <Controller
        control={control}
        name="tipo"
        render={({field, fieldState}) => (
          <Selector
            alCambiar={field.onChange}
            error={fieldState.error?.message}
            etiqueta="Tipo de novedad"
            opciones={tipos.map(tipo => ({
              valor: tipo.codigo,
              titulo: tipo.nombre,
            }))}
            valor={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="descripcion"
        render={({field, fieldState}) => (
          <Input
            ayuda="Opcional. Lo que debe saber la oficina."
            error={fieldState.error?.message}
            etiqueta="Descripción"
            maxLength={LARGO_MAXIMO_DESCRIPCION}
            multilinea
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
          />
        )}
      />
    </Pantalla>
  );
}
