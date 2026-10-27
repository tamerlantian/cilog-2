import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import type {ReactNode} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {traducirError} from '@/core/api/errores';
import {ContenedorMensajes} from '@/ui';

const clienteConsultas = new QueryClient({
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

export function AppProviders({children}: {children: ReactNode}) {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={clienteConsultas}>
        {children}
        <ContenedorMensajes />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
