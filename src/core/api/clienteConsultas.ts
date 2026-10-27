import {QueryClient} from '@tanstack/react-query';

import {traducirError} from './errores';

/** Un solo QueryClient para toda la app: la sesión lo limpia al cambiar de usuario o de empresa. */
export const clienteConsultas = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // No reintentar errores que el usuario debe corregir o que no cambian al repetir.
      retry: (intentos, error) => {
        const {estado} = traducirError(error);
        const esDeCliente = estado !== null && estado >= 400 && estado < 500;
        return !esDeCliente && intentos < 2;
      },
    },
  },
});
