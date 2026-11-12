import {useState} from 'react';
import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Boton, Tarjeta, Texto} from '@/ui';

import type {GuiaLocal} from '../db/repositorio';
import {plural} from '../domain/envios';
import {destinatarioComun} from '../domain/gestion';
import {destinatario, referenciaGuia} from './FilaGuia';

/** Filas visibles antes de "Ver más": la tarjeta no debe tapar las fotos. */
export const FILAS_VISIBLES = 3;

/**
 * Las guías de una entrega múltiple, sin ocupar la pantalla. Con un solo
 * destinatario (el caso normal: varios paquetes del mismo cliente) basta una
 * línea; si son varios, se muestran las primeras y el resto bajo "Ver más".
 */
export function ResumenGuias({guias}: {guias: readonly GuiaLocal[]}) {
  const [abierto, setAbierto] = useState(false);
  const comun = destinatarioComun(guias);
  const unidades = guias.reduce((total, g) => total + g.unidades, 0);
  const ocultas = guias.length - FILAS_VISIBLES;
  const visibles =
    abierto || ocultas <= 0 ? guias : guias.slice(0, FILAS_VISIBLES);

  return (
    <Tarjeta style={styles.tarjeta}>
      <Texto tono="secundario" variante="pie">
        La misma evidencia queda en cada guía
      </Texto>
      {comun ? (
        <View style={styles.fila}>
          <Texto negrita numberOfLines={1} style={styles.nombre}>
            {comun}
          </Texto>
          <Texto mono tono="secundario" variante="pie">
            {plural(guias.length, 'guía', 'guías')} · {unidades} und
          </Texto>
        </View>
      ) : (
        <>
          {visibles.map(g => (
            <View key={g.codigoGuia} style={styles.fila}>
              <Texto negrita numberOfLines={1} style={styles.nombre}>
                {destinatario(g)}
              </Texto>
              <Texto mono tono="secundario" variante="pie">
                {referenciaGuia(g)}
              </Texto>
            </View>
          ))}
          {ocultas > 0 ? (
            <View style={styles.ver}>
              <Boton
                tamano="compacto"
                tipo="texto"
                titulo={abierto ? 'Ver menos' : `Ver ${ocultas} más`}
                onPress={() => setAbierto(actual => !actual)}
              />
            </View>
          ) : null}
        </>
      )}
    </Tarjeta>
  );
}

const styles = StyleSheet.create(tema => ({
  tarjeta: {gap: tema.espaciado.xs},
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tema.espaciado.sm,
  },
  nombre: {flex: 1},
  ver: {alignItems: 'flex-start'},
}));
