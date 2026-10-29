import {useEffect} from 'react';
import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {mensajeUsuario} from '@/core/api';
import {useSesion} from '@/core/sesion';
import {
  Avatar,
  Boton,
  Cargando,
  EstadoVacio,
  Icono,
  Pantalla,
  Tarjeta,
  Texto,
  Building,
  ChevronRight,
  CloudOff,
  LogOut,
} from '@/ui';

import {useEmpresas} from '../hooks/useEmpresas';

/** Colores que se alternan para distinguir empresas de un vistazo. */
const TONOS = ['primario', 'advertencia', 'info', 'exito'] as const;

const nombreEmpresa = (empresa: {
  tenant_nombre: string | null;
  tenant_id: number;
}) => empresa.tenant_nombre ?? `Empresa ${empresa.tenant_id}`;

export function EmpresaPantalla() {
  const correo = useSesion(s => s.usuario?.email ?? '');
  const elegirEmpresa = useSesion(s => s.elegirEmpresa);
  const cerrarSesion = useSesion(s => s.cerrarSesion);
  const {data, error, isPending, refetch} = useEmpresas();

  // Con una sola empresa no hay nada que elegir.
  useEffect(() => {
    if (data?.length === 1 && data[0]) elegirEmpresa(data[0], false);
  }, [data, elegirEmpresa]);

  const pie = (
    <Boton
      icono={LogOut}
      tamano="compacto"
      tipo="texto"
      titulo="Cerrar sesión"
      onPress={() => cerrarSesion()}
    />
  );

  if (isPending || data?.length === 1) {
    return (
      <Pantalla>
        <Cargando mensaje="Cargando tus empresas…" />
      </Pantalla>
    );
  }

  if (error) {
    return (
      <Pantalla pie={pie}>
        <EstadoVacio
          accion={{titulo: 'Reintentar', alPresionar: () => refetch()}}
          icono={CloudOff}
          mensaje={mensajeUsuario(error)}
          titulo="No pudimos cargar tus empresas"
          tono="peligro"
        />
      </Pantalla>
    );
  }

  if (data.length === 0) {
    return (
      <Pantalla pie={pie}>
        <EstadoVacio
          icono={Building}
          mensaje="Tu cuenta no está asociada a ninguna empresa. Pide acceso a tu administrador."
          titulo="Sin empresas"
        />
      </Pantalla>
    );
  }

  return (
    <Pantalla
      desplazable
      estiloContenido={styles.contenido}
      fondo="superficie"
      pie={pie}>
      <View style={styles.encabezado}>
        <View style={styles.usuario}>
          <Avatar forma="circulo" nombre={correo} tamano="sm" />
          <Texto tono="secundario" variante="etiqueta">
            {correo}
          </Texto>
        </View>
        <Texto negrita variante="titulo">
          ¿Con qué empresa trabajas hoy?
        </Texto>
        <Texto tono="secundario">
          Podrás cambiarla después desde el inicio.
        </Texto>
      </View>
      {data.map((empresa, indice) => (
        <Tarjeta
          key={empresa.id}
          alPresionar={() => elegirEmpresa(empresa, true)}
          etiqueta={nombreEmpresa(empresa)}
          style={styles.empresa}>
          <Avatar
            nombre={nombreEmpresa(empresa)}
            tono={TONOS[indice % TONOS.length]}
          />
          <Texto negrita style={styles.nombre}>
            {nombreEmpresa(empresa)}
          </Texto>
          <Icono color="textoSecundario" icono={ChevronRight} />
        </Tarjeta>
      ))}
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  contenido: {paddingHorizontal: tema.espaciado.lg + 4, gap: tema.espaciado.md},
  encabezado: {
    gap: tema.espaciado.sm,
    paddingTop: tema.espaciado.xxl,
    paddingBottom: tema.espaciado.md,
  },
  usuario: {flexDirection: 'row', alignItems: 'center', gap: tema.espaciado.sm},
  empresa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.md + 2,
    minHeight: 72,
    paddingVertical: tema.espaciado.md,
  },
  nombre: {flex: 1},
}));
