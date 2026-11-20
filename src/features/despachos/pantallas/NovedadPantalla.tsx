import {zodResolver} from '@hookform/resolvers/zod';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Controller, useForm} from 'react-hook-form';
import {useState} from 'react';
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
  mostrarError,
  mostrarExito,
  Pantalla,
  Selector,
  Texto,
  TriangleAlert,
} from '@/ui';

import {destinatario} from '../components/FilaGuia';
import {PasoFotos} from '../components/PasoFotos';
import type {GuiaLocal} from '../db/repositorio';
import {
  esquemaFormularioNovedad,
  type FormularioNovedad,
} from '../domain/formularios';
import {
  LARGO_MAXIMO_DESCRIPCION,
  permisoTodas,
  puedeReportarNovedad,
} from '../domain/gestion';
import {useDescargarTiposNovedad} from '../hooks/useAccionesDespacho';
import {useDespacho, useGuias, useTiposNovedad} from '../hooks/useDespachos';
import {useUbicacion} from '../hooks/useEvidencias';
import {useConfiguracionEntrega, useReportarNovedad} from '../hooks/useGestion';
import type {RutasDespachos} from '../rutas';

type Props = NativeStackScreenProps<RutasDespachos, 'Novedad'>;

/** Hasta aquí se ven todos de una vez; con más, la hoja trae buscador. */
const TIPOS_SIN_BUSCADOR = 7;

export function NovedadPantalla({navigation, route}: Props) {
  const {tenantDespachoId, codigosGuia} = route.params;
  const {data: despacho} = useDespacho(tenantDespachoId);
  const {data: todas = [], isPending} = useGuias(tenantDespachoId);
  const guias = codigosGuia
    .map(codigo => todas.find(g => g.codigoGuia === codigo))
    .filter((g): g is GuiaLocal => g !== undefined);
  const [guia] = guias;
  const varias = codigosGuia.length > 1;
  const {data: tipos = [], isPending: cargandoTipos} =
    useTiposNovedad(tenantDespachoId);
  const descargarTipos = useDescargarTiposNovedad(tenantDespachoId);
  const opciones = tipos.map(tipo => ({
    valor: tipo.codigo,
    titulo: tipo.nombre,
  }));
  const [fotos, setFotos] = useState<string[]>([]);
  const configuracion = useConfiguracionEntrega();
  const reportar = useReportarNovedad(tenantDespachoId, codigosGuia);
  const ubicacion = useUbicacion();
  const {control, handleSubmit} = useForm<FormularioNovedad>({
    resolver: zodResolver(esquemaFormularioNovedad),
    defaultValues: {tipo: '', descripcion: ''},
  });

  const encabezado = (
    <Encabezado
      alVolver={() => navigation.goBack()}
      detalle={
        varias
          ? codigosGuia.join(', ')
          : guia
            ? `${guia.codigoGuia} · ${destinatario(guia)}`
            : codigosGuia.join(', ')
      }
      tipoVolver="cerrar"
      titulo={
        varias ? `Novedad en ${codigosGuia.length} guías` : 'Reportar novedad'
      }
    />
  );

  if (isPending || cargandoTipos) {
    return (
      <Pantalla>
        <Cargando />
      </Pantalla>
    );
  }

  const permiso =
    despacho && guias.length === codigosGuia.length
      ? permisoTodas(guias, g => puedeReportarNovedad(despacho, g))
      : {
          permitido: false as const,
          motivo: varias
            ? 'Alguna guía ya no está en el teléfono.'
            : 'La guía ya no está en el teléfono.',
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

  // Los tipos son de cada empresa y se bajan con el despacho.
  if (tipos.length === 0) {
    return (
      <Pantalla>
        {encabezado}
        <EstadoVacio
          accion={{
            titulo: 'Descargar tipos de novedad',
            cargando: descargarTipos.isPending,
            alPresionar: () =>
              descargarTipos.mutate(undefined, {
                onError: error => mostrarError(mensajeUsuario(error)),
              }),
          }}
          icono={TriangleAlert}
          mensaje="Faltan los tipos de novedad de la empresa en el teléfono. Descárgalos con señal."
          titulo="No se puede reportar novedad"
          tono="advertencia"
        />
      </Pantalla>
    );
  }

  const guardar = () =>
    handleSubmit(datos =>
      reportar.mutate(
        {datos, fotos, ubicacion},
        {
          onSuccess: () => {
            mostrarExito(
              varias
                ? `${codigosGuia.length} novedades guardadas`
                : 'Novedad guardada',
            );
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
            <Selector
              alCambiar={field.onChange}
              buscable={tipos.length > TIPOS_SIN_BUSCADOR}
              error={fieldState.error?.message}
              etiqueta="Tipo de novedad"
              opciones={opciones}
              pregunta="¿Qué pasó?"
              vacio="Elegir"
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
        <PasoFotos
          alCambiar={setFotos}
          descripcion="Lo que muestre el problema: la fachada, el paquete o la dirección."
          exigida={false}
          fotos={fotos}
          titulo="Fotos (opcional)"
        />
        {configuracion.entregaConNovedad ? null : (
          <View style={styles.nota}>
            <Icono color="textoSecundario" icono={Info} tamano={16} />
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
  nota: {flexDirection: 'row', gap: tema.espaciado.sm},
  textoNota: {flex: 1},
}));
