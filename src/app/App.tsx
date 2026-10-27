import {PantallaBase} from './PantallaBase';
import {AppProviders} from './providers/AppProviders';

export function App() {
  return (
    <AppProviders>
      <PantallaBase />
    </AppProviders>
  );
}
