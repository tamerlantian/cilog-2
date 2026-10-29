import type {LucideIcon} from 'lucide-react-native';
import {useUnistyles} from 'react-native-unistyles';

import type {ColorTema} from './tema/tema';

export type {LucideIcon as TipoIcono} from 'lucide-react-native';

type Props = {
  /** Componente de `lucide-react-native`, p. ej. `Truck`. */
  icono: LucideIcon;
  color?: ColorTema;
  tamano?: number;
  grosor?: number;
};

/** Ícono decorativo con color del tema. Lo accesible es el texto o la etiqueta que lo acompaña. */
export function Icono({
  icono: Componente,
  color = 'texto',
  tamano = 20,
  grosor = 2,
}: Props) {
  const {theme} = useUnistyles();
  return (
    <Componente
      accessibilityElementsHidden
      color={theme.colores[color]}
      importantForAccessibility="no-hide-descendants"
      size={tamano}
      strokeWidth={grosor}
    />
  );
}
