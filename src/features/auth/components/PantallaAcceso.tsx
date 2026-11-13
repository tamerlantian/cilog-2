import type {ComponentProps} from 'react';

import {Pantalla} from '@/ui';

/**
 * Pantalla del flujo de acceso: va sobre blanco (`fondo`). La marca navy queda
 * solo en la portada del login (`PortadaLogin`).
 */
export function PantallaAcceso(props: ComponentProps<typeof Pantalla>) {
  return <Pantalla fondo="fondo" {...props} />;
}
