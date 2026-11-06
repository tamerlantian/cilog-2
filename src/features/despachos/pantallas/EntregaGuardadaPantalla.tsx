import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {
  ArrowRight,
  Boton,
  Check,
  CircleCheck,
  Icono,
  IconoDestacado,
  Pantalla,
  RefreshCw,
  Texto,
  TriangleAlert,
  type TipoIcono,
} from '@/ui';

import type {EnvioGuia} from '../db/repositorio';
import {destinatario} from '../components/FilaGuia';
import {hora} from '../domain/formato';
import {resumenGuias, siguientePendiente} from '../domain/guias';
import {useGuia, useGuias} from '../hooks/useDespachos';
import type {RutasDespachos} from '../rutas';

type Props = NativeStackScreenProps<RutasDespachos, 'EntregaGuardada'>;

const ENVIO: Record<
  'porEnviar' | 'conProblema' | 'enviada',
  {
    titulo: string;
    detalle: string;
    icono: TipoIcono;
    tono: 'advertencia' | 'peligro' | 'exito';
  }
> = {
  porEnviar: {
    titulo: 'Enviando a la empresa…',
    detalle: 'Puedes seguir: si se va la señal, termina de enviarse solo.',
    icono: RefreshCw,
    tono: 'advertencia',
  },
  conProblema: {
    titulo: 'No se pudo enviar',
    detalle: 'Revísalo en Envíos: ahí ves el motivo y puedes reintentar.',
    icono: TriangleAlert,
    tono: 'peligro',
  },
  enviada: {
    titulo: 'Enviada a la empresa',
    detalle: 'La empresa ya recibió la entrega.',
    icono: Check,
    tono: 'exito',
  },
};

const estadoEnvio = (envio: EnvioGuia | undefined) => envio ?? 'enviada';

/** Después de entregar: confirma, muestra si ya salió y lleva a la siguiente guía. */
export function EntregaGuardadaPantalla({navigation, route}: Props) {
  const {tenantDespachoId, codigoGuia, guardadaEn} = route.params;
  const {data: guia} = useGuia(tenantDespachoId, codigoGuia);
  const {data: guias = []} = useGuias(tenantDespachoId);
  const resumen = resumenGuias(guias);
  const siguiente = siguientePendiente(guias, codigoGuia);
  const envio = ENVIO[estadoEnvio(guia?.envio)];

  const alDespacho = () => navigation.popTo('Despacho', {tenantDespachoId});

  return (
    <Pantalla
      pie={
        <>
          {siguiente ? (
            <Boton
              icono={ArrowRight}
              posicionIcono="fin"
              titulo="Siguiente guía"
              onPress={() =>
                navigation.popTo('Guia', {
                  tenantDespachoId,
                  codigoGuia: siguiente.codigoGuia,
                })
              }
            />
          ) : (
            <Boton titulo="Volver al despacho" onPress={alDespacho} />
          )}
          <Boton
            tipo="texto"
            titulo="Ver envíos"
            onPress={() => {
              alDespacho();
              navigation.navigate('Envios');
            }}
          />
        </>
      }>
      <View style={styles.cuerpo}>
        <IconoDestacado icono={Check} tamano="lg" tono="accion" />
        <View style={styles.textos}>
          <Texto accessibilityRole="header" centrado variante="titulo">
            Entrega guardada
          </Texto>
          <Texto centrado mono tono="secundario" variante="pie">
            {codigoGuia}
            {guia ? ` · ${destinatario(guia)}` : ''} · {hora(guardadaEn)}
          </Texto>
        </View>

        <View style={styles.envio}>
          <View style={styles.filaEnvio}>
            <View style={[styles.circulo, styles[envio.tono]]}>
              <Icono color={envio.tono} icono={envio.icono} tamano={16} />
            </View>
            <View style={styles.textosEnvio}>
              <Texto negrita variante="etiqueta">
                {envio.titulo}
              </Texto>
              <Texto tono="secundario" variante="etiqueta">
                {envio.detalle}
              </Texto>
            </View>
          </View>
        </View>

        <View style={styles.cuentas}>
          <Icono color="exito" icono={CircleCheck} tamano={16} />
          <Texto numerico tono="secundario">
            <Texto negrita>{resumen.entregadas}</Texto> entregadas ·{' '}
            <Texto negrita>{resumen.pendientes}</Texto> pendientes
          </Texto>
        </View>
      </View>
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  cuerpo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tema.espaciado.xl - 2,
    paddingHorizontal: tema.espaciado.xl + 4,
  },
  textos: {gap: tema.espaciado.sm},
  envio: {
    alignSelf: 'stretch',
    padding: tema.espaciado.lg - 2,
    borderRadius: tema.radio.lg - 2,
    borderWidth: 1,
    borderColor: tema.colores.borde,
    backgroundColor: tema.colores.fondo,
  },
  filaEnvio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.md,
  },
  circulo: {
    width: 32,
    height: 32,
    borderRadius: tema.radio.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advertencia: {backgroundColor: tema.colores.advertenciaSuave},
  peligro: {backgroundColor: tema.colores.peligroSuave},
  exito: {backgroundColor: tema.colores.exitoSuave},
  textosEnvio: {flex: 1, gap: 2},
  cuentas: {flexDirection: 'row', alignItems: 'center', gap: tema.espaciado.sm},
}));
