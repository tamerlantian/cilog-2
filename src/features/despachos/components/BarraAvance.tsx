import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Texto} from '@/ui';

import {plural} from '../domain/envios';

type Props = {
  entregadas: number;
  novedades: number;
  total: number;
  /** `gruesa` para la tarjeta destacada; `fina` bajo un resumen. */
  grosor?: 'gruesa' | 'fina';
  /** Muestra la leyenda con las cifras debajo. */
  leyenda?: boolean;
};

const porcentaje = (parte: number, total: number): `${number}%` =>
  total > 0 ? `${(parte / total) * 100}%` : '0%';

/** Avance de un despacho: entregadas y novedades sobre el total de guías. */
export function BarraAvance({
  entregadas,
  novedades,
  total,
  grosor = 'fina',
  leyenda = false,
}: Props) {
  styles.useVariants({grosor});
  const pendientes = total - entregadas - novedades;
  return (
    <View style={styles.contenedor}>
      <View
        accessibilityLabel={`${entregadas} entregadas, ${novedades} con novedad y ${pendientes} pendientes de ${total} guías`}
        accessibilityRole="progressbar"
        accessible
        style={styles.barra}>
        <View
          style={[
            styles.entregadas,
            styles.ancho(porcentaje(entregadas, total)),
          ]}
        />
        <View
          style={[styles.novedades, styles.ancho(porcentaje(novedades, total))]}
        />
      </View>
      {leyenda ? (
        <Leyenda entregadas={entregadas} novedades={novedades} />
      ) : null}
    </View>
  );
}

/** Cifras con su color, igual que en la barra. */
export function Leyenda({
  entregadas,
  novedades,
}: {
  entregadas: number;
  novedades: number;
}) {
  return (
    <View style={styles.leyenda}>
      <View style={styles.item}>
        <View style={[styles.muestra, styles.entregadas]} />
        <Texto numerico tono="secundario" variante="pie">
          {plural(entregadas, 'entregada', 'entregadas')}
        </Texto>
      </View>
      <View style={styles.item}>
        <View style={[styles.muestra, styles.novedades]} />
        <Texto numerico tono="secundario" variante="pie">
          {plural(novedades, 'novedad', 'novedades')}
        </Texto>
      </View>
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  contenedor: {gap: tema.espaciado.sm + 2},
  barra: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: tema.radio.pill,
    backgroundColor: tema.colores.borde,
    variants: {
      grosor: {
        gruesa: {height: 10},
        fina: {height: 6},
      },
    },
  },
  // El avance va en el color del texto: navy sobre claro, blanco sobre la marca.
  entregadas: {backgroundColor: tema.colores.texto},
  novedades: {backgroundColor: tema.colores.advertenciaRelleno},
  ancho: (ancho: `${number}%`) => ({width: ancho}),
  leyenda: {flexDirection: 'row', gap: tema.espaciado.md + 2},
  item: {flexDirection: 'row', alignItems: 'center', gap: 5},
  muestra: {width: 8, height: 8, borderRadius: 2},
}));
