import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {ReactNode} from 'react';
import {Linking, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {
  Boton,
  BotonIcono,
  CircleCheck,
  TriangleAlert,
  Cargando,
  Encabezado,
  EstadoVacio,
  MapPin,
  mostrarError,
  Package,
  Pantalla,
  Phone,
  Tarjeta,
  Texto,
} from '@/ui';

import {ChipEnvios} from '../components/ChipEnvios';
import {EstadoGuia} from '../components/EstadoGuia';
import {destinatario} from '../components/FilaGuia';
import {enlaceLlamar, enlaceMapa} from '../domain/contacto';
import {fechaCorta, numero, pesos} from '../domain/formato';
import {
  funciones,
  puedeEntregar,
  puedeReportarNovedad,
} from '../domain/gestion';
import {useDespacho, useGuia} from '../hooks/useDespachos';
import {useConfiguracionEntrega} from '../hooks/useGestion';
import type {RutasDespachos} from '../rutas';

type Props = NativeStackScreenProps<RutasDespachos, 'Guia'>;

const abrir = (url: string) =>
  Linking.openURL(url).catch(() =>
    mostrarError('No encontramos una app para abrir esto.'),
  );

/** Fila etiqueta–valor de la tarjeta de datos. */
function Dato({
  etiqueta,
  children,
  mono = false,
}: {
  etiqueta: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <View style={styles.dato}>
      <Texto tono="secundario" variante="etiqueta">
        {etiqueta}
      </Texto>
      <Texto mono={mono} negrita numerico style={styles.valor}>
        {children}
      </Texto>
    </View>
  );
}

export function GuiaPantalla({navigation, route}: Props) {
  const {tenantDespachoId, codigoGuia} = route.params;
  const {data: guia, isPending} = useGuia(tenantDespachoId, codigoGuia);
  const {data: despacho} = useDespacho(tenantDespachoId);
  const configuracion = useConfiguracionEntrega();
  const volver = () => navigation.goBack();

  if (isPending) {
    return (
      <Pantalla>
        <Cargando />
      </Pantalla>
    );
  }

  if (!guia) {
    return (
      <Pantalla>
        <Encabezado alVolver={volver} />
        <EstadoVacio
          icono={Package}
          mensaje="La empresa la sacó del despacho."
          titulo="Guía no disponible"
        />
      </Pantalla>
    );
  }

  const llamar = enlaceLlamar(guia.telefonoDestinatario);
  const mapa = enlaceMapa(guia);
  const sinDespacho = {permitido: false} as const;
  const entrega = despacho
    ? puedeEntregar(despacho, guia, configuracion)
    : sinDespacho;
  const novedad =
    despacho && funciones.novedades
      ? puedeReportarNovedad(despacho, guia)
      : sinDespacho;

  const acciones =
    entrega.permitido || novedad.permitido ? (
      <>
        <Texto centrado tono="secundario" variante="etiqueta">
          Se guarda en el teléfono aunque no haya señal.
        </Texto>
        <View style={styles.acciones}>
          {novedad.permitido ? (
            <View style={styles.novedad}>
              <Boton
                icono={TriangleAlert}
                tipo="neutro"
                titulo="Novedad"
                onPress={() => navigation.navigate('Novedad', route.params)}
              />
            </View>
          ) : null}
          {entrega.permitido ? (
            <View style={styles.entregar}>
              <Boton
                icono={CircleCheck}
                titulo="Entregar"
                onPress={() => navigation.navigate('Entregar', route.params)}
              />
            </View>
          ) : null}
        </View>
      </>
    ) : undefined;

  const datos = [
    guia.nombreRemitente
      ? {etiqueta: 'Remitente', valor: guia.nombreRemitente}
      : null,
    guia.documentoCliente
      ? {etiqueta: 'Documento', valor: guia.documentoCliente, mono: true}
      : null,
    {
      etiqueta: 'Unidades · peso',
      valor: `${numero(guia.unidades)} · ${numero(guia.pesoReal)} kg`,
    },
    guia.vrRecaudo > 0
      ? {etiqueta: 'Recaudo', valor: pesos(guia.vrRecaudo)}
      : null,
    guia.vrCobroEntrega > 0
      ? {etiqueta: 'Cobro en la entrega', valor: pesos(guia.vrCobroEntrega)}
      : null,
    guia.requiereCita ? {etiqueta: 'Cita', valor: 'Requiere cita'} : null,
    guia.fechaEntrega
      ? {etiqueta: 'Entregada el', valor: fechaCorta(guia.fechaEntrega)}
      : null,
  ].filter(dato => dato !== null);

  return (
    <Pantalla desplazable pie={acciones}>
      <Encabezado
        accion={<ChipEnvios />}
        alVolver={volver}
        titulo={`Guía ${guia.codigoGuia}`}
      />
      <EstadoGuia guia={guia} />

      <Tarjeta style={styles.tarjeta}>
        <View style={styles.fila}>
          <View style={styles.flex}>
            <Texto tono="secundario" variante="pie">
              Destinatario
            </Texto>
            <Texto style={styles.nombre} variante="titulo">
              {destinatario(guia)}
            </Texto>
            {guia.telefonoDestinatario ? (
              <Texto mono tono="secundario" variante="etiqueta">
                {guia.telefonoDestinatario}
              </Texto>
            ) : null}
          </View>
          {llamar ? (
            <BotonIcono
              etiqueta={`Llamar a ${destinatario(guia)}`}
              icono={Phone}
              variante="accion"
              onPress={() => abrir(llamar)}
            />
          ) : null}
        </View>
        {guia.direccionDestinatario || guia.ciudadDestino ? (
          <>
            <View style={styles.separador} />
            <View style={styles.fila}>
              <View style={styles.flex}>
                <Texto tono="secundario" variante="pie">
                  Dirección
                </Texto>
                {guia.direccionDestinatario ? (
                  <Texto media style={styles.direccion}>
                    {guia.direccionDestinatario}
                  </Texto>
                ) : null}
                {guia.ciudadDestino ? (
                  <Texto media style={styles.direccion}>
                    {guia.ciudadDestino}
                  </Texto>
                ) : null}
              </View>
              {mapa ? (
                <BotonIcono
                  etiqueta="Abrir en el mapa"
                  icono={MapPin}
                  variante="suave"
                  onPress={() => abrir(mapa)}
                />
              ) : null}
            </View>
          </>
        ) : null}
      </Tarjeta>

      <Tarjeta style={styles.datos}>
        {datos.map((dato, indice) => (
          <View key={dato.etiqueta}>
            {indice > 0 ? <View style={styles.separador} /> : null}
            <Dato etiqueta={dato.etiqueta} mono={dato.mono}>
              {dato.valor}
            </Dato>
          </View>
        ))}
      </Tarjeta>

      {guia.comentario ? (
        <Tarjeta>
          <Texto tono="secundario" variante="pie">
            Comentario
          </Texto>
          <Texto>{guia.comentario}</Texto>
        </Tarjeta>
      ) : null}
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  flex: {flex: 1, gap: 2},
  tarjeta: {gap: tema.espaciado.md + 2},
  fila: {flexDirection: 'row', alignItems: 'center', gap: tema.espaciado.md},
  nombre: {fontSize: 26, lineHeight: 32, letterSpacing: -0.6},
  direccion: {fontSize: tema.tipografia.tamano.campo, lineHeight: 23},
  separador: {height: 1, backgroundColor: tema.colores.borde},
  datos: {gap: 0, paddingVertical: tema.espaciado.xs},
  dato: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: tema.espaciado.md,
    paddingVertical: tema.espaciado.md - 1,
  },
  valor: {flexShrink: 1, textAlign: 'right'},
  acciones: {flexDirection: 'row', gap: tema.espaciado.sm + 2},
  novedad: {flex: 1},
  entregar: {flex: 1.6},
}));
