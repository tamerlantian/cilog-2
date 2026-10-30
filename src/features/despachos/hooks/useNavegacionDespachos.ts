import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {RutasDespachos} from '../rutas';

export const useNavegacionDespachos = () =>
  useNavigation<NativeStackNavigationProp<RutasDespachos>>();
