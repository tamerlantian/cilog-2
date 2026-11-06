import {eq} from 'drizzle-orm';

import * as fs from '@dr.pogodin/react-native-fs';

import {archivos, despachos, escribir, leer, operaciones} from '@/core/db';
import {crearMotor, type Enviador} from '@/core/sync';
import {purgarConfirmadas} from '@/core/sync/cola';
import type {
  DespachoGuias,
  GuiaFluor,
} from '@/features/despachos/api/despachos';
import {
  registrarEntrega,
  registrarNovedad,
  registrarTerminar,
} from '@/features/despachos/db/gestion';
import {
  descartarEnvio,
  fusionarGuias,
  leerDespacho,
  leerGuias,
} from '@/features/despachos/db/repositorio';
import {fechaLocalIso} from '@/features/despachos/domain/formato';
import {
  CONFIGURACION_ENTREGA_PROVISIONAL,
  cuerpoEntrega,
  evidenciaFaltante,
  puedeEntregar,
  puedeTerminar,
} from '@/features/despachos/domain/gestion';

import {abrirBaseMemoria} from '../../baseMemoria';

const USUARIO = 1;
const DESPACHO = 10;
const AHORA = new Date(2026, 9, 30, 14, 5, 9).getTime();
const CONFIG = CONFIGURACION_ENTREGA_PROVISIONAL;

