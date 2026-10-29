import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {RutasAuth} from '../rutas';

export const useNavegacionAuth = () =>
  useNavigation<NativeStackNavigationProp<RutasAuth>>();
