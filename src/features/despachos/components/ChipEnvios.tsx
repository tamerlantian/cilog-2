import {useNetInfo} from '@react-native-community/netinfo';
import {Pressable, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {
  CloudOff,
  Icono,
  Send,
  Texto,
  TriangleAlert,
  UserRound,
  type TipoIcono,
} from '@/ui';

import {estadoBarra, plural, type EstadoBarra} from '../domain/envios';
import {useResumenEnvios} from '../hooks/useEnvios';
import {useNavegacionDespachos} from '../hooks/useNavegacionDespachos';

type Tono = 'info' | 'advertencia' | 'peligro';

type Presentacion = {
  /** Lo que se ve en el chip: corto, para que quepa en el encabezado. */
  corto: string;
  /** Lo que lee el lector de pantalla. */
  completo: string;
  tono: Tono;
  icono: TipoIcono;
};

const presentar = (
  estado: Exclude<EstadoBarra, {tipo: 'oculta'}>,
): Presentacion => {
  const porEnviar = `${estado.total} por enviar`;
  switch (estado.tipo) {
    case 'problemas':
      return {
        corto: plural(estado.problemas, 'falló', 'fallaron'),
        completo: `${plural(estado.problemas, 'envío no se pudo enviar', 'envíos no se pudieron enviar')} · revisar`,
        tono: 'peligro',
        icono: TriangleAlert,
      };
    case 'pausada':
      return {
        corto: `${estado.total} en pausa`,
        completo: `${porEnviar} · inicia sesión para enviar`,
        tono: 'advertencia',
        icono: UserRound,
      };
    case 'enviando':
      return {
        corto: `Enviando ${estado.total}`,
        completo: `Enviando ${estado.total}…`,
        tono: 'info',
        icono: Send,
      };
    case 'porEnviar':
      return estado.sinConexion
        ? {
            corto: `Sin señal · ${estado.total}`,
            completo: `Sin conexión · ${porEnviar}`,
            tono: 'advertencia',
            icono: CloudOff,
          }
        : {corto: porEnviar, completo: porEnviar, tono: 'info', icono: Send};
  }
};

/**
 * Estado de la cola en el encabezado: aparece solo cuando hay algo sin
 * confirmar y lleva a Envíos. Va en el `accion` de `Encabezado`.
 */
export function ChipEnvios() {
  const navegacion = useNavegacionDespachos();
  const {data: resumen} = useResumenEnvios();
  const {isConnected} = useNetInfo();
  const estado = estadoBarra(resumen ?? {}, isConnected === false);

  const presentacion = estado.tipo === 'oculta' ? null : presentar(estado);
  styles.useVariants({tono: presentacion?.tono ?? 'info'});

  if (!presentacion) return null;
  const {corto, completo, tono, icono} = presentacion;

  return (
    <Pressable
      accessibilityHint="Abre la lista de envíos"
      accessibilityLabel={completo}
      accessibilityRole="button"
      style={({pressed}) => [styles.toque, pressed && styles.presionado]}
      onPress={() => navegacion.navigate('Inicio', {screen: 'Envios'})}>
      <View style={styles.chip}>
        <Icono color={tono} grosor={2.2} icono={icono} tamano={15} />
        <Texto negrita numberOfLines={1} tono={tono} variante="etiqueta">
          {corto}
        </Texto>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create(tema => ({
  // El chip se ve de 30, pero el área de toque es de 44.
  toque: {
    flexShrink: 0,
    minHeight: tema.alto.botonCompacto,
    justifyContent: 'center',
  },
  presionado: {opacity: 0.7},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.xs + 2,
    height: 30,
    paddingHorizontal: tema.espaciado.sm + 2,
    borderRadius: tema.radio.pill,
    variants: {
      tono: {
        info: {backgroundColor: tema.colores.infoSuave},
        advertencia: {backgroundColor: tema.colores.advertenciaSuave},
        peligro: {backgroundColor: tema.colores.peligroSuave},
      },
    },
  },
}));