const guiaFluor = (
  codigo: number,
  cambios: Partial<GuiaFluor> = {},
): GuiaFluor => ({
  codigo_despacho_detalle: codigo,
  codigo_guia: codigo,
  documento_cliente: null,
  nombre_remitente: null,
  nombre_destinatario: null,
  direccion_destinatario: null,
  telefono_destinatario: null,
  ciudad_destino: null,
  unidades: 1,
  peso_real: 1,
  vr_recaudo: 0,
  vr_cobro_entrega: 0,
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

const descarga = (lista: GuiaFluor[]): DespachoGuias => ({
  tenant_despacho_id: DESPACHO,
  tenant_id: 7,
  tenant_nombre: 'Transportes Sur',
  codigo_despacho: 910,
  numero: null,
  fecha_salida: null,
  total: lista.length,
  guias: lista,
});

const conGuias = (lista: GuiaFluor[]) =>
  escribir(tx => fusionarGuias(tx, USUARIO, descarga(lista)));

const gestion = (codigoGuia: number) => ({
  usuarioId: USUARIO,
  tenantDespachoId: DESPACHO,
  codigoGuia,
  ahora: AHORA,
});

const entregar = (codigoGuia: number) =>
  escribir(tx => registrarEntrega(tx, gestion(codigoGuia), {}, CONFIG));

const confirmarTodo = () =>
  escribir(tx => tx.update(operaciones).set({estado: 'confirmada'}));

const sinGestion = {
  documentoCliente: null,
  nombreDestinatario: null,
  direccionDestinatario: null,
  ciudadDestino: null,
  estadoEntregado: false,
  estadoNovedad: false,
  gestionLocal: null,
  retirada: false,
};
const abierto = {liberado: false, terminadoEn: null};

describe('reglas de gestión', () => {
  it('no deja entregar dos veces, ni guías retiradas o de despachos cerrados', () => {
    const guia = {...sinGestion, codigoGuia: 1};
    expect(puedeEntregar(abierto, guia, CONFIG).permitido).toBe(true);
    expect(
      puedeEntregar(abierto, {...guia, gestionLocal: 'entregada'}, CONFIG),
    ).toEqual({permitido: false, motivo: 'La guía ya está entregada.'});
    expect(
      puedeEntregar(abierto, {...guia, retirada: true}, CONFIG).permitido,
    ).toBe(false);
    expect(
      puedeEntregar({...abierto, liberado: true}, guia, CONFIG).permitido,
    ).toBe(false);
    expect(
      puedeEntregar({...abierto, terminadoEn: 1}, guia, CONFIG).permitido,
    ).toBe(false);
  });

  it('entregar con novedad depende de la configuración de la empresa', () => {
    const guia = {...sinGestion, codigoGuia: 1, estadoNovedad: true};
    expect(puedeEntregar(abierto, guia, CONFIG).permitido).toBe(false);
    expect(
      puedeEntregar(abierto, guia, {...CONFIG, entregaConNovedad: true})
        .permitido,
    ).toBe(true);
  });

  it('terminar pide todo gestionado y enviado; las retiradas no cuentan', () => {
    const pendiente = {...sinGestion, codigoGuia: 1};
    const entregada = {...sinGestion, codigoGuia: 2, estadoEntregado: true};
    const conteo = {...abierto, porEnviar: 0};

    expect(puedeTerminar(conteo, [pendiente, entregada])).toEqual({
      permitido: false,
      motivo: 'Queda 1 guía pendiente.',
    });
    expect(
      puedeTerminar(conteo, [{...pendiente, retirada: true}, entregada])
        .permitido,
    ).toBe(true);
    expect(puedeTerminar({...conteo, porEnviar: 1}, [entregada])).toEqual({
      permitido: false,
      motivo: 'Tienes 1 envío sin confirmar. Envíalos antes de terminar.',
    });
    expect(puedeTerminar(conteo, []).permitido).toBe(false);
  });

  it('la entrega usa los campos de Fluor y los vacíos viajan como null', () => {
    expect(
      cuerpoEntrega(
        1,
        {recibe: ' Ana Gómez ', parentesco: 'PORTERÍA', celular: ''},
        '2026-10-30T14:05:09',
      ),
    ).toEqual({
      guia: 1,
      fecha_entrega: '2026-10-30T14:05:09',
      recibe: 'Ana Gómez',
      recibe_parentesco: 'PORTERÍA',
      recibe_numero_identificacion: null,
      recibe_celular: null,
      latitud: null,
      longitud: null,
    });
  });

  it('la fecha va en hora del teléfono, sin zona', () => {
    expect(fechaLocalIso(AHORA)).toBe('2026-10-30T14:05:09');
  });
});

describe('evidencias exigidas', () => {
  it('pide foto o firma solo si la empresa las exige', () => {
    const exige = {...CONFIG, exigeFoto: true, exigeFirma: true};
    expect(evidenciaFaltante(CONFIG, {fotos: 0, firma: false})).toBeNull();
    expect(evidenciaFaltante(exige, {fotos: 0, firma: true})).toBe(
      'La empresa exige al menos una foto de la entrega.',
    );
    expect(evidenciaFaltante(exige, {fotos: 1, firma: false})).toBe(
      'La empresa exige la firma de quien recibe.',
    );
    expect(evidenciaFaltante(exige, {fotos: 1, firma: true})).toBeNull();
  });
});

/** El mock de react-native-fs guarda ruta -> tamaño. */
const enDisco = (fs as unknown as {__archivos: Map<string, number>}).__archivos;

describe('registrar gestiones', () => {
  beforeEach(abrirBaseMemoria);

  it('la entrega marca la guía y encola con la hora del teléfono', async () => {
    await conGuias([guiaFluor(1)]);

    const id = await entregar(1);

    const [guia] = await leer(db => leerGuias(db, DESPACHO));
    expect(guia).toMatchObject({gestionLocal: 'entregada', envio: 'porEnviar'});
    const [operacion] = await leer(db =>
      db.select().from(operaciones).where(eq(operaciones.idOperacion, id)),
    );
    expect(JSON.parse(operacion!.cuerpo).fecha_entrega).toBe(
      '2026-10-30T14:05:09',
    );
  });

  it('una segunda entrega de la misma guía se rechaza sin encolar nada', async () => {
    await conGuias([guiaFluor(1)]);
    await entregar(1);

    await expect(entregar(1)).rejects.toThrow('La guía ya está entregada.');
    expect(await leer(db => db.select().from(operaciones))).toHaveLength(1);
  });

  it('novedad y luego entrega quedan en la cola en ese orden', async () => {
    await conGuias([guiaFluor(1)]);
    await escribir(tx => registrarNovedad(tx, gestion(1), {tipo: 'AUSENTE'}));
    await escribir(tx =>
      registrarEntrega(
        tx,
        gestion(1),
        {},
        {...CONFIG, entregaConNovedad: true},
      ),
    );

    const cola = await leer(db => db.select().from(operaciones));
    expect(cola.map(o => o.tipo)).toEqual(['novedad', 'entrega']);
  });

  it('terminar marca el despacho y descartarlo lo reabre', async () => {
    await conGuias([guiaFluor(1)]);
    await entregar(1);
    await expect(
      escribir(tx => registrarTerminar(tx, gestion(1))),
    ).rejects.toThrow('Tienes 1 envío sin confirmar');

    await confirmarTodo();
    const id = await escribir(tx => registrarTerminar(tx, gestion(1)));
    expect((await leer(db => leerDespacho(db, DESPACHO)))?.terminadoEn).toBe(
      AHORA,
    );

    await escribir(tx =>
      tx
        .update(operaciones)
        .set({estado: 'rechazada'})
        .where(eq(operaciones.idOperacion, id)),
    );
    await escribir(tx => descartarEnvio(tx, id));
    const [despacho] = await leer(db => db.select().from(despachos));
    expect(despacho?.terminadoEn).toBeNull();
  });

  const conEvidencias = async () => {
    await conGuias([guiaFluor(1)]);
    enDisco.set('/documentos/evidencias/a.jpg', 210_000);
    enDisco.set('/documentos/evidencias/b.png', 15_000);
    return escribir(tx =>
      registrarEntrega(
        tx,
        {...gestion(1), ubicacion: {latitud: 6.25, longitud: -75.56}},
        {},
        CONFIG,
        [
          {tipo: 'foto', ruta: '/documentos/evidencias/a.jpg', bytes: 210_000},
          {tipo: 'firma', ruta: '/documentos/evidencias/b.png', bytes: 15_000},
        ],
      ),
    );
  };

  it('la entrega lleva sus fotos y su firma en la misma operación', async () => {
    const idEntrega = await conEvidencias();

    const cola = await leer(db => db.select().from(operaciones));
    expect(cola.map(o => [o.tipo, o.versionCuerpo])).toEqual([['entrega', 2]]);
    expect(JSON.parse(cola[0]!.cuerpo)).toMatchObject({
      guia: 1,
      latitud: 6.25,
      longitud: -75.56,
    });
    expect(
      (await leer(db => db.select().from(archivos))).map(a => [
        a.idOperacion,
        a.tipo,
      ]),
    ).toEqual([
      [idEntrega, 'I'],
      [idEntrega, 'F'],
    ]);
  });

  it('sin la foto que la empresa exige no se guarda nada', async () => {
    await conGuias([guiaFluor(1)]);

    await expect(
      escribir(tx =>
        registrarEntrega(tx, gestion(1), {}, {...CONFIG, exigeFoto: true}),
      ),
    ).rejects.toThrow('La empresa exige al menos una foto de la entrega.');
    expect(await leer(db => db.select().from(operaciones))).toEqual([]);
  });

  it('al confirmarse la entrega sus fotos se borran del teléfono', async () => {
    await conEvidencias();
    const enviar = jest.fn<ReturnType<Enviador>, Parameters<Enviador>>(
      async () => {},
    );

    await crearMotor({
      enviadores: {entrega: enviar},
      usuarioActual: () => USUARIO,
    }).ejecutar();

    expect(enviar.mock.calls[0]?.[0].archivos).toEqual([
      {ruta: '/documentos/evidencias/a.jpg', tipo: 'I', bytes: 210_000},
      {ruta: '/documentos/evidencias/b.png', tipo: 'F', bytes: 15_000},
    ]);
    expect(enDisco.has('/documentos/evidencias/a.jpg')).toBe(false);
    expect(enDisco.has('/documentos/evidencias/b.png')).toBe(false);
    expect(await leer(db => db.select().from(archivos))).toEqual([]);
  });

  it('si Fluor no guardó algún archivo, se conservan hasta la purga', async () => {
    const idEntrega = await conEvidencias();

    await crearMotor({
      enviadores: {entrega: async () => ({conservarArchivos: true})},
      usuarioActual: () => USUARIO,
      ahora: () => AHORA,
    }).ejecutar();

    const [operacion] = await leer(db =>
      db
        .select()
        .from(operaciones)
        .where(eq(operaciones.idOperacion, idEntrega)),
    );
    expect(operacion?.estado).toBe('confirmada');
    expect(enDisco.has('/documentos/evidencias/a.jpg')).toBe(true);

    const rutas = await escribir(tx => purgarConfirmadas(tx, AHORA));
    expect(rutas.sort()).toEqual([
      '/documentos/evidencias/a.jpg',
      '/documentos/evidencias/b.png',
    ]);
    expect(await leer(db => db.select().from(archivos))).toEqual([]);
  });

  it('descartar una entrega rechazada devuelve las rutas de sus archivos', async () => {
    const idEntrega = await conEvidencias();
    await escribir(tx =>
      tx
        .update(operaciones)
        .set({estado: 'rechazada'})
        .where(eq(operaciones.idOperacion, idEntrega)),
    );

    const {ids, rutas} = await escribir(tx => descartarEnvio(tx, idEntrega));

    expect(ids).toEqual([idEntrega]);
    expect(rutas.sort()).toEqual([
      '/documentos/evidencias/a.jpg',
      '/documentos/evidencias/b.png',
    ]);
  });
});
