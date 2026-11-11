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
  Input,
  LogOut,
  Marca,
  Pantalla,
  Tarjeta,
  Texto,
  Trash,
  TriangleAlert,
} from '@/ui';

import {useCerrarSesion} from '../hooks/useCerrarSesion';
import {esClaveIncorrecta, useEliminarCuenta} from '../hooks/useEliminarCuenta';

/** Quién tiene la sesión, cerrarla o eliminar la cuenta, y la versión instalada. */
export function CuentaPantalla() {
  const usuario = useSesion(s => s.usuario);
  const {cerrar, pendientes} = useCerrarSesion();
  const eliminar = useEliminarCuenta();
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [clave, setClave] = useState('');
  const correo = usuario?.email ?? '';
  const identificacion = usuario?.numero_identificacion;

  const abrirDialogo = () => {
    setClave('');
    eliminar.reset();
    setConfirmandoEliminar(true);
  };
  const cerrarDialogo = () => {
    if (!eliminar.isPending) setConfirmandoEliminar(false);
  };
  const confirmarEliminar = () => {
    if (clave.length > 0) eliminar.mutate(clave);
  };
  const conPendientes = pendientes > 0;

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
      <Tarjeta alPresionar={abrirDialogo} etiqueta="Eliminar cuenta">
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
              disabled={conPendientes || clave.length === 0}
              tipo="peligro"
              titulo="Eliminar cuenta"
              onPress={confirmarEliminar}
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
        {conPendientes ? (
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
        ) : (
          <Input
            autoCapitalize="none"
            autoComplete="current-password"
            editable={!eliminar.isPending}
            error={
              esClaveIncorrecta(eliminar.error) ? 'Clave incorrecta' : undefined
            }
            etiqueta="Escribe tu clave para confirmar"
            returnKeyType="done"
            secureTextEntry
            textContentType="password"
            value={clave}
            onChangeText={texto => {
              setClave(texto);
              if (eliminar.isError) eliminar.reset();
            }}
            onSubmitEditing={confirmarEliminar}
          />
        )}
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
