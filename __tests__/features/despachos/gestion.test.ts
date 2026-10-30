import {eq} from 'drizzle-orm';

import {despachos, escribir, leer, operaciones} from '@/core/db';
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

  it('los campos vacíos viajan como null', () => {
    expect(
      cuerpoEntrega(
        {codigoGuia: 1, codigoDespacho: 910},
        {recibe: '  ', parentesco: ''},
        '2026-10-30T14:05:09',
      ),
    ).toEqual({
      codigo_guia_pk: 1,
      codigo_despacho_fk: 910,
      recibe: null,
      numero_identificacion: null,
      parentesco: null,
      celular: null,
      fecha_entrega: '2026-10-30T14:05:09',
    });
  });

  it('la fecha va en hora del teléfono, sin zona', () => {
    expect(fechaLocalIso(AHORA)).toBe('2026-10-30T14:05:09');
  });
});

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
});
