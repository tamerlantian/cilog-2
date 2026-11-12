import {fireEvent, render, screen} from '@testing-library/react-native';

import {ResumenGuias} from '@/features/despachos/components/ResumenGuias';
import type {GuiaLocal} from '@/features/despachos/db/repositorio';

const guia = (codigoGuia: number, nombreDestinatario: string) =>
  ({codigoGuia, nombreDestinatario, unidades: 3}) as GuiaLocal;

describe('ResumenGuias', () => {
  it('con un solo destinatario muestra una línea, no una fila por guía', async () => {
    await render(
      <ResumenGuias
        guias={[434, 435, 436, 437, 438, 439, 440].map(c =>
          guia(c, 'DORA MARTINA PEÑALOZA'),
        )}
      />,
    );

    expect(screen.getAllByText('DORA MARTINA PEÑALOZA')).toHaveLength(1);
    expect(screen.getByText('7 guías · 21 und')).toBeTruthy();
    expect(screen.queryByRole('button', {name: /^Ver /})).toBeNull();
  });

  it('con varios destinatarios muestra las primeras y el resto en Ver más', async () => {
    await render(
      <ResumenGuias
        guias={[1, 2, 3, 4, 5].map(c => guia(c, `Cliente ${c}`))}
      />,
    );

    expect(screen.queryByText('Cliente 4')).toBeNull();
    await fireEvent.press(screen.getByRole('button', {name: 'Ver 2 más'}));
    expect(screen.getByText('Cliente 5')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', {name: 'Ver menos'}));
    expect(screen.queryByText('Cliente 4')).toBeNull();
  });
});
