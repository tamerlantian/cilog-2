import {StyleSheet} from 'react-native-unistyles';
import {View} from 'react-native';

import {env} from '@/core/config/env';
import {Pantalla, Tarjeta, Texto} from '@/ui';

/** Pantalla provisional de la Fase 0. La navegación real llega en la Fase 1. */
export function PantallaBase() {
  return (
    <Pantalla desplazable>
      <View style={styles.encabezado}>
        <Texto variante="display" negrita tono="primario">
          Plutonio
        </Texto>
        <Texto tono="secundario">Base del proyecto lista</Texto>
      </View>
      <Tarjeta>
        <Texto negrita>Entorno</Texto>
        <Texto tono="secundario">{env.ENTORNO}</Texto>
        <Texto negrita>Servidor</Texto>
        <Texto tono="secundario">{env.API_URL}</Texto>
      </Tarjeta>
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  encabezado: {gap: tema.espaciado.xs, paddingTop: tema.espaciado.xl},
}));
