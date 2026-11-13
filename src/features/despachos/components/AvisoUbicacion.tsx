import {useState} from 'react';
import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {
  Boton,
  Clock,
  Hoja,
  Icono,
  MapPin,
  ShieldCheck,
  Smartphone,
  Texto,
  type TipoIcono,
} from '@/ui';

type Props = {
  visible: boolean;
  /** Nombre de la empresa del despacho, o null si no se conoce. */
  empresa: string | null;
  alContinuar: () => Promise<void>;
  /** Atrás de Android: compartir es obligatorio, así que sale del despacho. */
  alSalir: () => void;
};

const PUNTOS: {icono: TipoIcono; titulo: string; texto: string}[] = [
  {
    icono: Clock,
    titulo: 'Solo en este despacho.',
    texto: 'Se detiene al terminarlo, al desvincularlo o al cerrar sesión.',
  },
  {
    icono: Smartphone,
    titulo: 'Sigue con la pantalla apagada.',
    texto: 'Verás un aviso fijo de Cilog mientras esté activa.',
  },
  {
    icono: ShieldCheck,
    titulo: 'Android te pedirá dos permisos:',
    texto:
      'ubicación y actividad física, que sirve para saber si vas en movimiento y ahorrar batería.',
  },
];

/**
 * Explica qué se comparte antes del diálogo de Android (lo exige Play). Es
 * obligatorio con un despacho en curso: no hay "Ahora no".
 */
export function AvisoUbicacion({
  visible,
  empresa,
  alContinuar,
  alSalir,
}: Props) {
  const [pidiendo, setPidiendo] = useState(false);
  const continuar = () => {
    setPidiendo(true);
    alContinuar().finally(() => setPidiendo(false));
  };
  return (
    <Hoja
      acciones={
        <Boton cargando={pidiendo} titulo="Continuar" onPress={continuar} />
      }
      alCerrar={alSalir}
      icono={MapPin}
      titulo="Comparte tu ubicación durante la ruta"
      visible={visible}>
      <Texto tono="secundario">
        {`${empresa ?? 'La empresa'} verá en el mapa por dónde vas mientras este despacho esté en curso.`}
      </Texto>
      <View style={styles.puntos}>
        {PUNTOS.map(punto => (
          <View key={punto.titulo} style={styles.punto}>
            <Icono color="info" icono={punto.icono} />
            <Texto style={styles.textoPunto} variante="etiqueta">
              <Texto negrita variante="etiqueta">
                {punto.titulo}
              </Texto>{' '}
              {punto.texto}
            </Texto>
          </View>
        ))}
      </View>
    </Hoja>
  );
}

const styles = StyleSheet.create(tema => ({
  puntos: {gap: tema.espaciado.md + 2},
  punto: {flexDirection: 'row', gap: tema.espaciado.md},
  textoPunto: {flex: 1},
}));
