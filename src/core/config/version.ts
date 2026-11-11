import {getBuildNumber, getVersion} from 'react-native-device-info';

/** Versión instalada, con el código de compilación: `1.0.0 (1)`. */
export const versionApp = () => `${getVersion()} (${getBuildNumber()})`;
