import {Alert, Linking, PermissionsAndroid, Platform} from 'react-native';

/** `bloqueado`: Android ya no muestra el diálogo; solo se activa en ajustes. */
export type PermisoCamara = 'concedido' | 'denegado' | 'bloqueado';

/**
 * Android declara `CAMERA` (lo usa el lector de códigos), así que también la
 * cámara del sistema lo necesita concedido. En iOS el sistema pregunta solo.
 */
export const pedirPermisoCamara = async (): Promise<PermisoCamara> => {
  if (Platform.OS !== 'android') return 'concedido';
  const permiso = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
  );
  if (permiso === PermissionsAndroid.RESULTS.GRANTED) return 'concedido';
  return permiso === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
    ? 'bloqueado'
    : 'denegado';
};

/** `para`: lo que no se puede hacer sin cámara, p. ej. "tomar las fotos de la entrega". */
export const avisarPermisoCamaraBloqueado = (para: string) =>
  Alert.alert(
    'Cámara sin permiso',
    `Actívala en los ajustes del teléfono para ${para}.`,
    [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Abrir ajustes', onPress: () => Linking.openSettings()},
    ],
  );
