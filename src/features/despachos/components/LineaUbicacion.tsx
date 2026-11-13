import {Pressable, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Icono, MapPinOff, Texto} from '@/ui';

import type {IndicadorUbicacion} from '../domain/rastreo';

type Props = {
  indicador: IndicadorUbicacion;
  /** Nombre de la empresa del despacho, o null si no se conoce. */
  empresa: string | null;
  alResolver: () => void;
};

const PROBLEMAS: Record<
  Exclude<IndicadorUbicacion, 'activa'>,
  {texto: string; accion: string}
> = {
  sinPermiso: {texto: 'Sin permiso: la empresa no te ve', accion: 'Permitir'},
  gpsApagado: {texto: 'GPS apagado: la empresa no te ve', accion: 'Activar'},
  bateria: {
    texto: 'El ahorro de batería puede apagarla',
    accion: 'Revisar',
  },
};

/** Estado de la ubicación junto al avance del despacho, con la acción si falta algo. */
export function LineaUbicacion({indicador, empresa, alResolver}: Props) {
  if (indicador === 'activa') {
    return (
      <View accessibilityRole="text" style={styles.fila}>
        <View style={styles.halo}>
          <View style={styles.punto} />
        </View>
        <Texto style={styles.texto} tono="secundario" variante="etiqueta">
          {`Ubicación en vivo para ${empresa ?? 'la empresa'}`}
        </Texto>
      </View>
    );
  }

  const {texto, accion} = PROBLEMAS[indicador];
  return (
    <View accessibilityRole="alert" style={styles.fila}>
      <Icono color="advertencia" icono={MapPinOff} tamano={16} />
      <Texto style={styles.texto} tono="advertencia" variante="etiqueta">
        {texto}
      </Texto>
      <Pressable
        accessibilityLabel={`${accion}: ${texto}`}
        accessibilityRole="button"
        hitSlop={8}
        style={styles.accion}
        onPress={alResolver}>
        <Texto media style={styles.enlace} variante="etiqueta">
          {accion}
        </Texto>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.sm,
    minHeight: 32,
  },
  halo: {
    width: 16,
    height: 16,
    borderRadius: tema.radio.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tema.colores.infoSuave,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: tema.radio.pill,
    backgroundColor: tema.colores.info,
  },
  texto: {flex: 1},
  accion: {minHeight: 32, justifyContent: 'center', paddingHorizontal: 4},
  enlace: {textDecorationLine: 'underline'},
}));
