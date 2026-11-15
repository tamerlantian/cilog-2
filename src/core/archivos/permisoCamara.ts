import {
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  TurboModuleRegistry,
  type TurboModule,
} from 'react-native';

/** `bloqueado`: el sistema ya no muestra el diálogo; solo se activa en ajustes. */
export type PermisoCamara = 'concedido' | 'denegado' | 'bloqueado';

/** Módulo nativo de react-native-camera-kit (el lector de códigos). */
type ModuloCamaraKit = TurboModule & {
  /** true: concedido; -1: nunca se preguntó; false: negado o restringido. */
  checkDeviceCameraAuthorizationStatus: () => Promise<boolean | number>;
  requestDeviceCameraAuthorization: () => Promise<boolean>;
};

/**
 * iOS pregunta una sola vez: si lo niega, solo se cambia en Ajustes. Sin
 * esto el lector de códigos quedaba en negro, sin avisar (camera-kit no
 * llama a `onError`). Si el módulo no está, deja que el sistema pregunte.
 */
const pedirPermisoCamaraIos = async (): Promise<PermisoCamara> => {
  const modulo = TurboModuleRegistry.get<ModuloCamaraKit>('RNCameraKitModule');
  if (!modulo) return 'concedido';
  const estado = await modulo.checkDeviceCameraAuthorizationStatus();
  if (estado === true) return 'concedido';
  if (estado !== -1) return 'bloqueado';
  return (await modulo.requestDeviceCameraAuthorization())
    ? 'concedido'
    : 'bloqueado';
};

/**
 * Android declara `CAMERA` (lo usa el lector de códigos), así que también la
 * cámara del sistema lo necesita concedido. iOS: ver `pedirPermisoCamaraIos`.
 */
export const pedirPermisoCamara = async (): Promise<PermisoCamara> => {
  if (Platform.OS === 'ios')
    return pedirPermisoCamaraIos().catch(() => 'concedido' as const);
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
