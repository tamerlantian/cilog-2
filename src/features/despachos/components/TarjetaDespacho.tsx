import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {
  ChevronRight,
  CircleCheck,
  Icono,
  Insignia,
  Send,
  Tarjeta,
  Texto,
} from '@/ui';

import type {DespachoLocal} from '../db/repositorio';
import {fechaCorta} from '../domain/formato';

type Props = {despacho: DespachoLocal; alPresionar: () => void};

export const nombreDespacho = (despacho: {
  numero: number | null;
  codigoDespacho: number;
}) => `Despacho ${despacho.numero ?? despacho.codigoDespacho}`;

export const nombreEmpresa = (despacho: {
  tenantNombre: string | null;
  tenantId: number;
}) => despacho.tenantNombre ?? `Operador ${despacho.tenantId}`;

export function TarjetaDespacho({despacho, alPresionar}: Props) {
  const fecha = fechaCorta(despacho.fechaSalida ?? despacho.asignadoEn);
  const sinGuias = despacho.descargadoEn === null;
  const avance =
    despacho.totalGuias > 0 ? despacho.gestionadas / despacho.totalGuias : 0;
  styles.useVariants({completo: avance === 1});

  return (
    <Tarjeta
      alPresionar={alPresionar}
      etiqueta={`${nombreDespacho(despacho)}, ${nombreEmpresa(despacho)}`}>
      <View style={styles.cabecera}>
        <View style={styles.titulos}>
          <Texto numberOfLines={1} tono="secundario" variante="etiqueta">
            {nombreEmpresa(despacho)}
            {fecha ? ` · ${fecha}` : ''}
          </Texto>
          <Texto negrita variante="subtitulo">
            {nombreDespacho(despacho)}
          </Texto>
        </View>
        <Icono color="textoSecundario" icono={ChevronRight} />
      </View>

      {sinGuias ? (
        <Texto tono="secundario" variante="etiqueta">
          Guías sin descargar. Actualiza con señal.
        </Texto>
      ) : (
        <View style={styles.avance}>
          <View style={styles.barra}>
            <View style={[styles.relleno, styles.ancho(avance)]} />
          </View>
          <Texto numerico tono="secundario" variante="etiqueta">
            {despacho.gestionadas} de {despacho.totalGuias}
          </Texto>
        </View>
      )}

      {despacho.liberado || despacho.porEnviar > 0 || despacho.terminadoEn ? (
        <View style={styles.insignias}>
          {despacho.terminadoEn ? (
            <Insignia icono={CircleCheck} texto="Terminado" tono="exito" />
          ) : null}
          {despacho.liberado ? (
            <Insignia texto="Liberado" tono="advertencia" />
          ) : null}
          {despacho.porEnviar > 0 ? (
            <Insignia
              icono={Send}
              texto={`${despacho.porEnviar} por enviar`}
              tono="info"
            />
          ) : null}
        </View>
      ) : null}
    </Tarjeta>
  );
}

const styles = StyleSheet.create(tema => ({
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.sm,
  },
  titulos: {flex: 1, gap: 2},
  avance: {flexDirection: 'row', alignItems: 'center', gap: tema.espaciado.md},
  barra: {
    flex: 1,
    height: 8,
    borderRadius: tema.radio.pill,
    backgroundColor: tema.colores.superficie,
    overflow: 'hidden',
  },
  relleno: {
    height: '100%',
    borderRadius: tema.radio.pill,
    variants: {
      completo: {
        true: {backgroundColor: tema.colores.exito},
        false: {backgroundColor: tema.colores.primario},
      },
    },
  },
  ancho: (avance: number) => ({width: `${Math.round(avance * 100)}%`}),
  insignias: {flexDirection: 'row', flexWrap: 'wrap', gap: tema.espaciado.xs},
}));
