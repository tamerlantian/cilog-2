import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useUnistyles} from 'react-native-unistyles';

import {CuentaPantalla} from '@/features/cuenta';
import {
  EnviosPantalla,
  MisDespachosPantalla,
  type RutasPestanas,
} from '@/features/despachos';
import {Icono, RefreshCw, Truck, type TipoIcono, UserRound} from '@/ui';

const Tab = createBottomTabNavigator<RutasPestanas>();

/** Ícono de pestaña: en el color del texto si está elegida. */
const icono =
  (tipo: TipoIcono) =>
  ({focused}: {focused: boolean}) => (
    <Icono
      color={focused ? 'texto' : 'textoSecundario'}
      icono={tipo}
      tamano={22}
    />
  );

/**
 * Pestañas de la app con sesión. Las pantallas de detalle (despacho, guía,
 * entrega) se abren encima, en el stack raíz, sin la barra.
 * Falta "Ingreso" del canvas: se agrega cuando exista la feature.
 */
export function Pestanas() {
  const {theme} = useUnistyles();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colores.texto,
        tabBarInactiveTintColor: theme.colores.textoSecundario,
        tabBarLabelStyle: {
          fontFamily: theme.tipografia.familia.media,
          fontSize: theme.tipografia.tamano.pie,
        },
        tabBarStyle: {
          backgroundColor: theme.colores.fondo,
          borderTopColor: theme.colores.borde,
          paddingTop: theme.espaciado.xs,
        },
      }}>
      <Tab.Screen
        component={MisDespachosPantalla}
        name="MisDespachos"
        options={{
          title: 'Despachos',
          tabBarAccessibilityLabel: 'Despachos',
          tabBarIcon: icono(Truck),
        }}
      />
      <Tab.Screen
        component={EnviosPantalla}
        name="Envios"
        options={{
          title: 'Envíos',
          tabBarAccessibilityLabel: 'Envíos',
          tabBarIcon: icono(RefreshCw),
        }}
      />
      <Tab.Screen
        component={CuentaPantalla}
        name="Cuenta"
        options={{
          title: 'Cuenta',
          tabBarAccessibilityLabel: 'Cuenta',
          tabBarIcon: icono(UserRound),
        }}
      />
    </Tab.Navigator>
  );
}
