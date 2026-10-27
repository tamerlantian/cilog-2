import {fireEvent, render, screen} from '@testing-library/react-native';

import {Input} from '@/ui';

describe('Input', () => {
  it('muestra el error y lo anuncia como alerta', async () => {
    await render(<Input error="Campo obligatorio" etiqueta="Correo" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Campo obligatorio');
  });

  it('alterna la visibilidad de la clave', async () => {
    await render(<Input secureTextEntry etiqueta="Clave" />);
    expect(screen.getByLabelText('Clave').props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', {name: 'Mostrar clave'}));
    expect(screen.getByLabelText('Clave').props.secureTextEntry).toBe(false);
  });
});
