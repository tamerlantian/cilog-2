import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {versionApp} from '@/core/config';
import {useSesion} from '@/core/sesion';
import {
  Avatar,
  BORDES_PESTANA,
  Encabezado,
  Escena,
  Icono,
  LogOut,
  Marca,
  Pantalla,
  Tarjeta,
  Texto,
} from '@/ui';

import {useCerrarSesion} from '../hooks/useCerrarSesion';

/** Quién tiene la sesión, cerrarla y la versión instalada. */
export function CuentaPantalla() {
  const usuario = useSesion(s => s.usuario);
  const {cerrar} = useCerrarSesion();
  const correo = usuario?.email ?? '';
  const identificacion = usuario?.numero_identificacion;

  return (
    <Pantalla bordes={BORDES_PESTANA} desplazable>
      <Encabezado grande sangria={false} titulo="Mi cuenta" />
      <Escena nombre="marca">
        <View style={styles.perfil}>
          <Avatar forma="circulo" nombre={correo} tamano="lg" />
          <View style={styles.datos}>
            <Texto negrita variante="subtitulo">
              {correo}
            </Texto>
            {identificacion ? (
              <Texto mono tono="secundario" variante="etiqueta">
                ID {identificacion}
              </Texto>
            ) : null}
          </View>
        </View>
      </Escena>
      <Tarjeta alPresionar={cerrar} etiqueta="Cerrar sesión">
        <View style={styles.fila}>
          <Icono color="peligro" icono={LogOut} />
          <Texto media tono="peligro">
            Cerrar sesión
          </Texto>
        </View>
      </Tarjeta>
      <View style={styles.acerca}>
        <Marca ancho={72} />
        <Texto numerico tono="secundario" variante="etiqueta">
          Versión {versionApp()}
        </Texto>
      </View>
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  perfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.lg,
    padding: tema.espaciado.lg,
    borderRadius: tema.radio.lg + 2,
    backgroundColor: tema.colores.suelo,
  },
  datos: {flex: 1, gap: tema.espaciado.xs},
  fila: {flexDirection: 'row', alignItems: 'center', gap: tema.espaciado.md},
  // Al fondo de la pantalla, como un pie.
  acerca: {
    marginTop: 'auto',
    alignItems: 'center',
    gap: tema.espaciado.sm,
    paddingVertical: tema.espaciado.lg,
  },
}));
