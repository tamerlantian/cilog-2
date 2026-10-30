import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {
  CircleCheck,
  Clock,
  Insignia,
  Send,
  TriangleAlert,
  type TipoIcono,
} from '@/ui';

import type {EnvioGuia} from '../db/repositorio';
import {situacionGuia, type DatosGuia, type Situacion} from '../domain/guias';

const SITUACION: Record<
  Situacion,
  {texto: string; tono: 'neutro' | 'exito' | 'advertencia'; icono: TipoIcono}
> = {
  pendiente: {texto: 'Pendiente', tono: 'neutro', icono: Clock},
  entregada: {texto: 'Entregada', tono: 'exito', icono: CircleCheck},
  novedad: {texto: 'Con novedad', tono: 'advertencia', icono: TriangleAlert},
};

type Props = {guia: DatosGuia & {envio: EnvioGuia; retirada: boolean}};

/** Qué pasó con la guía y si eso ya llegó a Fluor (docs/offline.md §13). */
export function EstadoGuia({guia}: Props) {
  const situacion = SITUACION[situacionGuia(guia)];
  return (
    <View style={styles.fila}>
      <Insignia {...situacion} />
      {guia.envio === 'porEnviar' ? (
        <Insignia icono={Send} texto="Por enviar" tono="info" />
      ) : null}
      {guia.envio === 'conProblema' ? (
        <Insignia
          icono={TriangleAlert}
          texto="No se pudo enviar"
          tono="peligro"
        />
      ) : null}
      {guia.retirada ? (
        <Insignia texto="Retirada del despacho" tono="advertencia" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  fila: {flexDirection: 'row', flexWrap: 'wrap', gap: tema.espaciado.xs},
}));
