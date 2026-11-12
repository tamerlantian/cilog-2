import {Pressable, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Check, Icono, Insignia, Texto} from '@/ui';

import type {GuiaLocal} from '../db/repositorio';
import {pesos} from '../domain/formato';
import {aCobrar} from '../domain/gestion';
import {situacionGuia} from '../domain/guias';
import {EstadoGuia} from './EstadoGuia';

/**
 * Modo selección de la lista: la parada se vuelve casilla. `disponible` es
 * false si la guía no se puede gestionar (ya entregada, retirada…).
 */
export type SeleccionFila = {marcada: boolean; disponible: boolean};

type Props = {
  guia: GuiaLocal;
  alPresionar: () => void;
  /** Pulsación larga: entra al modo selección. */
  alMantener?: () => void;
  seleccion?: SeleccionFila;
};

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
export function FilaGuia({guia, alPresionar, alMantener, seleccion}: Props) {
  const ubicacion = ubicacionGuia(guia);
  const cobro = aCobrar(guia);
  const pendiente = situacionGuia(guia) === 'pendiente';
  const marcada = seleccion?.marcada ?? false;
  return (
    <Pressable
      accessibilityLabel={`Guía ${guia.codigoGuia}, ${destinatario(guia)}`}
      accessibilityRole={seleccion ? 'checkbox' : 'button'}
      accessibilityState={
        seleccion
          ? {checked: marcada, disabled: !seleccion.disponible}
          : undefined
      }
      delayLongPress={350}
      style={({pressed}) => [
        styles.fila,
        seleccion && !seleccion.disponible && styles.noDisponible,
        pressed && styles.presionada,
      ]}
      onLongPress={alMantener}
      onPress={alPresionar}>
      <View style={styles.ruta}>
        <View
          style={[
            styles.parada,
            seleccion && styles.casilla,
            marcada && styles.marcada,
          ]}>
          {seleccion ? (
            marcada ? (
              <Icono color="sobreAccion" grosor={3} icono={Check} tamano={15} />
            ) : null
          ) : guia.ordenRuta === null ? (
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
  noDisponible: {opacity: 0.45},
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
  casilla: {borderWidth: 2, borderColor: tema.colores.bordeCampo},
  marcada: {borderWidth: 0, backgroundColor: tema.colores.accion},
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
