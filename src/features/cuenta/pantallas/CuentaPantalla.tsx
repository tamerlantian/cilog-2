import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {useSesion} from '@/core/sesion';
import {
  Avatar,
  BORDES_PESTANA,
  Boton,
  Building,
  Encabezado,
  LogOut,
  Pantalla,
  Tarjeta,
  Texto,
} from '@/ui';

import {useCerrarSesion} from '../hooks/useCerrarSesion';

/** La app registra `Empresa` en su navegador; las features no importan sus rutas. */
type Rutas = {Empresa: undefined};

/** Usuario, empresa para ingreso y envíos, y cerrar sesión. */
export function CuentaPantalla() {
  const navegacion = useNavigation<NativeStackNavigationProp<Rutas>>();
  const usuario = useSesion(s => s.usuario);
  const empresa = useSesion(s => s.empresa);
  const tieneVariasEmpresas = useSesion(s => s.tieneVariasEmpresas);
  const {cerrar} = useCerrarSesion();
  const correo = usuario?.email ?? '';

  return (
    <Pantalla
      bordes={BORDES_PESTANA}
      desplazable
      pie={
        <Boton
          icono={LogOut}
          tipo="texto"
          titulo="Cerrar sesión"
          onPress={cerrar}
        />
      }>
      <Encabezado grande sangria={false} titulo="Mi cuenta" />
      <View style={styles.usuario}>
        <Avatar forma="circulo" nombre={correo} />
        <Texto negrita>{correo}</Texto>
      </View>
      <Tarjeta>
        <Texto tono="secundario" variante="etiqueta">
          Empresa para ingreso y envíos
        </Texto>
        <Texto negrita>{empresa?.tenant_nombre ?? 'Sin elegir'}</Texto>
        <Texto tono="secundario" variante="etiqueta">
          Tus despachos no dependen de ella.
        </Texto>
        {!empresa || tieneVariasEmpresas ? (
          <Boton
            icono={Building}
            tamano="compacto"
            tipo="secundario"
            titulo={empresa ? 'Cambiar de empresa' : 'Elegir empresa'}
            onPress={() => navegacion.navigate('Empresa')}
          />
        ) : null}
      </Tarjeta>
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  usuario: {flexDirection: 'row', alignItems: 'center', gap: tema.espaciado.md},
}));
