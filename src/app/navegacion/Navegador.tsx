import {
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useEffect, useMemo} from 'react';
import {useUnistyles} from 'react-native-unistyles';

import {conectarSesionConApi, useSesion} from '@/core/sesion';
import {
  EmpresaPantalla,
  LoginPantalla,
  RecuperarClavePantalla,
  RegistroPantalla,
  ReenviarVerificacionPantalla,
} from '@/features/auth';
import {InicioPantalla} from '@/features/inicio';
import {Cargando, Pantalla} from '@/ui';

import type {ParametrosRutas} from './rutas';

const Stack = createNativeStackNavigator<ParametrosRutas>();

export function Navegador() {
  const {theme, rt} = useUnistyles();
  const estado = useSesion(s => s.estado);
  const restaurar = useSesion(s => s.restaurar);

  useEffect(() => {
    conectarSesionConApi();
    restaurar();
  }, [restaurar]);

  const temaNavegacion = useMemo<Theme>(
    () => ({
      ...DefaultTheme,
      dark: rt.themeName === 'dark',
      colors: {
        primary: theme.colores.primario,
        background: theme.colores.fondo,
        card: theme.colores.fondo,
        text: theme.colores.texto,
        border: theme.colores.borde,
        notification: theme.colores.peligro,
      },
    }),
    [theme, rt.themeName],
  );

  if (estado === 'iniciando') {
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
        ) : estado === 'sinEmpresa' ? (
          <Stack.Screen component={EmpresaPantalla} name="Empresa" />
        ) : (
          <Stack.Screen component={InicioPantalla} name="Inicio" />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
