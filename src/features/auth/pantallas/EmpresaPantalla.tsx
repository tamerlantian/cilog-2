import {useEffect} from 'react';
import {Pressable, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {mensajeUsuario} from '@/core/api';
import {useSesion} from '@/core/sesion';
import {Boton, Cargando, EstadoVacio, Pantalla, Tarjeta, Texto} from '@/ui';

import {useEmpresas} from '../hooks/useEmpresas';

export function EmpresaPantalla() {
  const elegirEmpresa = useSesion(s => s.elegirEmpresa);
  const cerrarSesion = useSesion(s => s.cerrarSesion);
  const {data, error, isPending, refetch} = useEmpresas();

  // Con una sola empresa no hay nada que elegir.
  useEffect(() => {
    if (data?.length === 1 && data[0]) elegirEmpresa(data[0], false);
  }, [data, elegirEmpresa]);

  const salir = () => cerrarSesion();

  if (isPending || data?.length === 1) {
    return (
      <Pantalla>
        <Cargando mensaje="Cargando tus empresas…" />
      </Pantalla>
    );
  }

  if (error) {
    return (
      <Pantalla>
        <EstadoVacio
          accion={{titulo: 'Reintentar', alPresionar: () => refetch()}}
          mensaje={mensajeUsuario(error)}
          titulo="No pudimos cargar tus empresas"
        />
        <View style={styles.pie}>
          <Boton tipo="texto" titulo="Cerrar sesión" onPress={salir} />
        </View>
      </Pantalla>
    );
  }

  if (data.length === 0) {
    return (
      <Pantalla>
        <EstadoVacio
          mensaje="Tu cuenta no está asociada a ninguna empresa. Pide acceso a tu administrador."
          titulo="Sin empresas"
        />
        <View style={styles.pie}>
          <Boton tipo="texto" titulo="Cerrar sesión" onPress={salir} />
        </View>
      </Pantalla>
    );
  }

  return (
    <Pantalla desplazable>
      <View style={styles.encabezado}>
        <Texto variante="titulo" negrita>
          Elige tu empresa
        </Texto>
        <Texto tono="secundario">
          Podrás cambiarla después desde el inicio.
        </Texto>
      </View>
      {data.map(empresa => (
        <Pressable
          key={empresa.id}
          accessibilityRole="button"
          onPress={() => elegirEmpresa(empresa, true)}>
          <Tarjeta>
            <Texto negrita>
              {empresa.tenant_nombre ?? `Empresa ${empresa.tenant_id}`}
            </Texto>
          </Tarjeta>
        </Pressable>
      ))}
      <Boton tipo="texto" titulo="Cerrar sesión" onPress={salir} />
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  encabezado: {gap: tema.espaciado.xs, paddingTop: tema.espaciado.xl},
  pie: {padding: tema.espaciado.lg},
}));
