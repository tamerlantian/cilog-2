import {Texto} from '@/ui';

/** Título corto de una sección de lista ("EN CURSO", "TERMINADOS"). */
export function EtiquetaSeccion({texto}: {texto: string}) {
  return (
    <Texto accessibilityRole="header" mono tono="secundario" variante="pie">
      {texto.toUpperCase()}
    </Texto>
  );
}
