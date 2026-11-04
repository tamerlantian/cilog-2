import {enlaceLlamar, enlaceMapa} from '@/features/despachos/domain/contacto';
import {estadoBarra} from '@/features/despachos/domain/envios';
import {fechaCorta, numero, pesos} from '@/features/despachos/domain/formato';
import {aCobrar} from '@/features/despachos/domain/gestion';
import {
  contarGuias,
  filtrarGuias,
  resumenGuias,
  siguientePendiente,
  situacionGuia,
  type DatosGuia,
} from '@/features/despachos/domain/guias';

const guia = (codigo: number, cambios: Partial<DatosGuia> = {}): DatosGuia => ({
  codigoGuia: codigo,
  documentoCliente: null,
  nombreDestinatario: null,
  direccionDestinatario: null,
  ciudadDestino: null,
  estadoEntregado: false,
  estadoNovedad: false,
  gestionLocal: null,
  ...cambios,
});

describe('guías', () => {
  it('lo que hizo el conductor manda sobre la última descarga', () => {
    expect(situacionGuia(guia(1, {gestionLocal: 'novedad'}))).toBe('novedad');
    expect(
      situacionGuia(guia(1, {estadoNovedad: true, gestionLocal: 'entregada'})),
    ).toBe('entregada');
    expect(situacionGuia(guia(1, {estadoEntregado: true}))).toBe('entregada');
  });

  it('busca por número de guía, documento y dirección', () => {
    const lista = [
      guia(777001, {documentoCliente: 'FAC-99'}),
      guia(2, {direccionDestinatario: 'Cra 45 # 12-30'}),
    ];
    expect(filtrarGuias(lista, 'todas', '7770').map(g => g.codigoGuia)).toEqual(
      [777001],
    );
    expect(filtrarGuias(lista, 'todas', 'fac-99')).toHaveLength(1);
    expect(filtrarGuias(lista, 'todas', ' cra 45 ')).toHaveLength(1);
  });

  it('cuenta pendientes y gestionadas', () => {
    expect(
      contarGuias([
        guia(1),
        guia(2, {estadoEntregado: true}),
        guia(3, {gestionLocal: 'novedad'}),
      ]),
    ).toEqual({pendientes: 1, gestionadas: 2, todas: 3});
  });
});

describe('después de gestionar', () => {
  const lista = [
    guia(1, {estadoEntregado: true}),
    guia(2),
    guia(3, {gestionLocal: 'novedad'}),
    guia(4),
  ];

  it('resume entregadas, novedades y pendientes', () => {
    expect(resumenGuias(lista)).toEqual({
      entregadas: 1,
      novedades: 1,
      pendientes: 2,
    });
  });

  it('la siguiente es la próxima pendiente en el orden de la lista', () => {
    expect(siguientePendiente(lista, 2)?.codigoGuia).toBe(4);
    expect(siguientePendiente(lista, 4)?.codigoGuia).toBe(2);
    expect(siguientePendiente([guia(2)], 2)).toBeUndefined();
  });

  it('se cobra el recaudo más el flete contra entrega', () => {
    expect(aCobrar({vrRecaudo: 18000, vrCobroEntrega: 5000})).toBe(23000);
  });
});

describe('barra de envíos', () => {
  it('se oculta sin nada en la cola', () => {
    expect(estadoBarra({}, false)).toEqual({tipo: 'oculta'});
  });

  it('lo que pide acción va antes que lo que solo espera', () => {
    expect(estadoBarra({pendiente: 2, rechazada: 1}, true)).toEqual({
      tipo: 'problemas',
      problemas: 1,
      total: 3,
    });
    expect(estadoBarra({pendiente: 2, pausada: 1}, false).tipo).toBe('pausada');
    expect(estadoBarra({pendiente: 2, enviando: 1}, false).tipo).toBe(
      'enviando',
    );
  });

  it('distingue sin conexión solo para lo que espera', () => {
    expect(estadoBarra({pendiente: 3}, true)).toEqual({
      tipo: 'porEnviar',
      total: 3,
      sinConexion: true,
    });
  });
});

describe('contacto', () => {
  it('limpia el teléfono y descarta los que no sirven', () => {
    expect(enlaceLlamar('(300) 123-4567')).toBe('tel:3001234567');
    expect(enlaceLlamar('+57 300 123 4567')).toBe('tel:+573001234567');
    expect(enlaceLlamar('123')).toBeNull();
    expect(enlaceLlamar(null)).toBeNull();
  });

  it('el mapa prefiere coordenadas y si no busca la dirección', () => {
    const base = {
      latitud: null,
      longitud: null,
      direccionDestinatario: 'Cra 45 # 12-30',
      ciudadDestino: 'Medellín',
    };
    expect(enlaceMapa({...base, latitud: 6.25, longitud: -75.56})).toBe(
      'https://www.google.com/maps/search/?api=1&query=6.25%2C-75.56',
    );
    expect(enlaceMapa(base)).toBe(
      'https://www.google.com/maps/search/?api=1&query=Cra%2045%20%23%2012-30%2C%20Medell%C3%ADn',
    );
    expect(
      enlaceMapa({...base, direccionDestinatario: null, ciudadDestino: null}),
    ).toBeNull();
  });
});

describe('formato', () => {
  it('pesos colombianos sin decimales', () => {
    expect(pesos(18000)).toBe('$ 18.000');
    expect(pesos(1234567.6)).toBe('$ 1.234.568');
    expect(pesos(0)).toBe('$ 0');
  });

  it('números con coma decimal', () => {
    expect(numero(12.5)).toBe('12,5');
    expect(numero(3)).toBe('3');
  });

  it('fecha corta desde el ISO de Fluor, sin correr por zona horaria', () => {
    expect(fechaCorta('2026-10-30T23:30:00')).toBe('30 oct');
    expect(fechaCorta(null)).toBeNull();
  });
});
