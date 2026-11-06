import {Image, Pressable, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Camera, Cargando, Icono, Texto, X} from '@/ui';

import {LIMITE_FOTOS} from '../domain/gestion';
import {useTomarFoto} from '../hooks/useEvidencias';

type Props = {
  fotos: readonly string[];
  alCambiar: (fotos: string[]) => void;
  exigida: boolean;
};

const filasDeDos = <T,>(elementos: T[]) =>
  Array.from({length: Math.ceil(elementos.length / 2)}, (_, i) =>
    elementos.slice(i * 2, i * 2 + 2),
  );

/** Paso 1 de la entrega: hasta 4 fotos con la cámara del sistema. */
export function PasoFotos({fotos, alCambiar, exigida}: Props) {
  const {tomar, tomando} = useTomarFoto();

  const agregar = async () => {
    const foto = await tomar();
    if (foto) alCambiar([...fotos, foto]);
  };

  const casillas = fotos.map((foto, indice) => (
    <View key={foto} style={styles.casilla}>
      <Image
        accessibilityLabel={`Foto ${indice + 1}`}
        source={{uri: foto}}
        style={styles.imagen}
      />
      <Pressable
        accessibilityLabel={`Quitar foto ${indice + 1}`}
        accessibilityRole="button"
        hitSlop={6}
        style={styles.quitar}
        onPress={() => alCambiar(fotos.filter(f => f !== foto))}>
        <Icono color="sobrePrimario" icono={X} tamano={18} />
      </Pressable>
    </View>
  ));
  if (fotos.length < LIMITE_FOTOS) {
    casillas.push(
      <Pressable
        key="tomar"
        accessibilityLabel="Tomar foto"
        accessibilityRole="button"
        accessibilityState={{busy: tomando}}
        disabled={tomando}
        style={({pressed}) => [
          styles.casilla,
          styles.tomar,
          pressed && styles.presionada,
        ]}
        onPress={agregar}>
        {tomando ? (
          <Cargando />
        ) : (
          <>
            <Icono color="sobreAccion" icono={Camera} tamano={28} />
            <Texto negrita style={styles.textoTomar}>
              Tomar foto
            </Texto>
          </>
        )}
      </Pressable>,
    );
  }
  // Lo que falta para el límite se ve como casillas vacías.
  for (let libre = casillas.length; libre < LIMITE_FOTOS; libre += 1) {
    casillas.push(
      <View key={`libre-${libre}`} style={[styles.casilla, styles.libre]} />,
    );
  }

  return (
    <View style={styles.paso}>
      <View style={styles.titulo}>
        <Texto
          accessibilityRole="header"
          style={styles.encabezado}
          variante="titulo">
          Fotos de la entrega
        </Texto>
        <Texto mono tono="secundario" variante="etiqueta">
          {fotos.length} de {LIMITE_FOTOS}
        </Texto>
      </View>
      <Texto tono="secundario">
        Que se vean el paquete y la fachada.
        {exigida ? ' La empresa pide al menos una.' : ''}
      </Texto>

      <View style={styles.cuadricula}>
        {filasDeDos(casillas).map(fila => (
          <View key={fila.map(c => c.key).join()} style={styles.fila}>
            {fila}
            {fila.length === 1 ? <View style={styles.hueco} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  paso: {gap: tema.espaciado.md},
  titulo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  cuadricula: {gap: tema.espaciado.md, marginTop: tema.espaciado.xs},
  fila: {flexDirection: 'row', gap: tema.espaciado.md},
  hueco: {flex: 1},
  casilla: {
    flex: 1,
    height: 150,
    borderRadius: tema.radio.lg - 2,
    overflow: 'hidden',
    backgroundColor: tema.colores.superficie,
  },
  imagen: {width: '100%', height: '100%'},
  quitar: {
    position: 'absolute',
    top: tema.espaciado.sm,
    right: tema.espaciado.sm,
    width: 36,
    height: 36,
    borderRadius: tema.radio.pill,
    backgroundColor: tema.colores.velo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  encabezado: {fontSize: 26, lineHeight: 32, letterSpacing: -0.6},
  tomar: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: tema.espaciado.sm,
    backgroundColor: tema.colores.accion,
  },
  textoTomar: {color: tema.colores.sobreAccion},
  libre: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: tema.colores.bordeCampo,
    backgroundColor: 'transparent',
  },
  presionada: {opacity: 0.85},
}));
