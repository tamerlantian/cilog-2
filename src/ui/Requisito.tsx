import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Check, Circle} from './iconos';
import {Icono} from './Icono';
import {Texto} from './Texto';

type Props = {texto: string; cumplido: boolean};

/** Regla que el usuario ve cumplirse mientras escribe (p. ej. largo de la clave). */
export function Requisito({texto, cumplido}: Props) {
  return (
    <View
      accessibilityLabel={`${texto}: ${cumplido ? 'cumplido' : 'pendiente'}`}
      accessible
      style={styles.fila}>
      <Icono
        color={cumplido ? 'exito' : 'textoSecundario'}
        grosor={cumplido ? 2.6 : 2}
        icono={cumplido ? Check : Circle}
        tamano={14}
      />
      <Texto tono={cumplido ? 'exito' : 'secundario'} variante="etiqueta">
        {texto}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create(tema => ({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.xs + 2,
  },
}));
