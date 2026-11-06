import {Pressable, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {
  ArrowRight,
  Boton,
  Check,
  ChevronRight,
  Icono,
  Insignia,
  Send,
  Tarjeta,
  Texto,
} from '@/ui';

import type {DespachoLocal} from '../db/repositorio';
import {plural} from '../domain/envios';
import {fechaCorta} from '../domain/formato';
import {BarraAvance} from './BarraAvance';
import {TarjetaDestacada} from './TarjetaDestacada';

type Props = {despacho: DespachoLocal; alPresionar: () => void};

export const nombreDespacho = (despacho: {
  numero: number | null;
  codigoDespacho: number;
}) => `Despacho ${despacho.numero ?? despacho.codigoDespacho}`;

/** "#12345": como aparece en el manifiesto. */
export const codigoDespacho = (despacho: {
  numero: number | null;
  codigoDespacho: number;
}) => `#${despacho.numero ?? despacho.codigoDespacho}`;

export const nombreEmpresa = (despacho: {
  tenantNombre: string | null;
  tenantId: number;
}) => despacho.tenantNombre ?? `Operador ${despacho.tenantId}`;

const fechaDespacho = (despacho: DespachoLocal) =>
  fechaCorta(despacho.fechaSalida ?? despacho.asignadoEn);

const sinDescargar = (despacho: DespachoLocal) =>
  despacho.descargadoEn === null;

/** Liberado y por enviar: lo que el conductor debe saber antes de abrirlo. */
function Avisos({despacho}: {despacho: DespachoLocal}) {
  if (!despacho.liberado && despacho.porEnviar === 0) return null;
  return (
    <View style={styles.insignias}>
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
  );
}

/** El despacho en curso más reciente: grande, con su avance y la acción de seguir. */
export function DespachoDestacado({despacho, alPresionar}: Props) {
  const fecha = fechaDespacho(despacho);
  const pendientes = despacho.totalGuias - despacho.gestionadas;
  return (
    <TarjetaDestacada
      etiqueta={`${nombreDespacho(despacho)}, ${nombreEmpresa(despacho)}`}>
      <View style={styles.cabecera}>
        <Texto
          mono
          numberOfLines={1}
          style={styles.flex}
          tono="secundario"
          variante="etiqueta">
          {codigoDespacho(despacho)} · {nombreEmpresa(despacho)}
        </Texto>
        {fecha ? <Insignia texto={fecha} /> : null}
      </View>

      {sinDescargar(despacho) ? (
        <View style={styles.textos}>
          <Texto style={styles.cifra} variante="display">
            Guías sin descargar
          </Texto>
          <Texto tono="secundario" variante="etiqueta">
            Ábrelo con señal para trabajarlo sin conexión.
          </Texto>
        </View>
      ) : (
        <>
          <Texto numerico style={styles.cifra} variante="display">
            {pendientes > 0
              ? plural(pendientes, 'pendiente', 'pendientes')
              : 'Todo gestionado'}
          </Texto>
          <BarraAvance
            entregadas={despacho.gestionadas - despacho.novedades}
            grosor="gruesa"
            leyenda
            novedades={despacho.novedades}
            total={despacho.totalGuias}
          />
        </>
      )}
      <Avisos despacho={despacho} />
      <Boton
        icono={ArrowRight}
        posicionIcono="fin"
        tamano="compacto"
        titulo={pendientes > 0 ? 'Continuar entregas' : 'Abrir despacho'}
        onPress={alPresionar}
      />
    </TarjetaDestacada>
  );
}

/** Otro despacho en curso: una fila con su código y cuánto lleva. */
export function TarjetaDespacho({despacho, alPresionar}: Props) {
  const fecha = fechaDespacho(despacho);
  const avance = sinDescargar(despacho)
    ? 'Guías sin descargar'
    : `${despacho.gestionadas} de ${despacho.totalGuias} gestionadas`;
  return (
    <Tarjeta
      alPresionar={alPresionar}
      etiqueta={`${nombreDespacho(despacho)}, ${nombreEmpresa(despacho)}, ${avance}`}
      style={styles.compacta}>
      <View style={styles.fila}>
        <View style={[styles.flex, styles.textos]}>
          <View style={styles.cabecera}>
            <Texto media mono>
              {codigoDespacho(despacho)}
            </Texto>
            <Texto
              numberOfLines={1}
              style={styles.flex}
              tono="secundario"
              variante="etiqueta">
              {nombreEmpresa(despacho)}
            </Texto>
          </View>
          <Texto numerico tono="secundario" variante="etiqueta">
            {avance}
            {fecha ? ` · ${fecha}` : ''}
          </Texto>
        </View>
        <Icono color="textoSecundario" icono={ChevronRight} />
      </View>
      <Avisos despacho={despacho} />
    </Tarjeta>
  );
}

/** Despacho terminado: solo su código y el total, para consultarlo. */
export function FilaDespachoTerminado({despacho, alPresionar}: Props) {
  const fecha = fechaDespacho(despacho);
  return (
    <Pressable
      accessibilityLabel={`${nombreDespacho(despacho)}, terminado, ${despacho.totalGuias} guías`}
      accessibilityRole="button"
      style={({pressed}) => [styles.terminado, pressed && styles.presionado]}
      onPress={alPresionar}>
      <View style={styles.check}>
        <Icono color="exito" grosor={2.6} icono={Check} tamano={15} />
      </View>
      <Texto media mono>
        {codigoDespacho(despacho)}
      </Texto>
      <Texto
        numerico
        numberOfLines={1}
        style={styles.resumenTerminado}
        tono="secundario"
        variante="etiqueta">
        {fecha ? `${fecha} · ` : ''}
        {despacho.gestionadas} de {despacho.totalGuias} guías
      </Texto>
      {despacho.porEnviar > 0 ? (
        <Icono color="info" icono={Send} tamano={16} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create(tema => ({
  flex: {flex: 1},
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.sm,
  },
  textos: {gap: 3},
  cifra: {fontSize: 28, lineHeight: 34, letterSpacing: -0.5},
  insignias: {flexDirection: 'row', flexWrap: 'wrap', gap: tema.espaciado.xs},
  compacta: {paddingVertical: tema.espaciado.md},
  fila: {flexDirection: 'row', alignItems: 'center', gap: tema.espaciado.md},
  terminado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.md,
    minHeight: tema.alto.botonCompacto + 4,
    paddingHorizontal: tema.espaciado.xs,
  },
  presionado: {opacity: 0.6},
  check: {
    width: 28,
    height: 28,
    borderRadius: tema.radio.pill,
    backgroundColor: tema.colores.exitoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumenTerminado: {flex: 1, textAlign: 'right'},
}));
