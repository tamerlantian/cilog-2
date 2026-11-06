import {useNavigation} from '@react-navigation/native';
import {useEffect} from 'react';
import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {mensajeUsuario} from '@/core/api';
import {useSesion, type Empresa} from '@/core/sesion';
import {
  Avatar,
  Boton,
  Cargando,
  EstadoVacio,
  Icono,
  Tarjeta,
  Texto,
  Building,
  ChevronLeft,
  ChevronRight,
  CloudOff,
} from '@/ui';

import {PantallaAcceso} from '../components/PantallaAcceso';
import {useEmpresas} from '../hooks/useEmpresas';

const nombreEmpresa = (empresa: {
  tenant_nombre: string | null;
  tenant_id: number;
}) => empresa.tenant_nombre ?? `Empresa ${empresa.tenant_id}`;

/** Empresa para ingreso y envíos. Los despachos no la necesitan. */
export function EmpresaPantalla() {
  const navegacion = useNavigation();
  const correo = useSesion(s => s.usuario?.email ?? '');
  const actual = useSesion(s => s.empresa?.tenant_id);
  const elegirEmpresa = useSesion(s => s.elegirEmpresa);
  const {data, error, isPending, refetch} = useEmpresas();

  const elegir = (empresa: Empresa, tieneVarias: boolean) => {
    elegirEmpresa(empresa, tieneVarias);
    navegacion.goBack();
  };

  // Con una sola empresa no hay nada que elegir.
  const unica = data?.length === 1 ? data[0] : undefined;
  useEffect(() => {
    if (!unica) return;
    elegirEmpresa(unica, false);
    navegacion.goBack();
  }, [unica, elegirEmpresa, navegacion]);

  const pie = (
    <Boton
      icono={ChevronLeft}
      tamano="compacto"
      tipo="texto"
      titulo="Volver"
      onPress={() => navegacion.goBack()}
    />
  );

  if (isPending || data?.length === 1) {
    return (
      <PantallaAcceso>
        <Cargando mensaje="Cargando tus empresas…" />
      </PantallaAcceso>
    );
  }

  if (error) {
    return (
      <PantallaAcceso pie={pie}>
        <EstadoVacio
          accion={{titulo: 'Reintentar', alPresionar: () => refetch()}}
          icono={CloudOff}
          mensaje={mensajeUsuario(error)}
          titulo="No pudimos cargar tus empresas"
          tono="peligro"
        />
      </PantallaAcceso>
    );
  }

  if (data.length === 0) {
    return (
      <PantallaAcceso pie={pie}>
        <EstadoVacio
          icono={Building}
          mensaje="Tu cuenta no está asociada a ninguna empresa. Puedes entregar tus despachos igual; para ingreso y envíos pide acceso a tu administrador."
          titulo="Sin empresas"
        />
      </PantallaAcceso>
    );
  }

  return (
    <PantallaAcceso desplazable estiloContenido={styles.contenido} pie={pie}>
      <View style={styles.encabezado}>
        <Texto tono="secundario">{correo}</Texto>
        <Texto negrita variante="titulo">
          ¿Con qué empresa trabajas hoy?
        </Texto>
        <Texto tono="secundario">
          La usamos para ingreso y envíos. Podrás cambiarla después.
        </Texto>
      </View>
      {data.map(empresa => {
        const esActual = empresa.tenant_id === actual;
        return (
          <Tarjeta
            key={empresa.id}
            alPresionar={() => elegir(empresa, true)}
            destacada={esActual}
            etiqueta={
              esActual
                ? `${nombreEmpresa(empresa)}, empresa actual`
                : nombreEmpresa(empresa)
            }
            style={styles.empresa}>
            <Avatar
              nombre={nombreEmpresa(empresa)}
              tono={esActual ? 'primario' : 'neutro'}
            />
            <View style={styles.nombre}>
              <Texto media={!esActual} negrita={esActual}>
                {nombreEmpresa(empresa)}
              </Texto>
              {esActual ? (
                <Texto tono="secundario" variante="etiqueta">
                  Empresa actual
                </Texto>
              ) : null}
            </View>
            <Icono
              color={esActual ? 'primario' : 'textoSecundario'}
              icono={ChevronRight}
            />
          </Tarjeta>
        );
      })}
    </PantallaAcceso>
  );
}

const styles = StyleSheet.create(tema => ({
  contenido: {paddingHorizontal: tema.espaciado.lg + 4, gap: tema.espaciado.md},
  encabezado: {
    gap: tema.espaciado.sm + 2,
    paddingTop: tema.espaciado.xxl + tema.espaciado.lg,
    paddingHorizontal: tema.espaciado.sm,
    paddingBottom: tema.espaciado.xl,
  },
  empresa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.md + 2,
    minHeight: 72,
    paddingVertical: tema.espaciado.md,
  },
  nombre: {flex: 1, gap: 2},
}));
