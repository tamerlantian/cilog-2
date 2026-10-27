import {QueryClientProvider} from '@tanstack/react-query';
import type {ReactNode} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {clienteConsultas} from '@/core/api/clienteConsultas';
import {ContenedorMensajes} from '@/ui';

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
