import {eq} from 'drizzle-orm';

import {ErrorApi, type CodigoError} from '@/core/api';
import {escribir, leer, operaciones} from '@/core/db';
import {
  calcularEspera,
  crearMotor,
  descartar,
  encolar,
  reintentar,
  resumenCola,
  type Enviador,
  type NuevaOperacion,
} from '@/core/sync';
import {reanudarUsuario, recuperarInterrumpidas} from '@/core/sync/cola';

import {abrirBaseMemoria} from '../baseMemoria';

const error = (codigo: CodigoError, estado?: number) =>
  new ErrorApi({
    codigo,
    mensaje: `falla ${codigo}`,
    estado,
    requestId: 'req-1',
  });

const entrega = (guia: number, cambios: Partial<NuevaOperacion> = {}) => ({
  usuarioId: 1,
  tipo: 'entrega',
  claveEntidad: `guia:10:${guia}`,
  tenantDespachoId: 10,
  cuerpo: {codigo_guia: guia},
  ...cambios,
});

let reloj = 1_000_000;
const encolarEn = (nueva: NuevaOperacion) =>
  escribir(tx => encolar(tx, nueva, reloj++));

const leerOperacion = async (id: string) => {
  const [fila] = await leer(db =>
    db.select().from(operaciones).where(eq(operaciones.idOperacion, id)),
  );
  return fila!;
};

/** Motor con reloj fijo, sin variación en la espera y usuario 1 con sesión. */
const motorCon = (
  enviadores: Record<string, Enviador>,
  usuario: () => number | null = () => 1,
) =>
  crearMotor({
    enviadores,
    usuarioActual: usuario,
    ahora: () => reloj,
    aleatorio: () => 0.5,
  });

