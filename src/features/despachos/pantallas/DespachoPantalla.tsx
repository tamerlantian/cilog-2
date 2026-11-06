import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMemo, useState} from 'react';
import {Alert, FlatList, RefreshControl, View} from 'react-native';
import {StyleSheet, useUnistyles} from 'react-native-unistyles';

import {mensajeUsuario} from '@/core/api';
import {
  Aviso,
  Boton,
  CircleCheck,
  Tarjeta,
  BotonIcono,
  Buscador,
  Cargando,
  CloudOff,
  Dialogo,
  Flag,
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

import {BarraAvance, Leyenda} from '../components/BarraAvance';
import {ChipEnvios} from '../components/ChipEnvios';
import {FilaGuia} from '../components/FilaGuia';
import {SiguienteGuia} from '../components/SiguienteGuia';
import {
  codigoDespacho,
  nombreDespacho,
  nombreEmpresa,
} from '../components/TarjetaDespacho';
import {plural} from '../domain/envios';
import {
  puedeEntregar,
  puedeReportarNovedad,
  puedeTerminar,
} from '../domain/gestion';
import {
  contarGuias,
  filtrarGuias,
  resumenGuias,
  type FiltroGuias,
} from '../domain/guias';
import {
  useDescargarDespacho,
  useDesvincularDespacho,
} from '../hooks/useAccionesDespacho';
import {useDespacho, useGuias} from '../hooks/useDespachos';
import {
  useConfiguracionEntrega,
  useTerminarDespacho,
} from '../hooks/useGestion';
import type {RutasDespachos} from '../rutas';

type Props = NativeStackScreenProps<RutasDespachos, 'Despacho'>;

export function DespachoPantalla({navigation, route}: Props) {
  const {tenantDespachoId} = route.params;
  const {theme} = useUnistyles();
  const {data: despacho, isPending} = useDespacho(tenantDespachoId);
  const {data: guias = []} = useGuias(tenantDespachoId);
  const descargar = useDescargarDespacho(tenantDespachoId);
  const desvincular = useDesvincularDespacho(tenantDespachoId);
  const terminar = useTerminarDespacho(tenantDespachoId);
  const configuracion = useConfiguracionEntrega();
  const [filtro, setFiltro] = useState<FiltroGuias>('pendientes');
  const [busqueda, setBusqueda] = useState('');
  const [confirmandoTerminar, setConfirmandoTerminar] = useState(false);

  const visibles = useMemo(
    () => filtrarGuias(guias, filtro, busqueda),
    [guias, filtro, busqueda],
  );
  const cuentas = useMemo(() => contarGuias(guias), [guias]);
  const resumen = useMemo(() => resumenGuias(guias), [guias]);

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

  const terminarDespacho = () =>
    terminar.mutate(undefined, {
      onSuccess: () => {
        setConfirmandoTerminar(false);
        mostrarExito('Despacho terminado');
      },
      onError: error => {
        setConfirmandoTerminar(false);
        mostrarError(mensajeUsuario(error));
      },
    });

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

  const permisoTerminar = puedeTerminar(despacho, guias);
  const terminado = despacho.terminadoEn !== null;
  // Se ofrece cuando no queda nada por gestionar; antes sería ruido.
  const ofrecerTerminar =
    !terminado &&
    !despacho.liberado &&
    cuentas.todas > 0 &&
    cuentas.pendientes === 0;

  // La próxima parada sale de la lista y va arriba, con sus acciones a la mano.
  const siguiente =
    filtro === 'pendientes' && busqueda === '' && !terminado
      ? visibles[0]
      : undefined;
  const lista = siguiente ? visibles.slice(1) : visibles;
  const irAGuia = (codigoGuia: number) =>
    navigation.navigate('Guia', {tenantDespachoId, codigoGuia});

  const cabecera = (
    <View style={styles.cabecera}>
      {terminado ? (
        <Aviso
          icono={CircleCheck}
          mensaje={
            despacho.porEnviar > 0
              ? 'Se enviará a la empresa cuando haya señal.'
              : 'La empresa ya lo recibió.'
          }
          titulo="Despacho terminado"
          tono="exito"
        />
      ) : null}
      {ofrecerTerminar ? (
        <Tarjeta destacada>
          <Texto negrita>Todas las guías están gestionadas</Texto>
          {permisoTerminar.permitido ? null : (
            <Texto tono="secundario" variante="etiqueta">
              {permisoTerminar.motivo}
            </Texto>
          )}
          <Boton
            cargando={terminar.isPending}
            disabled={!permisoTerminar.permitido}
            icono={CircleCheck}
            titulo="Terminar despacho"
            onPress={() => setConfirmandoTerminar(true)}
          />
        </Tarjeta>
      ) : null}
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
        etiqueta="Guía, documento o destinatario"
        valor={busqueda}
      />
      <View style={styles.resumen}>
        <View style={styles.filaResumen}>
          <Texto negrita numerico>
            {plural(resumen.pendientes, 'pendiente', 'pendientes')}
          </Texto>
          <Leyenda
            entregadas={resumen.entregadas}
            novedades={resumen.novedades}
          />
        </View>
        <BarraAvance
          entregadas={resumen.entregadas}
          novedades={resumen.novedades}
          total={cuentas.todas}
        />
      </View>
      {siguiente ? (
        <SiguienteGuia
          alAbrir={() => irAGuia(siguiente.codigoGuia)}
          alEntregar={
            puedeEntregar(despacho, siguiente, configuracion).permitido
              ? () =>
                  navigation.navigate('Entregar', {
                    tenantDespachoId,
                    codigoGuia: siguiente.codigoGuia,
                  })
              : undefined
          }
          alReportarNovedad={
            puedeReportarNovedad(despacho, siguiente).permitido
              ? () =>
                  navigation.navigate('Novedad', {
                    tenantDespachoId,
                    codigoGuia: siguiente.codigoGuia,
                  })
              : undefined
          }
          guia={siguiente}
        />
      ) : null}
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
          <>
            <ChipEnvios />
            <BotonIcono
              etiqueta="Actualizar guías"
              icono={RefreshCw}
              onPress={actualizar}
            />
          </>
        }
        alVolver={volver}
        subtitulo={nombreEmpresa(despacho)}
        titulo={`Despacho ${codigoDespacho(despacho)}`}
      />
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
          data={lista}
          keyboardShouldPersistTaps="handled"
          keyExtractor={guia => String(guia.codigoGuia)}
          ListEmptyComponent={
            siguiente ? undefined : (
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
            )
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
              alPresionar={() => irAGuia(item.codigoGuia)}
              guia={item}
            />
          )}
        />
      )}
      <Dialogo
        acciones={
          <>
            <Boton
              cargando={terminar.isPending}
              titulo="Terminar despacho"
              onPress={terminarDespacho}
            />
            <Boton
              disabled={terminar.isPending}
              tipo="texto"
              titulo="Todavía no"
              onPress={() => setConfirmandoTerminar(false)}
            />
          </>
        }
        alCerrar={() => setConfirmandoTerminar(false)}
        icono={Flag}
        mensaje="Ya gestionaste todas las guías. Después no podrás registrar más entregas en él."
        titulo={`¿Terminar el ${nombreDespacho(despacho).toLowerCase()}?`}
        visible={confirmandoTerminar}>
        <View style={styles.cifras}>
          <View style={[styles.cifra, styles.cifraExito]}>
            <Texto negrita numerico tono="exito" variante="subtitulo">
              {resumen.entregadas}
            </Texto>
            <Texto tono="exito" variante="pie">
              Entregadas
            </Texto>
          </View>
          <View style={[styles.cifra, styles.cifraAdvertencia]}>
            <Texto negrita numerico tono="advertencia" variante="subtitulo">
              {resumen.novedades}
            </Texto>
            <Texto tono="advertencia" variante="pie">
              Novedades
            </Texto>
          </View>
          <View style={[styles.cifra, styles.cifraNeutra]}>
            <Texto negrita numerico tono="secundario" variante="subtitulo">
              {resumen.pendientes}
            </Texto>
            <Texto tono="secundario" variante="pie">
              Pendientes
            </Texto>
          </View>
        </View>
      </Dialogo>
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  cabecera: {gap: tema.espaciado.md + 2, paddingBottom: tema.espaciado.md},
  lista: {
    flexGrow: 1,
    paddingHorizontal: tema.espaciado.lg,
    paddingTop: tema.espaciado.xs,
    paddingBottom: tema.espaciado.lg,
  },
  resumen: {gap: tema.espaciado.sm, paddingHorizontal: tema.espaciado.xs},
  filaResumen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tema.espaciado.sm,
  },
  pieLista: {gap: tema.espaciado.xs, paddingTop: tema.espaciado.lg},
  cifras: {flexDirection: 'row', gap: tema.espaciado.sm},
  cifra: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: tema.espaciado.md,
    borderRadius: tema.radio.md,
  },
  cifraExito: {backgroundColor: tema.colores.exitoSuave},
  cifraAdvertencia: {backgroundColor: tema.colores.advertenciaSuave},
  cifraNeutra: {backgroundColor: tema.colores.superficie},
}));
