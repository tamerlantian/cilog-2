import {
  type ComponentRef,
  type Ref,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {PanResponder, View} from 'react-native';
import {StyleSheet, useUnistyles} from 'react-native-unistyles';
import Svg, {Path} from 'react-native-svg';
import {captureRef} from 'react-native-view-shot';

import {Texto} from './Texto';

export type ControlFirma = {
  /** Guarda la firma como PNG temporal; null si no hay trazos. */
  capturar: () => Promise<string | null>;
  limpiar: () => void;
};

type Props = {
  ref?: Ref<ControlFirma>;
  /** Avisa si hay algo dibujado, para habilitar "Listo". */
  alCambiar?: (conTrazos: boolean) => void;
  /** Bajo la línea: quién firma ("María Pérez · Titular"). No sale en la imagen. */
  leyenda?: string;
};

/** Superficie para firmar con el dedo. Siempre tinta negra sobre blanco. */
export function PanelFirma({ref, alCambiar, leyenda = 'Firma aquí'}: Props) {
  const {theme} = useUnistyles();
  const lienzo = useRef<ComponentRef<typeof View>>(null);
  const [trazos, setTrazos] = useState<string[]>([]);
  const [actual, setActual] = useState('');
  const avisar = useRef(alCambiar);
  useEffect(() => {
    avisar.current = alCambiar;
  }, [alCambiar]);

  // El trazo en curso vive en una ref: los eventos del dedo llegan más rápido que los renders.
  const enCurso = useRef('');
  const gestos = useMemo(() => {
    const punto = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: ({nativeEvent}) => {
        enCurso.current = `M${punto(nativeEvent.locationX, nativeEvent.locationY)}`;
        setActual(enCurso.current);
      },
      onPanResponderMove: ({nativeEvent}) => {
        enCurso.current += ` L${punto(nativeEvent.locationX, nativeEvent.locationY)}`;
        setActual(enCurso.current);
      },
      onPanResponderRelease: () => {
        const trazo = enCurso.current;
        enCurso.current = '';
        setActual('');
        if (!trazo) return;
        setTrazos(previos => [...previos, trazo]);
        avisar.current?.(true);
      },
    });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      capturar: async () => {
        if (trazos.length === 0 || !lienzo.current) return null;
        return captureRef(lienzo, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
        });
      },
      limpiar: () => {
        enCurso.current = '';
        setTrazos([]);
        setActual('');
        avisar.current?.(false);
      },
    }),
    [trazos],
  );

  return (
    <View
      accessibilityLabel="Espacio para firmar"
      style={styles.marco}
      {...gestos.panHandlers}>
      {/* Se captura solo el papel: sin el borde, las esquinas ni la línea guía. */}
      <View ref={lienzo} collapsable={false} style={styles.papel}>
        <Svg height="100%" width="100%">
          {[...trazos, actual].filter(Boolean).map((trazo, indice) => (
            <Path
              key={indice}
              d={trazo}
              fill="none"
              stroke={theme.colores.tinta}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
            />
          ))}
        </Svg>
      </View>
      <View pointerEvents="none" style={styles.guia}>
        <Texto style={styles.textoGuia} variante="pie">
          {leyenda}
        </Texto>
      </View>
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  marco: {
    flex: 1,
    minHeight: 200,
    borderRadius: tema.radio.lg,
    borderWidth: 1.5,
    borderColor: tema.colores.borde,
    backgroundColor: tema.colores.papel,
    overflow: 'hidden',
  },
  papel: {flex: 1, backgroundColor: tema.colores.papel},
  guia: {
    position: 'absolute',
    left: tema.espaciado.lg,
    right: tema.espaciado.lg,
    bottom: tema.espaciado.lg,
    borderTopWidth: 1,
    borderTopColor: tema.colores.borde,
    paddingTop: tema.espaciado.xs,
  },
  textoGuia: {color: tema.colores.sobreDeshabilitado},
}));
