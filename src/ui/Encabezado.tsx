import type {ReactNode} from 'react';
import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {ChevronLeft, X} from './iconos';
import {BotonIcono} from './BotonIcono';
import {Texto} from './Texto';

type Props = {
  alVolver?: () => void;
  /** `cerrar` para flujos que se abandonan (entrega, novedad); `volver` para navegar atrás. */
  tipoVolver?: 'volver' | 'cerrar';
  titulo?: string;
  /** Línea pequeña sobre el título (empresa, contexto). */
  subtitulo?: string;
  /** Código bajo el título, en mono ("777001 · $ 18.000 por cobrar"). */
  detalle?: string;
  accion?: ReactNode;
  /** Título de pantalla principal (las de pestaña): grande y sin volver. */
  grande?: boolean;
  /** Margen lateral propio; sin él, en pantallas cuyo contenido ya tiene margen. */
  sangria?: boolean;
};

/** Barra superior de una pantalla interna. Va dentro de `Pantalla`, que ya respeta la safe area. */
export function Encabezado({
  alVolver,
  tipoVolver = 'volver',
  titulo,
  subtitulo,
  detalle,
  accion,
  grande = false,
  sangria = true,
}: Props) {
  if (grande) {
    return (
      <View style={[styles.fila, styles.grande, sangria && styles.sangria]}>
        <Texto
          accessibilityRole="header"
          style={styles.textos}
          variante="display">
          {titulo}
        </Texto>
        {accion}
      </View>
    );
  }
  return (
    <View style={styles.fila}>
      {alVolver ? (
        <BotonIcono
          etiqueta={tipoVolver === 'cerrar' ? 'Cerrar' : 'Volver'}
          icono={tipoVolver === 'cerrar' ? X : ChevronLeft}
          onPress={alVolver}
        />
      ) : null}
      <View style={styles.textos}>
        {subtitulo ? (
          <Texto tono="secundario" variante="pie">
            {subtitulo}
          </Texto>
        ) : null}
        {titulo ? (
          <Texto negrita numberOfLines={1} style={styles.titulo}>
            {titulo}
          </Texto>
        ) : null}
        {detalle ? (
          <Texto mono numberOfLines={1} tono="secundario" variante="pie">
            {detalle}
          </Texto>
        ) : null}
      </View>
      {accion}
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.sm,
    minHeight: 52,
    paddingHorizontal: tema.espaciado.md,
  },
  textos: {flex: 1, gap: 1},
  grande: {
    paddingHorizontal: 0,
    paddingTop: tema.espaciado.xl,
    paddingBottom: tema.espaciado.sm,
  },
  sangria: {paddingHorizontal: tema.espaciado.lg + 4},
  titulo: {fontSize: tema.tipografia.tamano.campo},
}));
