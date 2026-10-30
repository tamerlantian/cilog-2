import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Texto} from '@/ui';

import type {GuiaLocal} from '../db/repositorio';
import {destinatario} from './FilaGuia';

/** A quién y dónde, arriba de los formularios de entrega y novedad. */
export function ResumenGuia({guia}: {guia: GuiaLocal}) {
  return (
    <View style={styles.resumen}>
      <Texto negrita>{destinatario(guia)}</Texto>
      <Texto tono="secundario" variante="etiqueta">
        {[guia.direccionDestinatario, guia.ciudadDestino]
          .filter(Boolean)
          .join(' · ')}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  resumen: {
    gap: 2,
    padding: tema.espaciado.md,
    borderRadius: tema.radio.md,
    backgroundColor: tema.colores.superficie,
  },
}));
