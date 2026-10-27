import {render, screen} from '@testing-library/react-native';

import {App} from '@/app/App';

describe('App', () => {
  it('arranca y muestra la pantalla base', async () => {
    await render(<App />);
    expect(screen.getByText('Plutonio')).toBeTruthy();
    expect(screen.getByText('https://api.prueba.test')).toBeTruthy();
  });
});
