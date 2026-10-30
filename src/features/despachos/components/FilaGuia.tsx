import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Insignia, Tarjeta, Texto} from '@/ui';

import type {GuiaLocal} from '../db/repositorio';
import {pesos} from '../domain/formato';
import {EstadoGuia} from './EstadoGuia';

type Props = {guia: GuiaLocal; alPresionar: () => void};

export const destinatario = (guia: {nombreDestinatario: string | null}) =>
  guia.nombreDestinatario?.trim() || 'Sin destinatario';

export function FilaGuia({guia, alPresionar}: Props) {
  const ubicacion = [guia.direccionDestinatario, guia.ciudadDestino]
    .filter(Boolean)
    .join(' · ');
  return (
    <Tarjeta
      alPresionar={alPresionar}
      etiqueta={`Guía ${guia.codigoGuia}, ${destinatario(guia)}`}>
      <View style={styles.fila}>
        <View style={styles.orden}>
          <Texto negrita numerico tono="primario" variante="etiqueta">
            {guia.ordenRuta ?? '–'}
          </Texto>
        </View>
        <View style={styles.datos}>
          <Texto numerico tono="secundario" variante="pie">
            Guía {guia.codigoGuia}
            {guia.documentoCliente ? ` · ${guia.documentoCliente}` : ''}
          </Texto>
          <Texto negrita numberOfLines={1}>
            {destinatario(guia)}
          </Texto>
          {ubicacion ? (
            <Texto numberOfLines={2} tono="secundario" variante="etiqueta">
              {ubicacion}
            </Texto>
          ) : null}
        </View>
      </View>
      <View style={styles.pie}>
        <EstadoGuia guia={guia} />
        {guia.requiereCita ? (
          <Insignia texto="Requiere cita" tono="info" />
        ) : null}
        {guia.vrRecaudo > 0 ? (
          <Insignia
            texto={`Recaudo ${pesos(guia.vrRecaudo)}`}
            tono="primario"
          />
        ) : null}
      </View>
    </Tarjeta>
  );
}

const styles = StyleSheet.create(tema => ({
  fila: {flexDirection: 'row', gap: tema.espaciado.md},
  orden: {
    width: 32,
    height: 32,
    borderRadius: tema.radio.pill,
    backgroundColor: tema.colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datos: {flex: 1, gap: 2},
  pie: {flexDirection: 'row', flexWrap: 'wrap', gap: tema.espaciado.xs},
}));
