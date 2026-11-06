import {ErrorApi} from '@/core/api';
import {cliente} from '@/core/api/cliente';
import {escribir} from '@/core/db';
import type {DespachoGuias} from '@/features/despachos/api/despachos';
import {fusionarGuias} from '@/features/despachos/db/repositorio';
import {enviarEntrega} from '@/features/despachos/sync/enviadores';

import {abrirBaseMemoria} from '../../baseMemoria';

const DESPACHO = 10;
const DATOS = {guia: 1, fecha_entrega: '2026-11-06T10:42:13', recibe: 'Ana'};

const descarga: DespachoGuias = {
  tenant_despacho_id: DESPACHO,
  tenant_id: 7,
  tenant_nombre: 'Transportes Sur',
  codigo_despacho: 910,
  numero: null,
  fecha_salida: null,
  total: 0,
  guias: [],
};

/** FormData de React Native: guarda lo que se agrega para revisarlo. */
class FormularioFalso {
  partes: [string, unknown][] = [];
  append(nombre: string, valor: unknown) {
    this.partes.push([nombre, valor]);
  }
}

const operacion = (
  archivos: Parameters<typeof enviarEntrega>[0]['archivos'] = [],
) => ({
  idOperacion: 'op-1',
  tenantDespachoId: DESPACHO,
  cuerpo: DATOS,
  archivos,
});

const conflicto = (extras: Record<string, unknown>) =>
  new ErrorApi({
    codigo: 'CONFLICTO',
    estado: 409,
    mensaje: 'La guía ya fue entregada anteriormente',
    extras,
  });

describe('enviar una entrega a Fluor', () => {
  const post = jest.spyOn(cliente, 'post');
  const global = globalThis as unknown as {FormData: unknown};
  const formDataOriginal = global.FormData;

  beforeAll(() => {
    global.FormData = FormularioFalso;
  });
  afterAll(() => {
    global.FormData = formDataOriginal;
  });
  beforeEach(async () => {
    post.mockReset();
    await abrirBaseMemoria();
    await escribir(tx => fusionarGuias(tx, 1, descarga));
  });

  it('manda datos, fotos y firma juntos, con la empresa del despacho', async () => {
    post.mockResolvedValue({
      data: {codigo_guia_pk: 1, estado_entregado: true, ficheros_con_error: 0},
    });

    const resultado = await enviarEntrega(
      operacion([
        {ruta: '/documentos/evidencias/a.jpg', tipo: 'I', bytes: 1},
        {ruta: '/documentos/evidencias/b.png', tipo: 'F', bytes: 1},
        {ruta: '/documentos/evidencias/c.jpg', tipo: 'I', bytes: 1},
      ]),
    );

    expect(resultado).toEqual({conservarArchivos: false});
    const [url, formulario, config] = post.mock.calls[0]!;
    expect(url).toBe('/tte/guia/entrega');
    expect((formulario as FormularioFalso).partes).toEqual([
      ['datos', JSON.stringify(DATOS)],
      [
        'imagenes',
        {
          uri: 'file:///documentos/evidencias/a.jpg',
          name: 'foto-1.jpg',
          type: 'image/jpeg',
        },
      ],
      [
        'imagenes',
        {
          uri: 'file:///documentos/evidencias/c.jpg',
          name: 'foto-2.jpg',
          type: 'image/jpeg',
        },
      ],
      [
        'firma',
        {
          uri: 'file:///documentos/evidencias/b.png',
          name: 'firma.png',
          type: 'image/png',
        },
      ],
    ]);
    expect(config?.headers).toMatchObject({'X-Tenant-ID': '7'});
  });

  it('si Fluor no guardó algún archivo, pide conservarlos', async () => {
    post.mockResolvedValue({
      data: {codigo_guia_pk: 1, estado_entregado: true, ficheros_con_error: 1},
    });

    expect(await enviarEntrega(operacion())).toEqual({
      conservarArchivos: true,
    });
  });

  it('un 409 con entrega true cuenta como recibida (reenvío tras perder la respuesta)', async () => {
    post.mockRejectedValue(conflicto({entrega: true}));

    expect(await enviarEntrega(operacion())).toEqual({
      conservarArchivos: true,
    });
  });

  it('otro 409 es un rechazo con el motivo de Fluor, no un conflicto', async () => {
    post.mockRejectedValue(conflicto({}));

    await expect(enviarEntrega(operacion())).rejects.toMatchObject({
      codigo: 'PETICION_INVALIDA',
      estado: 409,
      message: 'La guía ya fue entregada anteriormente',
    });
  });

  it('sin acceso a la empresa (403) el error llega tal cual', async () => {
    const sinPermiso = new ErrorApi({
      codigo: 'SIN_PERMISO',
      estado: 403,
      mensaje: 'No tienes acceso a esta empresa',
    });
    post.mockRejectedValue(sinPermiso);

    await expect(enviarEntrega(operacion())).rejects.toBe(sinPermiso);
  });
});
