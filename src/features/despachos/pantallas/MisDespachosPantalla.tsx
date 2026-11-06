import {useEffect, useMemo} from 'react';
import {RefreshControl, SectionList, View} from 'react-native';
import {StyleSheet, useUnistyles} from 'react-native-unistyles';

import {mensajeUsuario} from '@/core/api';
import {
  Aviso,
  Boton,
  BORDES_PESTANA,
  Cargando,
  CloudOff,
  EstadoVacio,
  Pantalla,
  Plus,
  Texto,
  Truck,
} from '@/ui';

import {BarraEnvios} from '../components/BarraEnvios';
import {EtiquetaSeccion} from '../components/EtiquetaSeccion';
import {
  DespachoDestacado,
  FilaDespachoTerminado,
  TarjetaDespacho,
} from '../components/TarjetaDespacho';
import type {DespachoLocal} from '../db/repositorio';
import {useActualizarDespachos} from '../hooks/useAccionesDespacho';
import {useDespachos} from '../hooks/useDespachos';
import {useEscucharCola} from '../hooks/local';
import {useNavegacionDespachos} from '../hooks/useNavegacionDespachos';

type Seccion = {
  clave: 'enCurso' | 'terminados';
  titulo: string;
  data: DespachoLocal[];
};

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

  const secciones = useMemo<Seccion[]>(() => {
    const lista = despachos ?? [];
    const enCurso = lista.filter(d => d.terminadoEn === null);
    const terminados = lista.filter(d => d.terminadoEn !== null);
    return [
      {clave: 'enCurso' as const, titulo: 'En curso', data: enCurso},
      {clave: 'terminados' as const, titulo: 'Terminados', data: terminados},
    ].filter(seccion => seccion.data.length > 0);
  }, [despachos]);

  const vincular = () => navegacion.navigate('VincularDespacho');
  const abrir = (despacho: DespachoLocal) =>
    navegacion.navigate('Despacho', {
      tenantDespachoId: despacho.tenantDespachoId,
    });

  if (isPending) {
    return (
      <Pantalla bordes={BORDES_PESTANA}>
        <Cargando />
      </Pantalla>
    );
  }

  const vacio = secciones.length === 0;

  return (
    <Pantalla
      bordes={BORDES_PESTANA}
      pie={
        vacio ? undefined : (
          <Boton
            icono={Plus}
            tipo="neutro"
            titulo="Vincular despacho"
            onPress={vincular}
          />
        )
      }>
      <View style={styles.encabezado}>
        <Texto accessibilityRole="header" variante="display">
          Mis despachos
        </Texto>
        {actualizar.error ? (
          <Aviso
            icono={CloudOff}
            mensaje={`${mensajeUsuario(actualizar.error)} Lo que ves es lo guardado en el teléfono.`}
            titulo="No pudimos actualizar"
            tono="advertencia"
          />
        ) : null}
      </View>
      <BarraEnvios />
      <SectionList
        contentContainerStyle={styles.lista}
        keyExtractor={despacho => String(despacho.tenantDespachoId)}
        ListEmptyComponent={
          actualizar.isPending ? (
            <Cargando mensaje="Buscando tus despachos…" />
          ) : (
            <EstadoVacio
              accion={{titulo: 'Vincular despacho', alPresionar: vincular}}
              icono={Truck}
              mensaje="Cuando el despachador te asigne uno, vincúlalo con los datos del manifiesto."
              titulo="Aún no tienes despachos"
              tono="accion"
            />
          )
        }
        refreshControl={
          <RefreshControl
            colors={[theme.colores.primario]}
            refreshing={actualizar.isPending && !vacio}
            tintColor={theme.colores.primario}
            onRefresh={() => actualizarAhora()}
          />
        }
        renderItem={({item, index, section}) => {
          const props = {despacho: item, alPresionar: () => abrir(item)};
          if (section.clave === 'terminados') {
            return <FilaDespachoTerminado {...props} />;
          }
          return index === 0 ? (
            <DespachoDestacado {...props} />
          ) : (
            <TarjetaDespacho {...props} />
          );
        }}
        renderSectionHeader={({section}) => (
          <View style={styles.seccion}>
            <EtiquetaSeccion texto={section.titulo} />
          </View>
        )}
        sections={secciones}
        stickySectionHeadersEnabled={false}
      />
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  encabezado: {
    gap: tema.espaciado.md,
    paddingHorizontal: tema.espaciado.lg + 4,
    paddingTop: tema.espaciado.xl,
    paddingBottom: tema.espaciado.xs,
  },
  lista: {
    flexGrow: 1,
    gap: tema.espaciado.sm + 2,
    paddingHorizontal: tema.espaciado.lg,
    paddingBottom: tema.espaciado.lg,
  },
  seccion: {
    paddingHorizontal: tema.espaciado.xs,
    paddingTop: tema.espaciado.md,
  },
}));
