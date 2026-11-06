import {
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useEffect, useMemo} from 'react';
import {useUnistyles} from 'react-native-unistyles';

import {useSesion} from '@/core/sesion';
import {
  EmpresaPantalla,
  LoginPantalla,
  RecuperarClavePantalla,
  RegistroPantalla,
  ReenviarVerificacionPantalla,
} from '@/features/auth';
import {CuentaPantalla} from '@/features/cuenta';
import {
  DespachoPantalla,
  EntregaGuardadaPantalla,
  EntregarPantalla,
  EnviosPantalla,
  GuiaPantalla,
  MisDespachosPantalla,
  NovedadPantalla,
  VincularDespachoPantalla,
} from '@/features/despachos';
import {Cargando, CloudOff, EstadoVacio, Pantalla} from '@/ui';

import {useDatosLocales} from '../providers/useDatosLocales';

import type {ParametrosRutas} from './rutas';

const Stack = createNativeStackNavigator<ParametrosRutas>();

export function Navegador() {
  const {theme, rt} = useUnistyles();
  const estado = useSesion(s => s.estado);
  const restaurar = useSesion(s => s.restaurar);
  const datos = useDatosLocales();

  useEffect(() => {
    restaurar();
  }, [restaurar]);

  const temaNavegacion = useMemo<Theme>(
    () => ({
      ...DefaultTheme,
      dark: rt.themeName === 'dark',
      colors: {
        primary: theme.colores.primario,
        background: theme.colores.suelo,
        card: theme.colores.fondo,
        text: theme.colores.texto,
        border: theme.colores.borde,
        notification: theme.colores.peligro,
      },
    }),
    [theme, rt.themeName],
  );

  if (datos.estado === 'error') {
    return (
      <Pantalla>
        <EstadoVacio
          accion={{titulo: 'Reintentar', alPresionar: datos.reintentar}}
          icono={CloudOff}
          mensaje="Tus entregas guardadas siguen en el teléfono. Reintenta; si sigue fallando, reinicia la app."
          titulo="No pudimos abrir los datos del teléfono"
          tono="peligro"
        />
      </Pantalla>
    );
  }

  if (estado === 'iniciando' || datos.estado === 'abriendo') {
    return (
      <Pantalla>
        <Cargando />
      </Pantalla>
    );
  }

  return (
    <NavigationContainer theme={temaNavegacion}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {estado === 'sinSesion' ? (
          <>
            <Stack.Screen component={LoginPantalla} name="Login" />
            <Stack.Screen component={RegistroPantalla} name="Registro" />
            <Stack.Screen
              component={RecuperarClavePantalla}
              name="RecuperarClave"
            />
            <Stack.Screen
              component={ReenviarVerificacionPantalla}
              name="ReenviarVerificacion"
            />
          </>
        ) : (
          <>
            <Stack.Screen
              component={MisDespachosPantalla}
              name="MisDespachos"
            />
            <Stack.Screen
              component={VincularDespachoPantalla}
              name="VincularDespacho"
            />
            <Stack.Screen component={DespachoPantalla} name="Despacho" />
            <Stack.Screen component={GuiaPantalla} name="Guia" />
            <Stack.Screen
              component={EntregarPantalla}
              name="Entregar"
              options={{presentation: 'modal'}}
            />
            <Stack.Screen
              component={EntregaGuardadaPantalla}
              name="EntregaGuardada"
              options={{presentation: 'modal', gestureEnabled: false}}
            />
            <Stack.Screen
              component={NovedadPantalla}
              name="Novedad"
              options={{presentation: 'modal'}}
            />
            <Stack.Screen component={EnviosPantalla} name="Envios" />
            <Stack.Screen component={CuentaPantalla} name="Cuenta" />
            <Stack.Screen component={EmpresaPantalla} name="Empresa" />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
