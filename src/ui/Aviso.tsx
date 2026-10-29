import type {ReactNode} from 'react';
import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Icono, type TipoIcono} from './Icono';
import {Texto} from './Texto';

type Tono = 'info' | 'exito' | 'advertencia' | 'peligro';

type Props = {
  tono: Tono;
  icono: TipoIcono;
  titulo?: string;
  mensaje: ReactNode;
  /** Acción opcional debajo del texto (p. ej. un `Boton` compacto). */
  children?: ReactNode;
};

/**
 * Aviso dentro de la pantalla, junto a lo que lo causó. Para problemas que el
 * usuario debe resolver aquí; los avisos pasajeros van en un toast.
 */
export function Aviso({tono, icono, titulo, mensaje, children}: Props) {
  styles.useVariants({tono});
  const urgente = tono === 'advertencia' || tono === 'peligro';
  return (
    <View
      accessibilityRole={urgente ? 'alert' : 'summary'}
      style={styles.contenedor}>
      <View style={styles.fila}>
        <View style={styles.circulo}>
          <Icono color={tono} icono={icono} tamano={20} />
        </View>
        <View style={styles.textos}>
          {titulo ? (
            <Texto negrita tono={tono}>
              {titulo}
            </Texto>
          ) : null}
          <Texto variante="etiqueta">{mensaje}</Texto>
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  contenedor: {
    borderRadius: tema.radio.lg,
    borderWidth: 1,
    padding: tema.espaciado.lg,
    gap: tema.espaciado.md,
    variants: {
      tono: {
        info: {
          backgroundColor: tema.colores.infoSuave,
          borderColor: tema.colores.infoSuave,
        },
        exito: {
          backgroundColor: tema.colores.exitoSuave,
          borderColor: tema.colores.exitoSuave,
        },
        advertencia: {
          backgroundColor: tema.colores.advertenciaSuave,
          borderColor: tema.colores.advertenciaBorde,
        },
        peligro: {
          backgroundColor: tema.colores.peligroSuave,
          borderColor: tema.colores.peligroSuave,
        },
      },
    },
  },
  fila: {flexDirection: 'row', gap: tema.espaciado.md},
  circulo: {
    width: 40,
    height: 40,
    borderRadius: tema.radio.pill,
    backgroundColor: tema.colores.fondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {flex: 1, gap: 2, justifyContent: 'center'},
}));
