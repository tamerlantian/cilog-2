import {useState} from 'react';
import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {versionApp} from '@/core/config';
import {useSesion} from '@/core/sesion';
import {
  Aviso,
  Avatar,
  BORDES_PESTANA,
  Boton,
  Dialogo,
  Encabezado,
  Escena,
  Icono,
  LogOut,
  Marca,
  Pantalla,
  Tarjeta,
  Texto,
  Trash,
  TriangleAlert,
} from '@/ui';

import {useCerrarSesion} from '../hooks/useCerrarSesion';
import {useEliminarCuenta} from '../hooks/useEliminarCuenta';

/** Quién tiene la sesión, cerrarla o eliminar la cuenta, y la versión instalada. */
export function CuentaPantalla() {
  const usuario = useSesion(s => s.usuario);
  const {cerrar, pendientes} = useCerrarSesion();
  const eliminar = useEliminarCuenta();
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const correo = usuario?.email ?? '';
  const identificacion = usuario?.numero_identificacion;

  const cerrarDialogo = () => {
    if (!eliminar.isPending) setConfirmandoEliminar(false);
  };

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
      <Tarjeta
        alPresionar={() => setConfirmandoEliminar(true)}
        etiqueta="Eliminar cuenta">
        <View style={styles.fila}>
          <Icono color="textoSecundario" icono={Trash} />
          <View style={styles.datos}>
            <Texto media>Eliminar cuenta</Texto>
            <Texto tono="secundario" variante="etiqueta">
              Borra tu cuenta y tus datos personales.
            </Texto>
          </View>
        </View>
      </Tarjeta>
      <View style={styles.acerca}>
        <Marca ancho={72} />
        <Texto numerico tono="secundario" variante="etiqueta">
          Versión {versionApp()}
        </Texto>
      </View>
      <Dialogo
        acciones={
          <>
            <Boton
              cargando={eliminar.isPending}
              disabled={pendientes > 0}
              tipo="peligro"
              titulo="Eliminar cuenta"
              onPress={() => eliminar.mutate()}
            />
            <Boton
              disabled={eliminar.isPending}
              tipo="texto"
              titulo="Cancelar"
              onPress={cerrarDialogo}
            />
          </>
        }
        alCerrar={cerrarDialogo}
        icono={Trash}
        mensaje="Se borran tu cuenta y tus datos personales, y se cierra la sesión en este teléfono. No se puede deshacer."
        titulo="¿Eliminar tu cuenta?"
        visible={confirmandoEliminar}>
        {pendientes > 0 ? (
          <Aviso
            icono={TriangleAlert}
            mensaje="Envíalos o descártalos en Envíos antes de eliminar la cuenta; si no, esas entregas se perderían."
            titulo={
              pendientes === 1
                ? 'Tienes 1 envío pendiente'
                : `Tienes ${pendientes} envíos pendientes`
            }
            tono="advertencia"
          />
        ) : null}
      </Dialogo>
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
