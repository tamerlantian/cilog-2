import type {ComponentProps} from 'react';

import {Escena, Pantalla} from '@/ui';

/** Pantalla del flujo de acceso: va sobre la superficie de marca de la paleta. */
export function PantallaAcceso(props: ComponentProps<typeof Pantalla>) {
  return (
    <Escena nombre="marca">
      <Pantalla {...props} />
    </Escena>
  );
}
