import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {useSesion} from '@/core/sesion';
import {Boton, Pantalla, Tarjeta, Texto} from '@/ui';

/** Pantalla provisional: la lista de despachos llega en la Fase 2. */
export function InicioPantalla() {
  const usuario = useSesion(s => s.usuario);
  const empresa = useSesion(s => s.empresa);
  const cambiarEmpresa = useSesion(s => s.cambiarEmpresa);
  const cerrarSesion = useSesion(s => s.cerrarSesion);

  return (
    <Pantalla desplazable>
      <View style={styles.encabezado}>
        <Texto variante="titulo" negrita tono="primario">
          Inicio
        </Texto>
        <Texto tono="secundario">Tus despachos aparecerán aquí.</Texto>
      </View>
      <Tarjeta>
        <Texto negrita>Usuario</Texto>
        <Texto tono="secundario">{usuario?.email}</Texto>
        <Texto negrita>Empresa</Texto>
        <Texto tono="secundario">{empresa?.tenant_nombre ?? '—'}</Texto>
      </Tarjeta>
      <Boton
        tipo="secundario"
        titulo="Cambiar de empresa"
        onPress={cambiarEmpresa}
      />
      <Boton
        tipo="texto"
        titulo="Cerrar sesión"
        onPress={() => cerrarSesion()}
      />
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  encabezado: {gap: tema.espaciado.xs, paddingTop: tema.espaciado.xl},
}));
