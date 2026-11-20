import {act, fireEvent, render, screen} from '@testing-library/react-native';
import {createRef} from 'react';
import {captureRef} from 'react-native-view-shot';

import {PanelFirma, type ControlFirma} from '@/ui';

import {firmar, toque} from '../helpers';

const dibujar = () => firmar(screen.getByLabelText('Espacio para firmar'));

describe('PanelFirma', () => {
  it('vacío no captura nada', async () => {
    const control = createRef<ControlFirma>();
    await render(<PanelFirma ref={control} />);

    expect(screen.getByText('Firma aquí')).toBeTruthy();
    expect(await control.current?.capturar()).toBeNull();
  });

  it('con trazos avisa y se guarda como PNG; limpiar la deja vacía', async () => {
    const control = createRef<ControlFirma>();
    const alCambiar = jest.fn();
    await render(<PanelFirma ref={control} alCambiar={alCambiar} />);

    await dibujar();

    expect(alCambiar).toHaveBeenLastCalledWith(true);
    // La línea guía sigue a la vista: está fuera de lo que se captura.
    expect(screen.getByText('Firma aquí')).toBeTruthy();
    expect(await control.current?.capturar()).toBe('file:///cache/firma.png');
    expect(captureRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({format: 'png', result: 'tmpfile'}),
    );

    await act(() => control.current?.limpiar());
    expect(alCambiar).toHaveBeenLastCalledWith(false);
    expect(screen.getByText('Firma aquí')).toBeTruthy();
  });

  it('no suelta el dedo y, si el sistema corta el toque, conserva el trazo', async () => {
    const control = createRef<ControlFirma>();
    const alCambiar = jest.fn();
    await render(<PanelFirma ref={control} alCambiar={alCambiar} />);
    const lienzo = screen.getByLabelText('Espacio para firmar');

    expect(lienzo.props.onResponderTerminationRequest()).toBe(false);

    await fireEvent(lienzo, 'responderGrant', toque(10, 10, 1));
    await fireEvent(lienzo, 'responderMove', toque(10, 80, 2));
    await fireEvent(lienzo, 'responderTerminate', toque(10, 80, 3));

    expect(alCambiar).toHaveBeenLastCalledWith(true);
    expect(await control.current?.capturar()).toBe('file:///cache/firma.png');
  });
});
