import {escribir, leer} from '@/core/db';

import {clasificarFallo} from './clasificar';
import {
  marcarConfirmada,
  marcarEnviando,
  marcarFallida,
  pausarUsuario,
  programarReintento,
  siguienteLista,
  type Operacion,
} from './cola';
import {calcularEspera} from './espera';

/**
 * Envía una operación a Fluor. Debe lanzar el error de la API tal cual (el
 * motor lo clasifica) y mandar `operacion.idOperacion` como `id_operacion`.
 */
export type Enviador = (operacion: {
  idOperacion: string;
  cuerpo: unknown;
}) => Promise<void>;

export type DependenciasMotor = {
  /** Por tipo de operación. Un tipo sin enviador espera en la cola (p. ej. un endpoint que Fluor aún no publica). */
  enviadores: Record<string, Enviador>;
  /** Usuario con sesión; el motor solo envía sus operaciones. */
  usuarioActual: () => number | null;
  ahora?: () => number;
  aleatorio?: () => number;
};

export type OpcionesEjecucion = {
  /** Enviar ya aunque una operación esté esperando su próximo intento (la red volvió, "Enviar ahora"). */
  ignorarEspera?: boolean;
};

type Oyente = () => void;

export const crearMotor = ({
  enviadores,
  usuarioActual,
  ahora = Date.now,
  aleatorio = Math.random,
}: DependenciasMotor) => {
  const oyentes = new Set<Oyente>();
  let enCurso: Promise<void> | null = null;
  let repetir: OpcionesEjecucion | null = null;

  const avisar = () => oyentes.forEach(oyente => oyente());
  const tipos = Object.keys(enviadores);

  /** Envía una; devuelve si se puede seguir con la siguiente. */
  const enviar = async (operacion: Operacion, usuarioId: number) => {
    const enviador = enviadores[operacion.tipo];
    if (!enviador) return true;

    await escribir(tx => marcarEnviando(tx, operacion.idOperacion));
    avisar();
    try {
      await enviador({
        idOperacion: operacion.idOperacion,
        cuerpo: JSON.parse(operacion.cuerpo),
      });
      await escribir(tx =>
        marcarConfirmada(tx, operacion.idOperacion, ahora()),
      );
      return true;
    } catch (error) {
      const fallo = clasificarFallo(error);
      if (fallo.clase === 'transitorio') {
        const espera = calcularEspera(
          operacion.intentos + 1,
          aleatorio,
          fallo.reintentarEn,
        );
        await escribir(tx =>
          programarReintento(tx, operacion.idOperacion, {
            ...fallo,
            proximoIntento: ahora() + espera,
          }),
        );
        // Si una falló por red, las siguientes también fallarían.
        return false;
      }
      if (fallo.clase === 'sesion') {
        await escribir(async tx => {
          await programarReintento(tx, operacion.idOperacion, {
            ...fallo,
            proximoIntento: ahora(),
          });
          await pausarUsuario(tx, usuarioId);
        });
        return false;
      }
      // Rechazada o en conflicto: solo frena lo que depende de ella.
      await escribir(tx =>
        marcarFallida(
          tx,
          operacion.idOperacion,
          fallo.clase === 'conflicto' ? 'conflicto' : 'rechazada',
          fallo,
        ),
      );
      return true;
    } finally {
      avisar();
    }
  };

  const vaciar = async ({ignorarEspera = false}: OpcionesEjecucion) => {
    const enviadas = new Set<string>();
    for (;;) {
      const usuarioId = usuarioActual();
      if (usuarioId === null) return;
      const operacion = await leer(db =>
        siguienteLista(db, {
          usuarioId,
          tipos,
          hasta: ignorarEspera ? null : ahora(),
        }),
      );
      // Con `ignorarEspera`, una que acaba de fallar volvería a salir enseguida.
      if (!operacion || enviadas.has(operacion.idOperacion)) return;
      enviadas.add(operacion.idOperacion);
      const seguir = await enviar(operacion, usuarioId);
      if (!seguir) return;
    }
  };

  /**
   * Envía todo lo que esté listo. Una sola ejecución a la vez: si llega otro
   * disparador mientras corre, se repite al terminar.
   */
  const ejecutar = (opciones: OpcionesEjecucion = {}): Promise<void> => {
    if (enCurso) {
      repetir = {
        ignorarEspera: Boolean(
          repetir?.ignorarEspera || opciones.ignorarEspera,
        ),
      };
      return enCurso;
    }
    enCurso = (async () => {
      try {
        let siguiente: OpcionesEjecucion | null = opciones;
        while (siguiente) {
          repetir = null;
          await vaciar(siguiente);
          siguiente = repetir;
        }
      } finally {
        enCurso = null;
      }
    })();
    return enCurso;
  };

  /** Para que la UI se entere de cambios en la cola. Devuelve cómo dejar de escuchar. */
  const suscribir = (oyente: Oyente) => {
    oyentes.add(oyente);
    return () => {
      oyentes.delete(oyente);
    };
  };

  return {ejecutar, suscribir, avisar};
};

export type Motor = ReturnType<typeof crearMotor>;
