import {useNetInfo} from '@react-native-community/netinfo';
import {Pressable, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {
  ChevronRight,
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

type Tono = 'neutro' | 'info' | 'advertencia' | 'peligro';

const presentar = (
  estado: Exclude<EstadoBarra, {tipo: 'oculta'}>,
): {texto: string; tono: Tono; icono: TipoIcono} => {
  const porEnviar = `${estado.total} por enviar`;
  switch (estado.tipo) {
    case 'problemas':
      return {
        texto: `${plural(estado.problemas, 'envío no se pudo enviar', 'envíos no se pudieron enviar')} · revisar`,
        tono: 'peligro',
        icono: TriangleAlert,
      };
    case 'pausada':
      return {
        texto: `${porEnviar} · inicia sesión para enviar`,
        tono: 'advertencia',
        icono: UserRound,
      };
    case 'enviando':
      return {texto: `Enviando ${estado.total}…`, tono: 'info', icono: Send};
    case 'porEnviar':
      return estado.sinConexion
        ? {
            texto: `Sin conexión · ${porEnviar}`,
            tono: 'advertencia',
            icono: CloudOff,
          }
        : {texto: porEnviar, tono: 'neutro', icono: Send};
  }
};

type Props = {
  /** Margen lateral propio; sin él, en pantallas cuyo contenido ya tiene margen. */
  sangria?: boolean;
};

/** Aparece cuando hay algo sin confirmar en la cola; lleva a Envíos. */
export function BarraEnvios({sangria = true}: Props) {
  const navegacion = useNavegacionDespachos();
  const {data: resumen} = useResumenEnvios();
  const {isConnected} = useNetInfo();
  const estado = estadoBarra(resumen ?? {}, isConnected === false);

  const presentacion = estado.tipo === 'oculta' ? null : presentar(estado);
  styles.useVariants({tono: presentacion?.tono ?? 'neutro', sangria});

  if (!presentacion) return null;
  const {texto, tono, icono} = presentacion;
  const color = tono === 'neutro' ? 'textoSecundario' : tono;

  return (
    <Pressable
      accessibilityHint="Abre la lista de envíos"
      accessibilityLabel={texto}
      accessibilityRole="button"
      style={({pressed}) => [styles.barra, pressed && styles.presionada]}
      onPress={() => navegacion.navigate('Envios')}>
      <Icono color={color} icono={icono} tamano={18} />
      <View style={styles.texto}>
        <Texto
          negrita
          tono={tono === 'neutro' ? 'secundario' : tono}
          variante="etiqueta">
          {texto}
        </Texto>
      </View>
      <Icono color={color} icono={ChevronRight} tamano={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create(tema => ({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.sm,
    minHeight: tema.alto.botonCompacto,
    paddingHorizontal: tema.espaciado.md,
    borderRadius: tema.radio.md,
    variants: {
      sangria: {
        true: {marginHorizontal: tema.espaciado.lg},
        false: {},
      },
      tono: {
        neutro: {backgroundColor: tema.colores.superficie},
        info: {backgroundColor: tema.colores.infoSuave},
        advertencia: {backgroundColor: tema.colores.advertenciaSuave},
        peligro: {backgroundColor: tema.colores.peligroSuave},
      },
    },
  },
  presionada: {opacity: 0.85},
  texto: {flex: 1},
}));
