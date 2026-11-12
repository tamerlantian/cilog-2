import {conectarSesionConApi, conectarSesionConRastreo} from '@/core/sesion';

import {Navegador} from './navegacion/Navegador';
import {AppProviders} from './providers/AppProviders';

// Antes de montar nada, para que ninguna petición salga sin token ni manejo de 401.
conectarSesionConApi();
// Retoma el rastreo si quedó corriendo con la app cerrada.
conectarSesionConRastreo();

export function App() {
  return (
    <AppProviders>
      <Navegador />
    </AppProviders>
  );
}
