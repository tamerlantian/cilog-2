import {useState} from 'react';
import {Alert, Linking, PermissionsAndroid, Platform} from 'react-native';

import {mostrarError} from '@/ui';

/** En iOS el sistema pregunta solo la primera vez que se abre la cámara. */
const pedirPermisoCamara = async () => {
  if (Platform.OS !== 'android') return PermissionsAndroid.RESULTS.GRANTED;
  return PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
};

const avisarPermisoBloqueado = () =>
  Alert.alert(
    'Cámara sin permiso',
    'Actívala en los ajustes del teléfono para leer códigos.',
    [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Abrir ajustes', onPress: () => Linking.openSettings()},
    ],
  );

/** Abre el lector solo si hay permiso de cámara. */
export const useLectorGuia = () => {
  const [abierto, setAbierto] = useState(false);

  const abrir = async () => {
    const permiso = await pedirPermisoCamara();
    if (permiso === PermissionsAndroid.RESULTS.GRANTED) {
      setAbierto(true);
    } else if (permiso === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      avisarPermisoBloqueado();
    } else {
      mostrarError('Sin permiso de cámara no se pueden leer códigos.');
    }
  };

  return {abierto, abrir, cerrar: () => setAbierto(false)};
};
