import {getBuildNumber, getVersion} from 'react-native-device-info';

/** Versión instalada, con el código de compilación: `2.0.0 (57)`. */
export const versionApp = () => `${getVersion()} (${getBuildNumber()})`;
