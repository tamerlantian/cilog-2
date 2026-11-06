import {Texto} from './Texto';

type Props = {tamano?: 'grande' | 'compacto'};

/**
 * Nombre de Cilog en la fuente de títulos. Toma el color de texto de la escena,
 * así que se usa dentro de `<Escena nombre="marca">`. Provisional hasta tener el logo real.
 */
export function Marca({tamano = 'grande'}: Props) {
  return (
    <Texto
      accessibilityLabel="Cilog"
      accessibilityRole="header"
      variante={tamano === 'grande' ? 'marca' : 'display'}>
      Cilog
    </Texto>
  );
}
