import {fireEvent, render, screen} from '@testing-library/react-native';

import {Boton} from '@/ui';

describe('Boton', () => {
  it('ejecuta onPress', async () => {
    const alPresionar = jest.fn();
    await render(<Boton titulo="Entregar" onPress={alPresionar} />);
    await fireEvent.press(screen.getByRole('button', {name: 'Entregar'}));
    expect(alPresionar).toHaveBeenCalledTimes(1);
  });

  it('no ejecuta onPress mientras carga', async () => {
    const alPresionar = jest.fn();
    await render(<Boton cargando titulo="Entregar" onPress={alPresionar} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(alPresionar).not.toHaveBeenCalled();
  });

  it('no ejecuta onPress si está deshabilitado', async () => {
    const alPresionar = jest.fn();
    await render(<Boton disabled titulo="Entregar" onPress={alPresionar} />);
    await fireEvent.press(screen.getByRole('button', {name: 'Entregar'}));
    expect(alPresionar).not.toHaveBeenCalled();
  });
});
