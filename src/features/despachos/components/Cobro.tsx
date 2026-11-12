import {Banknote, Insignia} from '@/ui';

import {pesos} from '../domain/formato';

/**
 * Lo que el conductor cobra en la entrega. El cobro va siempre en ámbar
 * (`advertencia`: algo por hacer antes de irse), con ícono y verbo para no
 * depender solo del color. Lo ya cobrado, si se muestra, va en verde.
 */
export function Cobro({monto}: {monto: number}) {
  return (
    <Insignia
      icono={Banknote}
      texto={`Cobrar ${pesos(monto)}`}
      tono="advertencia"
    />
  );
}
