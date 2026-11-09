import {eq} from 'drizzle-orm';

import {cliente} from '@/core/api/cliente';
import {ErrorApi} from '@/core/api';
import {despachos, escribir, guias, leer, operaciones} from '@/core/db';
import {encolar} from '@/core/sync';
import type {
  Asignacion,
  DespachoGuias,
  GuiaFluor,
} from '@/features/despachos/api/despachos';
import {
  descartarEnvio,
  fusionarGuias,
  guardarAsignaciones,
  leerDespachos,
  leerEnvios,
  leerGuias,
} from '@/features/despachos/db/repositorio';
import {claveGuia} from '@/features/despachos/domain/claves';
import {
  actualizarDespachos,
  descargarDespacho,
  desvincularDespacho,
  vincularDespacho,
} from '@/features/despachos/hooks/acciones';

import {abrirBaseMemoria} from '../../baseMemoria';

const USUARIO = 1;
const DESPACHO = 10;

const asignacion = (id = DESPACHO): Asignacion => ({
  id,
  fecha: '2026-10-30T07:00:00',
  tenant_id: 7,
  tenant_nombre: 'Transportes Sur',
  codigo_despacho: 900 + id,
});

const guiaFluor = (
  codigo: number,
  cambios: Partial<GuiaFluor> = {},
): GuiaFluor => ({
  codigo_despacho_detalle: codigo * 10,
  codigo_guia: codigo,
  documento_cliente: `FAC-${codigo}`,
  nombre_remitente: 'Ferretería El Tornillo',
  nombre_destinatario: 'María Pérez',
  direccion_destinatario: 'Cra 45 # 12-30',
  telefono_destinatario: '3001234567',
  ciudad_destino: 'Medellín',
  unidades: 3,
  peso_real: 12.5,
  vr_recaudo: 0,
  vr_cobro_entrega: 18000,
  orden_ruta: codigo,
  latitud: null,
  longitud: null,
  requiere_cita: false,
  comentario: null,
  estado_entregado: false,
  estado_novedad: false,
  fecha_entrega: null,
  ...cambios,
});

const descarga = (lista: GuiaFluor[], id = DESPACHO): DespachoGuias => ({
  tenant_despacho_id: id,
  tenant_id: 7,
  tenant_nombre: 'Transportes Sur',
  codigo_despacho: 900 + id,
  numero: 12345,
  fecha_salida: '2026-10-30T07:30:00',
  total: lista.length,
  guias: lista,
});

/** Lo que haría el hook de entregar: marca la guía y encola, en la misma transacción. */
const entregarLocal = (codigo: number) =>
  escribir(async tx => {
    await tx
      .update(guias)
      .set({gestionLocal: 'entregada'})
      .where(eq(guias.codigoGuia, codigo));
    return encolar(tx, {
      usuarioId: USUARIO,
      tipo: 'entrega',
      claveEntidad: claveGuia(DESPACHO, codigo),
      tenantDespachoId: DESPACHO,
      cuerpo: {codigo_guia: codigo},
    });
  });

const rechazar = (idOperacion: string) =>
  escribir(tx =>
    tx
      .update(operaciones)
      .set({estado: 'rechazada'})
      .where(eq(operaciones.idOperacion, idOperacion)),
  );

const fusionar = (lista: GuiaFluor[]) =>
  escribir(tx => fusionarGuias(tx, USUARIO, descarga(lista)));

const guiasLocales = () => leer(db => leerGuias(db, DESPACHO));

const noEncontrado = () =>
  new ErrorApi({
    codigo: 'NO_ENCONTRADO',
    mensaje: 'Despacho no encontrado',
    estado: 404,
  });

