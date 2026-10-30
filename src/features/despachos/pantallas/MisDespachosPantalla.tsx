import {useEffect} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {StyleSheet, useUnistyles} from 'react-native-unistyles';

import {mensajeUsuario} from '@/core/api';
import {
  Aviso,
  Boton,
  BotonIcono,
  Cargando,
  CloudOff,
  EstadoVacio,
  Pantalla,
  Plus,
  Texto,
  Truck,
  UserRound,
} from '@/ui';

import {BarraEnvios} from '../components/BarraEnvios';
import {TarjetaDespacho} from '../components/TarjetaDespacho';
import {useActualizarDespachos} from '../hooks/useAccionesDespacho';
import {useDespachos} from '../hooks/useDespachos';
import {useEscucharCola} from '../hooks/local';
import {useNavegacionDespachos} from '../hooks/useNavegacionDespachos';

/** Pantalla principal: los despachos guardados en el teléfono, sirve sin señal. */
export function MisDespachosPantalla() {
  const {theme} = useUnistyles();
  const navegacion = useNavegacionDespachos();
  const {data: despachos, isPending} = useDespachos();
  const actualizar = useActualizarDespachos();
  const {mutate: actualizarAhora} = actualizar;
  // Esta pantalla queda debajo de todas mientras hay sesión: basta escuchar aquí.
  useEscucharCola();

  // Al entrar se trae la lista de Fluor; sin señal queda lo guardado.
  useEffect(() => {
    actualizarAhora();
  }, [actualizarAhora]);

  const vincular = () => navegacion.navigate('VincularDespacho');

  const encabezado = (
    <View style={styles.encabezado}>
      <View style={styles.titulo}>
        <Texto negrita variante="titulo">
          Mis despachos
        </Texto>
        <BotonIcono
          etiqueta="Mi cuenta"
          icono={UserRound}
          variante="suave"
          onPress={() => navegacion.navigate('Cuenta')}
        />
      </View>
      {actualizar.error ? (
        <Aviso
          icono={CloudOff}
          mensaje={`${mensajeUsuario(actualizar.error)} Lo que ves es lo guardado en el teléfono.`}
          titulo="No pudimos actualizar"
          tono="advertencia"
        />
      ) : null}
    </View>
  );

  if (isPending) {
    return (
      <Pantalla>
        <Cargando />
      </Pantalla>
    );
  }

  return (
    <Pantalla
      pie={
        <Boton icono={Plus} titulo="Vincular despacho" onPress={vincular} />
      }>
      {encabezado}
      <BarraEnvios />
      <FlatList
        contentContainerStyle={styles.lista}
        data={despachos ?? []}
        keyExtractor={despacho => String(despacho.tenantDespachoId)}
        ListEmptyComponent={
          actualizar.isPending ? (
            <Cargando mensaje="Buscando tus despachos…" />
          ) : (
            <EstadoVacio
              icono={Truck}
              mensaje="Vincula un despacho con el operador, el número y el token que te dio la empresa."
              titulo="Aún no tienes despachos"
            />
          )
        }
        refreshControl={
          <RefreshControl
            colors={[theme.colores.primario]}
            refreshing={actualizar.isPending && (despachos?.length ?? 0) > 0}
            tintColor={theme.colores.primario}
            onRefresh={() => actualizarAhora()}
          />
        }
        renderItem={({item}) => (
          <TarjetaDespacho
            alPresionar={() =>
              navegacion.navigate('Despacho', {
                tenantDespachoId: item.tenantDespachoId,
              })
            }
            despacho={item}
          />
        )}
      />
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  encabezado: {
    gap: tema.espaciado.md,
    paddingHorizontal: tema.espaciado.lg,
    paddingTop: tema.espaciado.lg,
    paddingBottom: tema.espaciado.md,
  },
  titulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lista: {
    flexGrow: 1,
    gap: tema.espaciado.md,
    padding: tema.espaciado.lg,
  },
}));
