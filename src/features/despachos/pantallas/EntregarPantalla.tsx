import {zodResolver} from '@hookform/resolvers/zod';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {type ComponentRef, useEffect, useRef, useState} from 'react';
import {Controller, useForm, useWatch} from 'react-hook-form';
import {BackHandler, Pressable, type TextInput, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {mensajeUsuario} from '@/core/api';
import {
  ArrowRight,
  Boton,
  Cargando,
  Check,
  CircleCheck,
  Encabezado,
  EstadoVacio,
  Icono,
  Input,
  mostrarError,
  mostrarExito,
  Pantalla,
  Pasos,
  Selector,
  Texto,
  TriangleAlert,
  type ControlFirma,
} from '@/ui';

import {destinatario} from '../components/FilaGuia';
import {PasoFirma} from '../components/PasoFirma';
import {PasoFotos} from '../components/PasoFotos';
import {pesos} from '../domain/formato';
import {
  esquemaFormularioEntrega,
  type FormularioEntrega,
} from '../domain/formularios';
import {
  aCobrar,
  evidenciaFaltante,
  PARENTESCOS,
  PARENTESCOS_FRECUENTES,
  puedeEntregar,
} from '../domain/gestion';
import {useDespacho, useGuia} from '../hooks/useDespachos';
import {useUbicacion} from '../hooks/useEvidencias';
import {useConfiguracionEntrega, useEntregar} from '../hooks/useGestion';
import type {RutasDespachos} from '../rutas';

type Props = NativeStackScreenProps<RutasDespachos, 'Entregar'>;

const PASOS = ['Fotos', 'Quién recibe', 'Firma'] as const;
const FOTOS = 0;
const RECIBE = 1;
const FIRMA = 2;

const TITULAR = 'TITULAR';

/**
 * Entrega en tres pasos (fotos, quién recibe, firma), como en el diseño.
 * Se guarda en el teléfono con o sin señal; la cola la envía (docs/offline.md §6.2).
 */
export function EntregarPantalla({navigation, route}: Props) {
  const {tenantDespachoId, codigoGuia} = route.params;
  const identificacionRef = useRef<ComponentRef<typeof TextInput>>(null);
  const celularRef = useRef<ComponentRef<typeof TextInput>>(null);
  const panel = useRef<ControlFirma>(null);
  const {data: despacho} = useDespacho(tenantDespachoId);
  const {data: guia, isPending} = useGuia(tenantDespachoId, codigoGuia);
  const configuracion = useConfiguracionEntrega();
  const entregar = useEntregar(tenantDespachoId, codigoGuia);
  const ubicacion = useUbicacion();
  const [paso, setPaso] = useState(FOTOS);
  const [fotos, setFotos] = useState<string[]>([]);
  const [firma, setFirma] = useState<string | null>(null);
  const [conTrazos, setConTrazos] = useState(false);
  const {control, handleSubmit, trigger, setValue} = useForm<FormularioEntrega>(
    {
      resolver: zodResolver(esquemaFormularioEntrega),
      defaultValues: {
        recibe: '',
        numeroIdentificacion: '',
        parentesco: '',
        celular: '',
      },
    },
  );
  const [recibe, parentesco, numeroIdentificacion] = useWatch({
    control,
    name: ['recibe', 'parentesco', 'numeroIdentificacion'],
  });

  /** Lo dibujado pasa a archivo: al volver de paso o al confirmar. */
  const guardarTrazos = async () => {
    if (firma || !conTrazos) return firma;
    try {
      const archivo = (await panel.current?.capturar()) ?? null;
      setFirma(archivo);
      return archivo;
    } catch {
      mostrarError('No se pudo guardar la firma. Inténtalo de nuevo.');
      throw new Error('firma');
    }
  };

  const atras = async () => {
    if (paso === FIRMA) await guardarTrazos().catch(() => undefined);
    setPaso(actual => Math.max(FOTOS, actual - 1));
  };

  // El botón atrás de Android vuelve un paso; en el primero cierra.
  const atrasRef = useRef(atras);
  useEffect(() => {
    atrasRef.current = atras;
  });
  useEffect(() => {
    const suscripcion = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (paso === FOTOS) return false;
        atrasRef.current();
        return true;
      },
    );
    return () => suscripcion.remove();
  }, [paso]);

  const cerrar = () => navigation.goBack();

  if (isPending) {
    return (
      <Pantalla>
        <Cargando />
      </Pantalla>
    );
  }

  const permiso =
    guia && despacho
      ? puedeEntregar(despacho, guia, configuracion)
      : {
          permitido: false as const,
          motivo: 'La guía ya no está en el teléfono.',
        };
  if (!guia || !permiso.permitido) {
    return (
      <Pantalla>
        <Encabezado alVolver={cerrar} tipoVolver="cerrar" titulo="Entregar" />
        <EstadoVacio
          icono={TriangleAlert}
          mensaje={permiso.permitido ? undefined : permiso.motivo}
          titulo="No se puede entregar"
          tono="advertencia"
        />
      </Pantalla>
    );
  }

  const cobro = aCobrar(guia);
  const nombre = guia.nombreDestinatario?.trim() ?? '';
  const recibeTitular =
    nombre !== '' && recibe === nombre && parentesco === TITULAR;

  const alternarTitular = () => {
    const opciones = {shouldValidate: true};
    setValue('recibe', recibeTitular ? '' : nombre, opciones);
    setValue('parentesco', recibeTitular ? '' : TITULAR, opciones);
  };

  const siguiente = async () => {
    if (paso === FOTOS) {
      const faltante = evidenciaFaltante(
        {...configuracion, exigeFirma: false},
        {fotos: fotos.length, firma: false},
      );
      if (faltante) {
        mostrarError(faltante);
        return;
      }
      setPaso(RECIBE);
      return;
    }
    if (await trigger()) setPaso(FIRMA);
  };

  const confirmar = async () => {
    let archivo: string | null;
    try {
      archivo = await guardarTrazos();
    } catch {
      return;
    }
    const faltante = evidenciaFaltante(configuracion, {
      fotos: fotos.length,
      firma: archivo !== null,
    });
    if (faltante) {
      mostrarError(faltante);
      return;
    }
    await handleSubmit(datos =>
      entregar.mutate(
        {datos, fotos, firma: archivo, ubicacion},
        {
          onSuccess: () => {
            mostrarExito('Entrega guardada');
            navigation.popTo('Despacho', {
              tenantDespachoId,
              verPendientes: Date.now(),
            });
          },
          onError: error => mostrarError(mensajeUsuario(error)),
        },
      ),
    )();
  };

  const borrarFirma = () => {
    setFirma(null);
    setConTrazos(false);
    panel.current?.limpiar();
  };

  const parentescoTitulo = PARENTESCOS.find(
    p => p.valor === parentesco,
  )?.titulo;
  const leyenda =
    [recibe.trim(), parentescoTitulo].filter(Boolean).join(' · ') ||
    'Firma aquí';
  const resumen = [
    fotos.length === 1 ? '1 foto' : `${fotos.length} fotos`,
    numeroIdentificacion.trim() ? `Doc. ${numeroIdentificacion.trim()}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const pie =
    paso === FOTOS ? (
      <Boton
        icono={ArrowRight}
        posicionIcono="fin"
        titulo="Siguiente"
        onPress={siguiente}
      />
    ) : (
      <View style={styles.acciones}>
        <View style={styles.atras}>
          <Boton
            disabled={entregar.isPending}
            tipo="neutro"
            titulo="Atrás"
            onPress={atras}
          />
        </View>
        <View style={styles.adelante}>
          {paso === RECIBE ? (
            <Boton
              icono={ArrowRight}
              posicionIcono="fin"
              titulo="Siguiente"
              onPress={siguiente}
            />
          ) : (
            <Boton
              cargando={entregar.isPending}
              icono={CircleCheck}
              titulo="Confirmar entrega"
              onPress={confirmar}
            />
          )}
        </View>
      </View>
    );

  return (
    // La firma no va en un ScrollView: el desplazamiento le robaría el trazo.
    <Pantalla
      desplazable={paso !== FIRMA}
      estiloContenido={paso === FIRMA ? styles.fijo : undefined}
      pie={pie}>
      <Encabezado
        alVolver={cerrar}
        detalle={
          cobro > 0 ? (
            <>
              {codigoGuia} ·{' '}
              <Texto negrita tono="advertencia" variante="pie">
                {pesos(cobro)} por cobrar
              </Texto>
            </>
          ) : (
            String(codigoGuia)
          )
        }
        tipoVolver="cerrar"
        titulo={`Entregar a ${destinatario(guia)}`}
      />
      <Pasos actual={paso} pasos={PASOS} />

      <View style={styles.cuerpo}>
        {paso === FOTOS ? (
          <PasoFotos
            alCambiar={setFotos}
            exigida={configuracion.exigeFoto}
            fotos={fotos}
          />
        ) : null}

        {paso === RECIBE ? (
          <View style={styles.formulario}>
            {nombre ? (
              <Pressable
                accessibilityLabel={`Recibe ${nombre}`}
                accessibilityRole="checkbox"
                accessibilityState={{checked: recibeTitular}}
                style={[styles.atajo, recibeTitular && styles.atajoActivo]}
                onPress={alternarTitular}>
                <View style={[styles.casilla, recibeTitular && styles.marcada]}>
                  {recibeTitular ? (
                    <Icono
                      color="sobreAccion"
                      grosor={3}
                      icono={Check}
                      tamano={15}
                    />
                  ) : null}
                </View>
                <Texto negrita style={styles.textoAtajo}>
                  Recibe {nombre}
                </Texto>
              </Pressable>
            ) : null}
            <Controller
              control={control}
              name="recibe"
              render={({field, fieldState}) => (
                <Input
                  autoCapitalize="words"
                  error={fieldState.error?.message}
                  etiqueta="Nombre de quien recibe"
                  returnKeyType="next"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  onSubmitEditing={() => identificacionRef.current?.focus()}
                />
              )}
            />
            <Controller
              control={control}
              name="numeroIdentificacion"
              render={({field, fieldState}) => (
                <Input
                  ref={identificacionRef}
                  error={fieldState.error?.message}
                  etiqueta="Número de documento"
                  keyboardType="number-pad"
                  returnKeyType="next"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  onSubmitEditing={() => celularRef.current?.focus()}
                />
              )}
            />
            <Controller
              control={control}
              name="parentesco"
              render={({field, fieldState}) => (
                <Selector
                  alCambiar={field.onChange}
                  buscable
                  destacadas={PARENTESCOS_FRECUENTES}
                  error={fieldState.error?.message}
                  etiqueta="Parentesco"
                  opcional
                  opciones={PARENTESCOS}
                  pregunta={`¿Qué es de ${nombre || 'el destinatario'}?`}
                  vacio="Sin especificar"
                  valor={field.value}
                />
              )}
            />
            <Controller
              control={control}
              name="celular"
              render={({field, fieldState}) => (
                <Input
                  ref={celularRef}
                  error={fieldState.error?.message}
                  etiqueta="Celular (opcional)"
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                />
              )}
            />
          </View>
        ) : null}

        {paso === FIRMA ? (
          <PasoFirma
            alBorrar={borrarFirma}
            alCambiarTrazos={setConTrazos}
            cobro={cobro}
            conTrazos={conTrazos}
            conUbicacion={ubicacion !== null}
            exigida={configuracion.exigeFirma}
            firma={firma}
            leyenda={leyenda}
            panel={panel}
            resumen={resumen}
          />
        ) : null}
      </View>
    </Pantalla>
  );
}

const styles = StyleSheet.create(tema => ({
  fijo: {gap: tema.espaciado.lg, padding: tema.espaciado.lg},
  cuerpo: {paddingHorizontal: tema.espaciado.sm},
  formulario: {gap: tema.espaciado.md + 2},
  atajo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.sm + 2,
    minHeight: tema.alto.control,
    paddingHorizontal: tema.espaciado.md + 2,
    borderRadius: tema.radio.md,
    borderWidth: 1,
    borderColor: tema.colores.bordeCampo,
    backgroundColor: tema.colores.campo,
  },
  atajoActivo: {borderWidth: 2, borderColor: tema.colores.primario},
  casilla: {
    width: 24,
    height: 24,
    borderRadius: tema.radio.pill,
    borderWidth: 2,
    borderColor: tema.colores.bordeCampo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcada: {borderWidth: 0, backgroundColor: tema.colores.accion},
  textoAtajo: {flex: 1},
  acciones: {flexDirection: 'row', gap: tema.espaciado.sm + 2},
  atras: {flex: 1},
  adelante: {flex: 1.6},
}));
