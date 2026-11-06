import type {ReactNode} from 'react';
import {View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {
  Boton,
  Icono,
  IconoDestacado,
  mostrarExito,
  Texto,
  Info,
  Mail,
} from '@/ui';

import {formatoMinutos, useCuentaRegresiva} from '../hooks/useCuentaRegresiva';
import {PantallaAcceso} from './PantallaAcceso';

/** Fluor permite un reenvío por minuto; esperar evita un "Demasiados intentos". */
const ESPERA_REENVIO_SEGUNDOS = 60;

type Props = {
  /** Texto bajo el título; puede resaltar el correo con un `Texto` en negrita. */
  children: ReactNode;
  alVolver: () => void;
  alReenviar: () => Promise<unknown>;
  reenviando: boolean;
};

/** Confirmación tras pedir un correo (registro, recuperar clave, reenviar verificación). */
export function CorreoEnviado({
  children,
  alVolver,
  alReenviar,
  reenviando,
}: Props) {
  const {restante, reiniciar} = useCuentaRegresiva(ESPERA_REENVIO_SEGUNDOS);

  const reenviar = async () => {
    try {
      await alReenviar();
      reiniciar();
      mostrarExito('Te lo enviamos de nuevo.');
    } catch {
      // El hook de la petición ya mostró el error.
    }
  };

  return (
    <PantallaAcceso
      estiloContenido={styles.contenido}
      pie={
        <>
          <Boton titulo="Volver a iniciar sesión" onPress={alVolver} />
          <Boton
            cargando={reenviando}
            disabled={restante > 0}
            tamano="compacto"
            tipo="texto"
            titulo={
              restante > 0
                ? `Reenviar en ${formatoMinutos(restante)}`
                : 'Reenviar correo'
            }
            onPress={reenviar}
          />
        </>
      }>
      <IconoDestacado icono={Mail} solido tamano="lg" />
      <View style={styles.textos}>
        <Texto centrado negrita variante="titulo">
          Revisa tu correo
        </Texto>
        <Texto centrado tono="secundario">
          {children}
        </Texto>
      </View>
      <View style={styles.consejo}>
        <Icono color="textoSecundario" icono={Info} tamano={16} />
        <Texto tono="secundario" variante="etiqueta">
          ¿No aparece? Revisa la carpeta de spam.
        </Texto>
      </View>
    </PantallaAcceso>
  );
}

const styles = StyleSheet.create(tema => ({
  contenido: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: tema.espaciado.xl,
    paddingHorizontal: tema.espaciado.xxl,
  },
  textos: {gap: tema.espaciado.sm + 2},
  consejo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tema.espaciado.sm,
    paddingVertical: tema.espaciado.sm + 2,
    paddingHorizontal: tema.espaciado.md + 2,
    borderRadius: tema.radio.md,
    backgroundColor: tema.colores.superficie,
  },
}));
