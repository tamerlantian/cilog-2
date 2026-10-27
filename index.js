/**
 * @format
 */

// La configuración de unistyles debe cargarse antes que cualquier componente.
import './src/ui/tema/unistyles';

import {AppRegistry} from 'react-native';

import {name as appName} from './app.json';
import {App} from './src/app/App';

AppRegistry.registerComponent(appName, () => App);
