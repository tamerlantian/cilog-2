import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {ReactNode} from 'react';
import {Linking, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {
  Boton,
  BotonIcono,
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

import {BarraEnvios} from '../components/BarraEnvios';
import {EstadoGuia} from '../components/EstadoGuia';
import {destinatario} from '../components/FilaGuia';
import {enlaceLlamar, enlaceMapa} from '../domain/contacto';
import {fechaCorta, numero, pesos} from '../domain/formato';
import {situacionGuia} from '../domain/guias';
import {useGuia} from '../hooks/useDespachos';
import type {RutasDespachos} from '../rutas';

type Props = NativeStackScreenProps<RutasDespachos, 'Guia'>;

const abrir = (url: string) =>
  Linking.openURL(url).catch(() =>
    mostrarError('No encontramos una app para abrir esto.'),
  );

function Dato({etiqueta, children}: {etiqueta: string; children: ReactNode}) {
  return (
    <View style={styles.dato}>
      <Texto tono="secundario" variante="etiqueta">
        {etiqueta}
      </Texto>
      <Texto numerico style={styles.valor}>
        {children}
      </Texto>
    </View>
  );
}

export function GuiaPantalla({navigation, route}: Props) {
  const {tenantDespachoId, codigoGuia} = route.params;
  const {data: guia, isPending} = useGuia(tenantDespachoId, codigoGuia);
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
  const pendiente = situacionGuia(guia) === 'pendiente' && !guia.retirada;

  return (
    <Pantalla
      desplazable
      pie={
        pendiente ? (
          <>
            <View style={styles.acciones}>
              <View style={styles.accion}>
                <Boton disabled tipo="secundario" titulo="Novedad" />
              </View>
              <View style={styles.accion}>
                <Boton disabled titulo="Entregar" />
              </View>
            </View>
            <Texto centrado tono="secundario" variante="pie">
              Entregar y reportar novedades llega en la próxima versión.
            </Texto>
          </>
        ) : undefined
      }>
      <Encabezado
        alVolver={volver}
        subtitulo={`Guía ${guia.codigoGuia}`}
        titulo={destinatario(guia)}
      />
      <BarraEnvios sangria={false} />
      <EstadoGuia guia={guia} />

      <Tarjeta>
        <View style={styles.contacto}>
          <View style={styles.direccion}>
            <Texto negrita>{destinatario(guia)}</Texto>
            {guia.direccionDestinatario ? (
              <Texto>{guia.direccionDestinatario}</Texto>
            ) : null}
            {guia.ciudadDestino ? (
              <Texto tono="secundario">{guia.ciudadDestino}</Texto>
            ) : null}
            {guia.telefonoDestinatario ? (
              <Texto numerico tono="secundario">
                {guia.telefonoDestinatario}
              </Texto>
            ) : null}
          </View>
          {llamar ? (
            <BotonIcono
              etiqueta="Llamar al destinatario"
              icono={Phone}
              variante="suave"
              onPress={() => abrir(llamar)}
            />
          ) : null}
          {mapa ? (
            <BotonIcono
              etiqueta="Abrir en el mapa"
              icono={MapPin}
              variante="suave"
              onPress={() => abrir(mapa)}
            />
          ) : null}
        </View>
      </Tarjeta>

      <Tarjeta>
        {guia.documentoCliente ? (
          <Dato etiqueta="Documento">{guia.documentoCliente}</Dato>
        ) : null}
        {guia.nombreRemitente ? (
          <Dato etiqueta="Remitente">{guia.nombreRemitente}</Dato>
        ) : null}
        <Dato etiqueta="Unidades">{numero(guia.unidades)}</Dato>
        <Dato etiqueta="Peso">{numero(guia.pesoReal)} kg</Dato>
        {guia.vrRecaudo > 0 ? (
          <Dato etiqueta="Recaudo">{pesos(guia.vrRecaudo)}</Dato>
        ) : null}
        {guia.vrCobroEntrega > 0 ? (
          <Dato etiqueta="Cobro en la entrega">
            {pesos(guia.vrCobroEntrega)}
          </Dato>
        ) : null}
        {guia.requiereCita ? <Dato etiqueta="Cita">Requiere cita</Dato> : null}
        {guia.fechaEntrega ? (
          <Dato etiqueta="Entregada el">{fechaCorta(guia.fechaEntrega)}</Dato>
        ) : null}
      </Tarjeta>

      {guia.comentario ? (
        <Tarjeta>
          <Texto tono="secundario" variante="etiqueta">
            Comentario
          </Texto>
          <Texto>{guia.comentario}</Texto>
        </Tarjeta>
      ) : null}
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  contacto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.sm,
  },
  direccion: {flex: 1, gap: 2},
  dato: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: tema.espaciado.md,
  },
  valor: {flexShrink: 1, textAlign: 'right'},
  acciones: {flexDirection: 'row', gap: tema.espaciado.md},
  accion: {flex: 1},
}));
