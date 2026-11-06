import type {Ref} from 'react';
import {Image, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {
  Aviso,
  Boton,
  Camera,
  Icono,
  MapPin,
  PanelFirma,
  RotateCcw,
  Texto,
  TriangleAlert,
  type ControlFirma,
} from '@/ui';

import {pesos} from '../domain/formato';

type Props = {
  panel: Ref<ControlFirma>;
  /** Firma ya guardada al volver de un paso anterior; null mientras se dibuja. */
  firma: string | null;
  conTrazos: boolean;
  alCambiarTrazos: (conTrazos: boolean) => void;
  /** Borra lo dibujado o la firma guardada para empezar de nuevo. */
  alBorrar: () => void;
  leyenda: string;
  exigida: boolean;
  conUbicacion: boolean;
  /** "2 fotos · CC 43123456": lo que ya se registró en los pasos anteriores. */
  resumen: string;
  cobro: number;
};

/** Paso 3 de la entrega: firma de quien recibe y repaso antes de confirmar. */
export function PasoFirma({
  panel,
  firma,
  conTrazos,
  alCambiarTrazos,
  alBorrar,
  leyenda,
  exigida,
  conUbicacion,
  resumen,
  cobro,
}: Props) {
  return (
    <View style={styles.paso}>
      <View style={styles.titulo}>
        <Texto
          accessibilityRole="header"
          style={styles.encabezado}
          variante="titulo">
          Firma de quien recibe
        </Texto>
        <Boton
          disabled={!firma && !conTrazos}
          icono={RotateCcw}
          tamano="compacto"
          tipo="texto"
          titulo="Borrar"
          onPress={alBorrar}
        />
      </View>
      {exigida ? (
        <Texto tono="secundario" variante="etiqueta">
          La empresa pide la firma para entregar.
        </Texto>
      ) : null}

      <View style={styles.lienzo}>
        {firma ? (
          <Image
            accessibilityLabel="Firma recogida"
            resizeMode="contain"
            source={{uri: firma}}
            style={styles.firma}
          />
        ) : (
          <PanelFirma
            ref={panel}
            alCambiar={alCambiarTrazos}
            leyenda={leyenda}
          />
        )}
      </View>

      <View style={styles.resumen}>
        <View style={styles.dato}>
          <Icono
            color={conUbicacion ? 'exito' : 'textoSecundario'}
            icono={MapPin}
            tamano={18}
          />
          <Texto
            tono={conUbicacion ? 'exito' : 'secundario'}
            variante="etiqueta">
            {conUbicacion
              ? 'Ubicación registrada'
              : 'Sin ubicación: se guarda igual'}
          </Texto>
        </View>
        <View style={styles.dato}>
          <Icono color="textoSecundario" icono={Camera} tamano={18} />
          <Texto numerico tono="secundario" variante="etiqueta">
            {resumen}
          </Texto>
        </View>
      </View>

      {cobro > 0 ? (
        <Aviso
          icono={TriangleAlert}
          mensaje={`Cobra ${pesos(cobro)} antes de confirmar.`}
          tono="advertencia"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  paso: {gap: tema.espaciado.md},
  titulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  encabezado: {flex: 1, fontSize: 26, lineHeight: 32, letterSpacing: -0.6},
  lienzo: {height: 230},
  firma: {
    flex: 1,
    borderRadius: tema.radio.lg,
    borderWidth: 1,
    borderColor: tema.colores.bordeCampo,
    backgroundColor: tema.colores.papel,
  },
  resumen: {gap: tema.espaciado.xs + 2},
  dato: {flexDirection: 'row', alignItems: 'center', gap: tema.espaciado.sm},
}));
