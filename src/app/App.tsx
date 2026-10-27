import {Navegador} from './navegacion/Navegador';
import {AppProviders} from './providers/AppProviders';

export function App() {
  return (
    <AppProviders>
      <Navegador />
    </AppProviders>
  );
}
