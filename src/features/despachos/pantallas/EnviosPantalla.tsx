import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Alert, FlatList, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {
  Aviso,
  Boton,
  Cargando,
  CircleCheck,
  Clock,
  Encabezado,
  EstadoVacio,
  Insignia,
  Pantalla,
  RotateCcw,
  Send,
  Tarjeta,
  Texto,
  Trash,
} from '@/ui';

import {nombreDespacho} from '../components/TarjetaDespacho';
import type {EnvioLocal} from '../db/repositorio';
import {
  LIMITE_ATRASO_MS,
  nombreTipo,
  PRESENTACION_ENVIO,
  requiereAccion,
  type EstadoEnvio,
} from '../domain/envios';
import {fechaHora} from '../domain/formato';
import {useAccionesEnvio, useEnvios} from '../hooks/useEnvios';
import type {RutasDespachos} from '../rutas';

type Props = NativeStackScreenProps<RutasDespachos, 'Envios'>;

const titulo = (envio: EnvioLocal) =>
  envio.codigoGuia === null
    ? nombreTipo(envio.tipo)
    : `${nombreTipo(envio.tipo)} · guía ${envio.codigoGuia}`;

function FilaEnvio({
  envio,
  alReintentar,
  alDescartar,
}: {
  envio: EnvioLocal;
  alReintentar: () => void;
  alDescartar: () => void;
}) {
  // `confirmada` no llega aquí: la lista solo trae lo que falta.
  const estado = envio.estado as EstadoEnvio;
  const presentacion = PRESENTACION_ENVIO[estado];
  return (
    <Tarjeta>
      <View style={styles.cabecera}>
        <View style={styles.textos}>
          <Texto negrita>{titulo(envio)}</Texto>
          <Texto tono="secundario" variante="etiqueta">
            {[
              envio.nombreDestinatario,
              envio.codigoDespacho === null
                ? null
                : nombreDespacho({
                    numero: envio.numeroDespacho,
                    codigoDespacho: envio.codigoDespacho,
                  }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </Texto>
        </View>
        <Insignia texto={presentacion.texto} tono={presentacion.tono} />
      </View>
      <Texto tono="secundario" variante="pie">
        Guardado el {fechaHora(envio.creadaEn)}
        {envio.intentos > 0
          ? ` · ${envio.intentos} ${envio.intentos === 1 ? 'intento' : 'intentos'}`
          : ''}
      </Texto>
      {envio.ultimoError ? (
        <Texto
          tono={requiereAccion(estado) ? 'peligro' : 'secundario'}
          variante="etiqueta">
          {envio.ultimoError}
        </Texto>
      ) : null}
      {requiereAccion(estado) ? (
        <View style={styles.acciones}>
          <Boton
            icono={Trash}
            tamano="compacto"
            tipo="texto"
            titulo="Descartar"
            onPress={alDescartar}
          />
          <Boton
            icono={RotateCcw}
            tamano="compacto"
            tipo="secundario"
            titulo="Reintentar"
            onPress={alReintentar}
          />
        </View>
      ) : null}
    </Tarjeta>
  );
}

/** La cola del conductor: qué falta por llegar a Fluor y por qué (docs/offline.md §13). */
export function EnviosPantalla({navigation}: Props) {
  const {data: envios = [], isPending} = useEnvios();
  const acciones = useAccionesEnvio();

  const confirmarDescarte = (envio: EnvioLocal) =>
    Alert.alert(
      '¿Descartar este envío?',
      'Se borra del teléfono con sus fotos y no llegará a la empresa. Hazlo solo si la oficina te lo indica.',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => acciones.descartar.mutate(envio.idOperacion),
        },
      ],
    );

  // `Date.now()` en render: la pantalla se vuelve a pintar cada vez que cambia la cola.
  const atrasado = envios.some(
    envio => Date.now() - envio.creadaEn > LIMITE_ATRASO_MS,
  );

  return (
    <Pantalla
      pie={
        envios.length > 0 ? (
          <Boton
            cargando={acciones.enviarAhora.isPending}
            icono={Send}
            titulo="Enviar ahora"
            onPress={() => acciones.enviarAhora.mutate()}
          />
        ) : undefined
      }>
      <Encabezado alVolver={() => navigation.goBack()} titulo="Envíos" />
      {isPending ? (
        <Cargando />
      ) : (
        <FlatList
          contentContainerStyle={styles.lista}
          data={envios}
          keyExtractor={envio => envio.idOperacion}
          ListEmptyComponent={
            <EstadoVacio
              icono={CircleCheck}
              mensaje="Todo lo que hiciste ya llegó a la empresa."
              titulo="Nada por enviar"
              tono="exito"
            />
          }
          ListHeaderComponent={
            atrasado ? (
              <Aviso
                icono={Clock}
                mensaje="Tienes envíos sin enviar desde ayer. Busca señal o avisa a la oficina."
                tono="advertencia"
              />
            ) : undefined
          }
          renderItem={({item}) => (
            <FilaEnvio
              alDescartar={() => confirmarDescarte(item)}
              alReintentar={() => acciones.reintentar.mutate(item.idOperacion)}
              envio={item}
            />
          )}
        />
      )}
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  lista: {flexGrow: 1, gap: tema.espaciado.md, padding: tema.espaciado.lg},
  cabecera: {flexDirection: 'row', gap: tema.espaciado.sm},
  textos: {flex: 1, gap: 2},
  acciones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tema.espaciado.sm,
  },
}));
