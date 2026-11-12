import {Pressable, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Insignia, Texto} from '@/ui';

import type {GuiaLocal} from '../db/repositorio';
import {pesos} from '../domain/formato';
import {aCobrar} from '../domain/gestion';
import {situacionGuia} from '../domain/guias';
import {EstadoGuia} from './EstadoGuia';

type Props = {guia: GuiaLocal; alPresionar: () => void};

export const destinatario = (guia: {nombreDestinatario: string | null}) =>
  guia.nombreDestinatario?.trim() || 'Sin destinatario';

export const ubicacionGuia = (guia: {
  direccionDestinatario: string | null;
  ciudadDestino: string | null;
}) =>
  [guia.direccionDestinatario, guia.ciudadDestino].filter(Boolean).join(' · ');

/** "777001 · 3 und": guía y unidades, como en el manifiesto. */
export const referenciaGuia = (guia: {codigoGuia: number; unidades: number}) =>
  `${guia.codigoGuia} · ${guia.unidades} und`;

/** Parada de la ruta: número de orden en una línea de tiempo y los datos de la guía. */
export function FilaGuia({guia, alPresionar}: Props) {
  const ubicacion = ubicacionGuia(guia);
  const cobro = aCobrar(guia);
  const pendiente = situacionGuia(guia) === 'pendiente';
  return (
    <Pressable
      accessibilityLabel={`Guía ${guia.codigoGuia}, ${destinatario(guia)}`}
      accessibilityRole="button"
      style={({pressed}) => [styles.fila, pressed && styles.presionada]}
      onPress={alPresionar}>
      <View style={styles.ruta}>
        <View style={styles.parada}>
          {guia.ordenRuta === null ? (
            <View style={styles.punto} />
          ) : (
            <Texto mono numerico style={styles.numero}>
              {guia.ordenRuta}
            </Texto>
          )}
        </View>
        <View style={styles.linea} />
      </View>
      <View style={styles.datos}>
        <View style={styles.cabecera}>
          <Texto negrita numberOfLines={1} style={styles.nombre}>
            {destinatario(guia)}
          </Texto>
          <Texto
            media={cobro === 0}
            negrita={cobro > 0}
            numerico
            tono={cobro > 0 ? 'advertencia' : 'secundario'}
            variante="etiqueta">
            {cobro > 0 ? pesos(cobro) : 'Sin cobro'}
          </Texto>
        </View>
        {ubicacion ? (
          <Texto numberOfLines={1} tono="secundario" variante="etiqueta">
            {ubicacion}
          </Texto>
        ) : null}
        <Texto mono tono="secundario" variante="pie">
          {referenciaGuia(guia)}
          {guia.documentoCliente ? ` · ${guia.documentoCliente}` : ''}
        </Texto>
        {!pendiente || guia.envio || guia.retirada || guia.requiereCita ? (
          <View style={styles.insignias}>
            {!pendiente || guia.envio || guia.retirada ? (
              <EstadoGuia guia={guia} />
            ) : null}
            {guia.requiereCita ? (
              <Insignia texto="Requiere cita" tono="info" />
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create(tema => ({
  fila: {flexDirection: 'row', gap: tema.espaciado.md},
  presionada: {opacity: 0.6},
  ruta: {width: 26, alignItems: 'center'},
  parada: {
    width: 26,
    height: 26,
    borderRadius: tema.radio.pill,
    borderWidth: 1,
    borderColor: tema.colores.borde,
    backgroundColor: tema.colores.fondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: {fontSize: 11, lineHeight: 14},
  punto: {
    width: 6,
    height: 6,
    borderRadius: tema.radio.pill,
    backgroundColor: tema.colores.textoSecundario,
  },
  linea: {flex: 1, width: 2, backgroundColor: tema.colores.borde},
  datos: {
    flex: 1,
    minHeight: 66,
    gap: 2,
    paddingTop: 2,
    paddingBottom: tema.espaciado.md,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.sm,
  },
  nombre: {flex: 1},
  insignias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tema.espaciado.xs,
    paddingTop: tema.espaciado.xs,
  },
}));