describe('repositorio de despachos', () => {
  beforeEach(abrirBaseMemoria);

  it('guarda las guías en orden de ruta, sin orden al final', async () => {
    await fusionar([
      guiaFluor(3, {orden_ruta: null}),
      guiaFluor(2, {orden_ruta: 2}),
      guiaFluor(1, {orden_ruta: 1}),
    ]);

    expect((await guiasLocales()).map(g => g.codigoGuia)).toEqual([1, 2, 3]);
  });

  it('orden de ruta 0 es "sin orden", como lo manda Fluor', async () => {
    await fusionar([
      guiaFluor(2, {orden_ruta: 0}),
      guiaFluor(1, {orden_ruta: 5}),
    ]);

    expect(
      (await guiasLocales()).map(g => [g.codigoGuia, g.ordenRuta]),
    ).toEqual([
      [1, 5],
      [2, null],
    ]);
  });

  it('una descarga no pisa una entrega que aún no llega a Fluor', async () => {
    await fusionar([guiaFluor(1)]);
    await entregarLocal(1);

    // Fluor todavía no la tiene entregada.
    await fusionar([guiaFluor(1, {direccion_destinatario: 'Calle nueva 1'})]);

    const [guia] = await guiasLocales();
    expect(guia).toMatchObject({
      gestionLocal: 'entregada',
      estadoEntregado: false,
      direccionDestinatario: 'Calle nueva 1',
    });
  });

  it('sin operaciones pendientes, manda lo que dice Fluor', async () => {
    await fusionar([guiaFluor(1)]);
    await escribir(tx =>
      tx
        .update(guias)
        .set({gestionLocal: 'novedad'})
        .where(eq(guias.codigoGuia, 1)),
    );

    await fusionar([guiaFluor(1, {estado_novedad: true})]);

    expect((await guiasLocales())[0]).toMatchObject({
      gestionLocal: null,
      estadoNovedad: true,
    });
  });

  it('una guía que Fluor quitó se borra, salvo que tenga envíos pendientes', async () => {
    await fusionar([guiaFluor(1), guiaFluor(2), guiaFluor(3)]);
    await entregarLocal(2);

    await fusionar([guiaFluor(1)]);

    expect((await guiasLocales()).map(g => [g.codigoGuia, g.retirada])).toEqual(
      [
        [1, false],
        [2, true],
      ],
    );
  });

  it('el avance cuenta lo gestionado por Fluor y por el conductor', async () => {
    await escribir(tx => guardarAsignaciones(tx, USUARIO, [asignacion()]));
    await fusionar([
      guiaFluor(1, {estado_entregado: true}),
      guiaFluor(2),
      guiaFluor(3),
      guiaFluor(4, {estado_novedad: true}),
    ]);
    await entregarLocal(2);

    const [despacho] = await leer(db => leerDespachos(db, USUARIO));

    expect(despacho).toMatchObject({
      totalGuias: 4,
      gestionadas: 3,
      novedades: 1,
      porEnviar: 1,
      numero: 12345,
    });
  });

  it('un despacho que ya no viene en la lista se borra, o queda liberado si tiene pendientes', async () => {
    await escribir(tx =>
      guardarAsignaciones(tx, USUARIO, [asignacion(10), asignacion(11)]),
    );
    await fusionar([guiaFluor(1)]);
    await entregarLocal(1);

    await escribir(tx => guardarAsignaciones(tx, USUARIO, []));

    const locales = await leer(db => leerDespachos(db, USUARIO));
    expect(locales.map(d => [d.tenantDespachoId, d.liberado])).toEqual([
      [10, true],
    ]);
  });

  it('cada guía sabe si lo que hizo el conductor ya llegó', async () => {
    await fusionar([guiaFluor(1), guiaFluor(2), guiaFluor(3)]);
    await entregarLocal(2);
    const id = await entregarLocal(3);
    await escribir(tx =>
      tx
        .update(operaciones)
        .set({estado: 'rechazada'})
        .where(eq(operaciones.idOperacion, id)),
    );

    expect((await guiasLocales()).map(g => g.envio)).toEqual([
      null,
      'porEnviar',
      'conProblema',
    ]);
  });

  it('la cola visible trae la guía y el despacho de cada operación', async () => {
    await escribir(tx => guardarAsignaciones(tx, USUARIO, [asignacion()]));
    await fusionar([guiaFluor(1)]);
    await entregarLocal(1);

    const [envio] = await leer(db => leerEnvios(db, USUARIO));
    expect(envio).toMatchObject({
      tipo: 'entrega',
      codigoGuia: 1,
      nombreDestinatario: 'María Pérez',
      codigoDespacho: 910,
    });
  });

  it('descartar devuelve la guía a lo que dice Fluor', async () => {
    await fusionar([guiaFluor(1)]);
    const id = await entregarLocal(1);
    await rechazar(id);

    await escribir(tx => descartarEnvio(tx, id));

    expect((await guiasLocales())[0]).toMatchObject({
      gestionLocal: null,
      envio: null,
    });
  });

  it('descartar lo último de un despacho liberado lo borra del teléfono', async () => {
    await escribir(tx => guardarAsignaciones(tx, USUARIO, [asignacion()]));
    await fusionar([guiaFluor(1)]);
    const id = await entregarLocal(1);
    await escribir(tx => guardarAsignaciones(tx, USUARIO, []));
    await rechazar(id);

    await escribir(tx => descartarEnvio(tx, id));

    expect(await leer(db => leerDespachos(db, USUARIO))).toEqual([]);
  });

  it('solo se descarta lo rechazado', async () => {
    await fusionar([guiaFluor(1)]);
    const id = await entregarLocal(1);

    expect(await escribir(tx => descartarEnvio(tx, id))).toEqual({
      ids: [],
      rutas: [],
    });
    expect((await guiasLocales())[0]?.gestionLocal).toBe('entregada');
  });

  it('los despachos de otro usuario del teléfono no se mezclan', async () => {
    await escribir(tx => guardarAsignaciones(tx, 2, [asignacion(20)]));
    await escribir(tx => guardarAsignaciones(tx, USUARIO, []));

    expect(await leer(db => leerDespachos(db, USUARIO))).toEqual([]);
    expect(await leer(db => leerDespachos(db, 2))).toHaveLength(1);
  });
});

