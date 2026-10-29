import {conectarSesionConApi} from '@/core/sesion';

import {Navegador} from './navegacion/Navegador';
import {AppProviders} from './providers/AppProviders';

// Antes de montar nada, para que ninguna petición salga sin token ni manejo de 401.
conectarSesionConApi();

export function App() {
  return (
    <AppProviders>
      <Navegador />
    </AppProviders>
  );
}
