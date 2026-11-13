import {useRef} from 'react';
import {Modal, View} from 'react-native';
import {Camera, CameraType, type CodeFormat} from 'react-native-camera-kit';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StyleSheet, useUnistyles} from 'react-native-unistyles';

import {Encabezado, mostrarError, Pantalla, Texto} from '@/ui';

type Props = {
  alLeer: (codigo: string) => void;
  alCerrar: () => void;
  titulo?: string;
  ayuda?: string;
  /** `qr` usa un visor cuadrado y solo lee QR; `barras`, el rectangular de la librería. */
  forma?: 'qr' | 'barras';
};

/**
 * En Android el visor también filtra: solo se lee un código que quepa entero
 * dentro. El rectangular (300×150 dp por defecto) obliga a alejar un QR.
 */
const FORMAS: Record<
  NonNullable<Props['forma']>,
  {
    barcodeFrameSize?: {width: number; height: number};
    allowedBarcodeTypes?: CodeFormat[];
  }
> = {
  qr: {
    barcodeFrameSize: {width: 260, height: 260},
    allowedBarcodeTypes: ['qr'],
  },
  barras: {},
};

/** Cámara a pantalla completa. Se monta al abrir y se desmonta al cerrar. */
export function LectorCodigo({
  alLeer,
  alCerrar,
  titulo = 'Escanear guía',
  ayuda = 'Apunta al código de la guía',
  forma = 'barras',
}: Props) {
  const {theme} = useUnistyles();
  // La cámara sigue reportando el mismo código mientras la vista se cierra.
  const leido = useRef(false);

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent
      statusBarTranslucent
      visible
      onRequestClose={alCerrar}>
      <SafeAreaProvider>
        <Pantalla>
          <Encabezado alVolver={alCerrar} titulo={titulo} />
          <View style={styles.visor}>
            <Camera
              {...FORMAS[forma]}
              cameraType={CameraType.Back}
              frameColor={theme.colores.superficie}
              laserColor={theme.colores.primario}
              scanBarcode
              showFrame
              style={styles.camara}
              onError={() => {
                alCerrar();
                mostrarError('No se pudo abrir la cámara.');
              }}
              onReadCode={({nativeEvent}) => {
                if (leido.current) return;
                leido.current = true;
                alLeer(nativeEvent.codeStringValue);
              }}
            />
          </View>
          <Texto centrado style={styles.ayuda} tono="secundario">
            {ayuda}
          </Texto>
        </Pantalla>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create(tema => ({
  visor: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: tema.radio.lg,
    marginHorizontal: tema.espaciado.md,
  },
  camara: {
    flex: 1,
  },
  ayuda: {
    padding: tema.espaciado.md,
  },
}));
