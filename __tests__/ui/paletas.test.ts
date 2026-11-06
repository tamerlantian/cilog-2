import {contraste, esFondoOscuro} from '@/ui/tema/color';
import {type Escena, paletas} from '@/ui/tema/paletas';

type Par = [primerPlano: keyof Escena, fondo: keyof Escena];

/** Texto e íconos que deben leerse (4.5:1). */
const PARES_TEXTO: Par[] = [
  ['texto', 'suelo'],
  ['texto', 'fondo'],
  ['texto', 'campo'],
  ['textoSecundario', 'suelo'],
  ['textoSecundario', 'fondo'],
  ['textoSecundario', 'superficie'],
  ['primario', 'suelo'],
  ['primario', 'fondo'],
  ['primario', 'primarioSuave'],
  ['sobrePrimario', 'primario'],
  ['sobreAccion', 'accion'],
  ['sobreAcento', 'acento'],
  ['sobrePrimario', 'advertencia'],
  ['sobrePrimario', 'peligro'],
  ['exito', 'suelo'],
  ['exito', 'exitoSuave'],
  ['advertencia', 'suelo'],
  ['advertencia', 'advertenciaSuave'],
  ['peligro', 'suelo'],
  ['peligro', 'peligroSuave'],
  ['info', 'suelo'],
  ['info', 'infoSuave'],
  ['sobreMarca', 'marca'],
];

/** Bordes de controles (3:1, WCAG 1.4.11). */
const PARES_CONTROL: Par[] = [['bordeCampo', 'campo']];

const casos = Object.values(paletas).flatMap(paleta =>
  (['claro', 'oscuro', 'marca'] as const).map(
    nombre => [`${paleta.nombre} · ${nombre}`, paleta[nombre]] as const,
  ),
);

describe.each(casos)('%s', (_nombre, escena) => {
  it.each(PARES_TEXTO)('%s sobre %s pasa 4.5:1', (frente, fondo) => {
    expect(contraste(escena[frente], escena[fondo])).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it.each(PARES_CONTROL)('%s sobre %s pasa 3:1', (frente, fondo) => {
    expect(contraste(escena[frente], escena[fondo])).toBeGreaterThanOrEqual(3);
  });
});

describe('esFondoOscuro', () => {
  it('distingue fondos claros de oscuros', () => {
    expect(esFondoOscuro(paletas.bosqueLima.marca.suelo)).toBe(true);
    expect(esFondoOscuro(paletas.bosqueLima.claro.suelo)).toBe(false);
  });
});
