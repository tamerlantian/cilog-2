import {zodResolver} from '@hookform/resolvers/zod';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Controller, useForm} from 'react-hook-form';
import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {mensajeUsuario} from '@/core/api';
import {
  Boton,
  Cargando,
  Encabezado,
  EstadoVacio,
  Icono,
  Info,
  Input,
  ListaOpciones,
  mostrarError,
  mostrarExito,
  Pantalla,
  Texto,
  TriangleAlert,
} from '@/ui';

import {destinatario} from '../components/FilaGuia';
import {
  esquemaFormularioNovedad,
  type FormularioNovedad,
} from '../domain/formularios';
import {
  LARGO_MAXIMO_DESCRIPCION,
  puedeReportarNovedad,
} from '../domain/gestion';
import {useDespacho, useGuia} from '../hooks/useDespachos';
import {useUbicacion} from '../hooks/useEvidencias';
import {
  useConfiguracionEntrega,
  useReportarNovedad,
  useTiposNovedad,
} from '../hooks/useGestion';
import type {RutasDespachos} from '../rutas';

type Props = NativeStackScreenProps<RutasDespachos, 'Novedad'>;

export function NovedadPantalla({navigation, route}: Props) {
  const {tenantDespachoId, codigoGuia} = route.params;
  const {data: despacho} = useDespacho(tenantDespachoId);
  const {data: guia, isPending} = useGuia(tenantDespachoId, codigoGuia);
  const tipos = useTiposNovedad();
  const configuracion = useConfiguracionEntrega();
  const reportar = useReportarNovedad(tenantDespachoId, codigoGuia);
  const ubicacion = useUbicacion();
  const {control, handleSubmit} = useForm<FormularioNovedad>({
    resolver: zodResolver(esquemaFormularioNovedad),
    defaultValues: {tipo: '', descripcion: ''},
  });

  const encabezado = (
    <Encabezado
      alVolver={() => navigation.goBack()}
      subtitulo={
        guia
          ? `Guía ${codigoGuia} · ${destinatario(guia)}`
          : `Guía ${codigoGuia}`
      }
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
      reportar.mutate(
        {...datos, ubicacion},
        {
          onSuccess: () => {
            mostrarExito('Novedad guardada');
            navigation.popTo('Despacho', {tenantDespachoId});
          },
          onError: error => mostrarError(mensajeUsuario(error)),
        },
      ),
    )();

  return (
    <Pantalla
      desplazable
      pie={
        <Boton
          cargando={reportar.isPending}
          icono={TriangleAlert}
          tipo="advertencia"
          titulo="Reportar novedad"
          onPress={guardar}
        />
      }>
      {encabezado}
      <View style={styles.cuerpo}>
        <Controller
          control={control}
          name="tipo"
          render={({field, fieldState}) => (
            <ListaOpciones
              alCambiar={field.onChange}
              error={fieldState.error?.message}
              etiqueta="¿Qué pasó?"
              opciones={tipos.map(tipo => ({
                valor: tipo.codigo,
                titulo: tipo.nombre,
              }))}
              tono="advertencia"
              valor={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="descripcion"
          render={({field, fieldState}) => (
            <Input
              ayuda="Lo que debe saber la oficina."
              error={fieldState.error?.message}
              etiqueta="Detalle (opcional)"
              maxLength={LARGO_MAXIMO_DESCRIPCION}
              multilinea
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
            />
          )}
        />
        {configuracion.entregaConNovedad ? null : (
          <View style={styles.nota}>
            <Icono color="textoSecundario" icono={Info} tamano={18} />
            <Texto
              style={styles.textoNota}
              tono="secundario"
              variante="etiqueta">
              Con una novedad, esta empresa no permite entregar la guía después.
            </Texto>
          </View>
        )}
      </View>
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  cuerpo: {gap: tema.espaciado.lg, paddingHorizontal: tema.espaciado.xs},
  nota: {
    flexDirection: 'row',
    gap: tema.espaciado.sm + 2,
    padding: tema.espaciado.md,
    borderRadius: tema.radio.md - 2,
    backgroundColor: tema.colores.superficie,
  },
  textoNota: {flex: 1},
}));
