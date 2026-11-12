import {Pressable, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Boton, Texto} from '@/ui';

import type {GuiaLocal} from '../db/repositorio';
import {aCobrar} from '../domain/gestion';
import {Cobro} from './Cobro';
import {destinatario, referenciaGuia, ubicacionGuia} from './FilaGuia';
import {TarjetaDestacada} from './TarjetaDestacada';

type Props = {
  guia: GuiaLocal;
  alAbrir: () => void;
  /** Sin la función, el botón no se muestra (la guía no lo permite). */
  alEntregar?: () => void;
  alReportarNovedad?: () => void;
};

/** La próxima parada pendiente, con las dos acciones a la mano. */
export function SiguienteGuia({
  guia,
  alAbrir,
  alEntregar,
  alReportarNovedad,
}: Props) {
  const cobro = aCobrar(guia);
  const ubicacion = ubicacionGuia(guia);
  return (
    <TarjetaDestacada etiqueta="Siguiente entrega">
      <Pressable
        accessibilityLabel={`Guía ${guia.codigoGuia}, ${destinatario(guia)}`}
        accessibilityRole="button"
        style={({pressed}) => [styles.datos, pressed && styles.presionada]}
        onPress={alAbrir}>
        <View style={styles.cabecera}>
          <Texto tono="secundario" variante="pie">
            Siguiente
          </Texto>
          {cobro > 0 ? <Cobro monto={cobro} /> : null}
        </View>
        <Texto numberOfLines={2} style={styles.nombre} variante="titulo">
          {destinatario(guia)}
        </Texto>
        {ubicacion ? (
          <Texto numberOfLines={2} tono="secundario" variante="etiqueta">
            {ubicacion}
          </Texto>
        ) : null}
        <Texto mono tono="secundario" variante="pie">
          {referenciaGuia(guia)}
        </Texto>
      </Pressable>
      {alEntregar || alReportarNovedad ? (
        <View style={styles.acciones}>
          {alReportarNovedad ? (
            <View style={styles.novedad}>
              <Boton
                tamano="compacto"
                tipo="neutro"
                titulo="Novedad"
                onPress={alReportarNovedad}
              />
            </View>
          ) : null}
          {alEntregar ? (
            <View style={styles.entregar}>
              <Boton tamano="compacto" titulo="Entregar" onPress={alEntregar} />
            </View>
          ) : null}
        </View>
      ) : null}
    </TarjetaDestacada>
  );
}

const styles = StyleSheet.create(tema => ({
  datos: {gap: tema.espaciado.xs},
  presionada: {opacity: 0.7},
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nombre: {fontSize: 22, lineHeight: 28, letterSpacing: -0.3},
  acciones: {flexDirection: 'row', gap: tema.espaciado.sm},
  novedad: {flex: 1},
  entregar: {flex: 1.4},
}));