describe('casos de uso de despachos', () => {
  const get = jest.spyOn(cliente, 'get');
  const post = jest.spyOn(cliente, 'post');
  const borrar = jest.spyOn(cliente, 'delete');

  /** Fluor simulado: responde según la ruta. */
  const responderGet = (rutas: Record<string, () => unknown>) =>
    get.mockImplementation(async (url: string) => {
      const respuesta = rutas[url];
      if (!respuesta) throw new Error(`Ruta no simulada: ${url}`);
      return {data: respuesta()};
    });

  beforeEach(async () => {
    get.mockReset();
    post.mockReset();
    borrar.mockReset();
    await abrirBaseMemoria();
  });

  it('vincular guarda el despacho y baja sus guías', async () => {
    post.mockResolvedValue({data: asignacion()});
    responderGet({
      '/tte/movil/guias': () => descarga([guiaFluor(1), guiaFluor(2)]),
    });

    await vincularDespacho(USUARIO, {
      tenantId: 7,
      codigoDespacho: 910,
      token: 'A1B2',
    });

    expect(post).toHaveBeenCalledWith('/mas/tenant-despacho/cargar', {
      tenant_id: 7,
      codigo_despacho: 910,
      token_despacho: 'A1B2',
    });
    expect(get).toHaveBeenCalledWith('/tte/movil/guias', {
      headers: {'X-Tenant-Despacho-ID': String(DESPACHO)},
    });
    const [despacho] = await leer(db => leerDespachos(db, USUARIO));
    expect(despacho).toMatchObject({tenantDespachoId: DESPACHO, totalGuias: 2});
  });

  it('si la descarga falla por red, el despacho queda vinculado sin guías', async () => {
    post.mockResolvedValue({data: asignacion()});
    get.mockRejectedValue(
      new ErrorApi({codigo: 'SIN_CONEXION', mensaje: 'sin red'}),
    );

    await vincularDespacho(USUARIO, {
      tenantId: 7,
      codigoDespacho: 910,
      token: 'A1B2',
    });

    const [despacho] = await leer(db => leerDespachos(db, USUARIO));
    expect(despacho).toMatchObject({descargadoEn: null, totalGuias: 0});
  });

  it('actualizar trae la lista y baja solo los despachos nunca descargados', async () => {
    responderGet({
      '/mas/tenant-despacho/lista': () => ({
        total: 1,
        page: 1,
        size: 100,
        items: [asignacion()],
      }),
      '/tte/movil/guias': () => descarga([guiaFluor(1)]),
    });

    await actualizarDespachos(USUARIO);
    await actualizarDespachos(USUARIO);

    const descargas = get.mock.calls.filter(([url]) => url.includes('/guias'));
    expect(descargas).toHaveLength(1);
  });

  it('si Fluor ya no lo asigna (404), el despacho sin pendientes se borra', async () => {
    await escribir(tx => guardarAsignaciones(tx, USUARIO, [asignacion()]));
    get.mockRejectedValue(noEncontrado());

    expect(await descargarDespacho(USUARIO, DESPACHO)).toBe('borrado');
    expect(await leer(db => db.select().from(despachos))).toEqual([]);
  });

  it('no deja desvincular con envíos pendientes', async () => {
    await escribir(tx => guardarAsignaciones(tx, USUARIO, [asignacion()]));
    await fusionar([guiaFluor(1)]);
    await entregarLocal(1);

    await expect(desvincularDespacho(DESPACHO)).rejects.toThrow(
      'Tienes 1 envío pendiente de este despacho. Envíalos antes de desvincularlo.',
    );
    expect(borrar).not.toHaveBeenCalled();
  });

  it('desvincular libera en Fluor y borra lo local', async () => {
    await escribir(tx => guardarAsignaciones(tx, USUARIO, [asignacion()]));
    await fusionar([guiaFluor(1)]);
    borrar.mockResolvedValue({data: {detail: 'ok'}});

    await desvincularDespacho(DESPACHO);

    expect(borrar).toHaveBeenCalledWith(
      `/mas/tenant-despacho/eliminar/${DESPACHO}`,
    );
    expect(await leer(db => db.select().from(guias))).toEqual([]);
  });
});