describe('cola de operaciones y motor de sincronización', () => {
  beforeEach(async () => {
    reloj = 1_000_000;
    await abrirBaseMemoria();
  });

  it('con señal envía al instante con su id_operacion y la confirma', async () => {
    const enviar = jest.fn<Promise<void>, Parameters<Enviador>>(async () => {});
    const id = await encolarEn(entrega(1));

    await motorCon({entrega: enviar}).ejecutar();

    expect(enviar).toHaveBeenCalledWith({
      idOperacion: id,
      cuerpo: {codigo_guia: 1},
    });
    expect(await leerOperacion(id)).toMatchObject({
      estado: 'confirmada',
      confirmadaEn: reloj,
    });
  });

  it('sin señal queda pendiente y espera antes de reintentar', async () => {
    const enviar = jest.fn<Promise<void>, []>(async () => {
      throw error('SIN_CONEXION');
    });
    const id = await encolarEn(entrega(1));
    const motor = motorCon({entrega: enviar});

    await motor.ejecutar();
    expect(await leerOperacion(id)).toMatchObject({
      estado: 'pendiente',
      intentos: 1,
      proximoIntento: reloj + 5_000,
      codigoError: 'SIN_CONEXION',
    });

    // Un disparador antes de que pase la espera no la envía.
    await motor.ejecutar();
    expect(enviar).toHaveBeenCalledTimes(1);

    // Salir del túnel (la red volvió) ignora la espera.
    enviar.mockImplementation(async () => {});
    await motor.ejecutar({ignorarEspera: true});
    expect(await leerOperacion(id)).toMatchObject({estado: 'confirmada'});
  });

  it('un error de red corta la ejecución: no insiste con las demás', async () => {
    const enviar = jest.fn<Promise<void>, []>(async () => {
      throw error('TIEMPO_AGOTADO');
    });
    await encolarEn(entrega(1));
    await encolarEn(entrega(2));

    await motorCon({entrega: enviar}).ejecutar();

    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('si se pierde la respuesta, el reenvío usa el mismo id y Fluor no duplica', async () => {
    // Fluor simulado: guarda por id_operacion y responde igual si se repite.
    const registradas = new Set<string>();
    let perderRespuesta = true;
    const enviar: Enviador = async ({idOperacion}) => {
      registradas.add(idOperacion);
      if (perderRespuesta) {
        perderRespuesta = false;
        throw error('TIEMPO_AGOTADO');
      }
    };
    const id = await encolarEn(entrega(1));
    const motor = motorCon({entrega: enviar});

    await motor.ejecutar();
    await motor.ejecutar({ignorarEspera: true});

    expect([...registradas]).toEqual([id]);
    expect(await leerOperacion(id)).toMatchObject({estado: 'confirmada'});
  });

  it('lo que quedó enviando al cerrarse la app vuelve a la cola', async () => {
    const id = await encolarEn(entrega(1));
    await escribir(tx =>
      tx
        .update(operaciones)
        .set({estado: 'enviando'})
        .where(eq(operaciones.idOperacion, id)),
    );

    await escribir(recuperarInterrumpidas);

    expect(await leerOperacion(id)).toMatchObject({estado: 'pendiente'});
  });

  it('las operaciones de una misma guía salen en orden', async () => {
    const enviados: string[] = [];
    const novedad = await encolarEn(
      entrega(1, {tipo: 'novedad', cuerpo: {tipo: 'novedad'}}),
    );
    await encolarEn(entrega(1));
    const enviar =
      (tipo: string): Enviador =>
      async () => {
        enviados.push(tipo);
        if (tipo === 'novedad') throw error('SERVIDOR', 503);
      };

    const motor = motorCon({
      novedad: enviar('novedad'),
      entrega: enviar('entrega'),
    });
    await motor.ejecutar();
    // La entrega no se adelanta a la novedad que falló.
    expect(enviados).toEqual(['novedad']);

    reloj += 10_000;
    await escribir(tx =>
      tx
        .update(operaciones)
        .set({estado: 'confirmada'})
        .where(eq(operaciones.idOperacion, novedad)),
    );
    await motor.ejecutar();
    expect(enviados).toEqual(['novedad', 'entrega']);
  });

  it('una rechazada frena su guía pero no las demás', async () => {
    const rechazada = await encolarEn(entrega(1));
    const misma = await encolarEn(entrega(1, {tipo: 'novedad'}));
    const otra = await encolarEn(entrega(2));
    const enviar: Enviador = async ({cuerpo}) => {
      if ((cuerpo as {codigo_guia: number}).codigo_guia === 1) {
        throw error('VALIDACION', 422);
      }
    };

    await motorCon({entrega: enviar, novedad: enviar}).ejecutar();

    expect(await leerOperacion(rechazada)).toMatchObject({
      estado: 'rechazada',
      codigoError: 'VALIDACION',
      requestId: 'req-1',
    });
    expect(await leerOperacion(misma)).toMatchObject({estado: 'pendiente'});
    expect(await leerOperacion(otra)).toMatchObject({estado: 'confirmada'});
  });

  it('un 409 queda en conflicto para que decida el conductor', async () => {
    const id = await encolarEn(entrega(1));

    await motorCon({
      entrega: async () => {
        throw error('CONFLICTO', 409);
      },
    }).ejecutar();

    expect(await leerOperacion(id)).toMatchObject({estado: 'conflicto'});
  });

  it('una foto no sale antes que su entrega, y descartar la entrega borra la foto', async () => {
    const idEntrega = await encolarEn(entrega(1));
    const idFoto = await encolarEn(
      entrega(1, {
        tipo: 'archivo',
        claveEntidad: 'archivo:1',
        dependeDe: idEntrega,
      }),
    );
    const fotos = jest.fn(async () => {});

    await motorCon({
      entrega: async () => {
        throw error('NO_ENCONTRADO', 404);
      },
      archivo: fotos,
    }).ejecutar();

    expect(fotos).not.toHaveBeenCalled();
    expect(await escribir(tx => descartar(tx, idEntrega))).toEqual({
      ids: [idEntrega, idFoto],
      rutas: [],
    });
    expect(await leer(db => db.select().from(operaciones))).toHaveLength(0);
  });

  it('reintentar una rechazada la devuelve a la cola', async () => {
    const id = await encolarEn(entrega(1));
    const enviar = jest.fn<Promise<void>, []>(async () => {
      throw error('PETICION_INVALIDA', 400);
    });
    const motor = motorCon({entrega: enviar});
    await motor.ejecutar();

    await escribir(tx => reintentar(tx, id, reloj));
    enviar.mockImplementation(async () => {});
    await motor.ejecutar();

    expect(await leerOperacion(id)).toMatchObject({estado: 'confirmada'});
  });

  it('si la sesión no sirve pausa la cola del usuario y la reanuda al volver a entrar', async () => {
    const primera = await encolarEn(entrega(1));
    const segunda = await encolarEn(entrega(2));
    const enviar = jest.fn<Promise<void>, []>(async () => {
      throw error('NO_AUTENTICADO', 401);
    });
    const motor = motorCon({entrega: enviar});

    await motor.ejecutar();
    expect(await leerOperacion(primera)).toMatchObject({estado: 'pausada'});
    expect(await leerOperacion(segunda)).toMatchObject({estado: 'pausada'});
    expect(enviar).toHaveBeenCalledTimes(1);

    await escribir(tx => reanudarUsuario(tx, 1, reloj));
    enviar.mockImplementation(async () => {});
    await motor.ejecutar();
    expect(await leerOperacion(segunda)).toMatchObject({estado: 'confirmada'});
  });

  it('nunca envía la cola de otro usuario', async () => {
    await encolarEn(entrega(1, {usuarioId: 2}));
    const enviar = jest.fn(async () => {});

    await motorCon({entrega: enviar}, () => 1).ejecutar();
    await motorCon({entrega: enviar}, () => null).ejecutar();

    expect(enviar).not.toHaveBeenCalled();
  });

  it('un tipo que la app aún no sabe enviar espera en la cola', async () => {
    const id = await encolarEn(entrega(1, {tipo: 'terminar'}));

    await motorCon({entrega: jest.fn()}).ejecutar();

    expect(await leerOperacion(id)).toMatchObject({
      estado: 'pendiente',
      intentos: 0,
    });
  });

  it('dos disparadores a la vez no envían dos veces la misma operación', async () => {
    let liberar = () => {};
    const enviar = jest.fn(
      () => new Promise<void>(resolver => (liberar = resolver)),
    );
    await encolarEn(entrega(1));
    const motor = motorCon({entrega: enviar});

    const a = motor.ejecutar();
    const b = motor.ejecutar({ignorarEspera: true});
    await new Promise(r => setTimeout(() => r(undefined), 10));
    liberar();
    await Promise.all([a, b]);

    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('el resumen cuenta lo que falta por enviar', async () => {
    await encolarEn(entrega(1));
    await encolarEn(entrega(2));
    await motorCon({
      entrega: async ({cuerpo}) => {
        if ((cuerpo as {codigo_guia: number}).codigo_guia === 2) {
          throw error('CONFLICTO', 409);
        }
      },
    }).ejecutar();

    expect(await leer(db => resumenCola(db, 1))).toEqual({conflicto: 1});
  });
});

describe('espera entre reintentos', () => {
  const sinVariacion = () => 0.5;

  it('crece hasta 15 minutos y ahí se queda', () => {
    expect(
      [1, 2, 3, 4, 5, 9].map(n => calcularEspera(n, sinVariacion)),
    ).toEqual([5_000, 15_000, 60_000, 300_000, 900_000, 900_000]);
  });

  it('varía ±20 %', () => {
    expect(calcularEspera(1, () => 0)).toBe(4_000);
    expect(calcularEspera(1, () => 1)).toBe(6_000);
  });

  it('respeta el Retry-After de Fluor si es mayor', () => {
    expect(calcularEspera(1, sinVariacion, 30)).toBe(30_000);
  });
});
