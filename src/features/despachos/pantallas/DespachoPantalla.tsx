import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMemo, useState} from 'react';
import {Alert, FlatList, RefreshControl, View} from 'react-native';
import {StyleSheet, useUnistyles} from 'react-native-unistyles';

import {mensajeUsuario} from '@/core/api';
import {
  Aviso,
  Boton,
  BotonIcono,
  Buscador,
  Cargando,
  CloudOff,
  Encabezado,
  EstadoVacio,
  mostrarError,
  mostrarExito,
  mostrarInfo,
  Package,
  Pantalla,
  RefreshCw,
  Search,
  Segmentos,
  Texto,
  TriangleAlert,
  Unlink,
} from '@/ui';

import {BarraEnvios} from '../components/BarraEnvios';
import {FilaGuia} from '../components/FilaGuia';
import {nombreDespacho, nombreEmpresa} from '../components/TarjetaDespacho';
import {plural} from '../domain/envios';
import {contarGuias, filtrarGuias, type FiltroGuias} from '../domain/guias';
import {
  useDescargarDespacho,
  useDesvincularDespacho,
} from '../hooks/useAccionesDespacho';
import {useDespacho, useGuias} from '../hooks/useDespachos';
import type {RutasDespachos} from '../rutas';

type Props = NativeStackScreenProps<RutasDespachos, 'Despacho'>;

export function DespachoPantalla({navigation, route}: Props) {
  const {tenantDespachoId} = route.params;
  const {theme} = useUnistyles();
  const {data: despacho, isPending} = useDespacho(tenantDespachoId);
  const {data: guias = []} = useGuias(tenantDespachoId);
  const descargar = useDescargarDespacho(tenantDespachoId);
  const desvincular = useDesvincularDespacho(tenantDespachoId);
  const [filtro, setFiltro] = useState<FiltroGuias>('pendientes');
  const [busqueda, setBusqueda] = useState('');

  const visibles = useMemo(
    () => filtrarGuias(guias, filtro, busqueda),
    [guias, filtro, busqueda],
  );
  const cuentas = useMemo(() => contarGuias(guias), [guias]);

  const volver = () => navigation.goBack();

  const actualizar = () =>
    descargar.mutate(undefined, {
      onSuccess: resultado => {
        if (resultado === 'borrado') {
          mostrarInfo('Este despacho ya no está asignado a ti.');
          volver();
        }
      },
      onError: error => mostrarError(mensajeUsuario(error)),
    });

  const confirmarDesvincular = () =>
    Alert.alert(
      '¿Desvincular este despacho?',
      'Se borra del teléfono y queda libre para otro conductor.',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: () =>
            desvincular.mutate(undefined, {
              onSuccess: () => {
                mostrarExito('Despacho desvinculado');
                volver();
              },
              onError: error => mostrarError(mensajeUsuario(error)),
            }),
        },
      ],
    );

  if (isPending) {
    return (
      <Pantalla>
        <Cargando />
      </Pantalla>
    );
  }

  if (!despacho) {
    return (
      <Pantalla>
        <Encabezado alVolver={volver} />
        <EstadoVacio
          icono={Package}
          mensaje="Ya no está en el teléfono."
          titulo="Despacho no disponible"
        />
      </Pantalla>
    );
  }

  const sinDescargar = despacho.descargadoEn === null;

  const cabecera = (
    <View style={styles.cabecera}>
      {despacho.liberado ? (
        <Aviso
          icono={TriangleAlert}
          mensaje={`La empresa lo liberó, pero tienes ${plural(despacho.porEnviar, 'envío', 'envíos')} sin confirmar. Se conserva hasta resolverlos en Envíos.`}
          titulo="Despacho liberado"
          tono="advertencia"
        />
      ) : null}
      <Buscador
        alCambiar={setBusqueda}
        etiqueta="Buscar guía, destinatario o dirección"
        valor={busqueda}
      />
      <Segmentos
        alCambiar={setFiltro}
        opciones={[
          {
            valor: 'pendientes',
            titulo: 'Pendientes',
            cantidad: cuentas.pendientes,
          },
          {
            valor: 'gestionadas',
            titulo: 'Gestionadas',
            cantidad: cuentas.gestionadas,
          },
          {valor: 'todas', titulo: 'Todas', cantidad: cuentas.todas},
        ]}
        valor={filtro}
      />
    </View>
  );

  const pie = despacho.liberado ? undefined : (
    <View style={styles.pieLista}>
      <Boton
        disabled={despacho.porEnviar > 0}
        icono={Unlink}
        tamano="compacto"
        tipo="texto"
        titulo="Desvincular despacho"
        onPress={confirmarDesvincular}
      />
      {despacho.porEnviar > 0 ? (
        <Texto centrado tono="secundario" variante="etiqueta">
          Tienes {plural(despacho.porEnviar, 'envío', 'envíos')} sin confirmar.
          Envíalos antes de desvincularlo.
        </Texto>
      ) : null}
    </View>
  );

  return (
    <Pantalla>
      <Encabezado
        accion={
          <BotonIcono
            etiqueta="Actualizar guías"
            icono={RefreshCw}
            onPress={actualizar}
          />
        }
        alVolver={volver}
        subtitulo={nombreEmpresa(despacho)}
        titulo={nombreDespacho(despacho)}
      />
      <BarraEnvios />
      {sinDescargar ? (
        <EstadoVacio
          accion={{titulo: 'Descargar guías', alPresionar: actualizar}}
          icono={CloudOff}
          mensaje="Descárgalas con señal para trabajar el despacho sin conexión."
          titulo="Guías sin descargar"
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.lista}
          data={visibles}
          keyboardShouldPersistTaps="handled"
          keyExtractor={guia => String(guia.codigoGuia)}
          ListEmptyComponent={
            <EstadoVacio
              icono={Search}
              mensaje={
                busqueda
                  ? 'Prueba con otro nombre, número o dirección.'
                  : undefined
              }
              titulo={
                busqueda
                  ? 'Ninguna guía coincide'
                  : filtro === 'pendientes'
                    ? 'No quedan guías pendientes'
                    : 'Sin guías aquí'
              }
            />
          }
          ListFooterComponent={pie}
          ListHeaderComponent={cabecera}
          refreshControl={
            <RefreshControl
              colors={[theme.colores.primario]}
              refreshing={descargar.isPending}
              tintColor={theme.colores.primario}
              onRefresh={actualizar}
            />
          }
          renderItem={({item}) => (
            <FilaGuia
              alPresionar={() =>
                navigation.navigate('Guia', {
                  tenantDespachoId,
                  codigoGuia: item.codigoGuia,
                })
              }
              guia={item}
            />
          )}
        />
      )}
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  cabecera: {gap: tema.espaciado.md, paddingBottom: tema.espaciado.xs},
  lista: {
    flexGrow: 1,
    gap: tema.espaciado.md,
    padding: tema.espaciado.lg,
  },
  pieLista: {gap: tema.espaciado.xs, paddingTop: tema.espaciado.lg},
}));
