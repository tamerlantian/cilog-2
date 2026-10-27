import {useCallback, useState} from 'react';
import {View} from 'react-native';
import {WebView} from 'react-native-webview';
import {StyleSheet} from 'react-native-unistyles';

import {env} from '@/core/config/env';
import {mostrarError} from '@/ui';

import {htmlTurnstile, leerMensajeTurnstile} from './turnstile';

const urlBase = env.TURNSTILE_BASE_URL ?? env.API_URL;

/**
 * Desafío anti-bots de los formularios sin sesión. Sin `TURNSTILE_SITE_KEY` no hay
 * desafío (`requerido` es false) y se envía sin token.
 */
export const useDesafio = () => {
  const siteKey = env.TURNSTILE_SITE_KEY;
  const [token, setToken] = useState<string | undefined>();
  // Un token de Turnstile sirve una sola vez: al cambiar la clave el widget se vuelve a montar.
  const [intento, setIntento] = useState(0);

  const reiniciar = useCallback(() => {
    setToken(undefined);
    setIntento(n => n + 1);
  }, []);

  const elemento = siteKey ? (
    <View key={intento} style={styles.contenedor}>
      <WebView
        originWhitelist={['*']}
        scrollEnabled={false}
        source={{html: htmlTurnstile(siteKey), baseUrl: urlBase}}
        style={styles.web}
        onMessage={evento => {
          const mensaje = leerMensajeTurnstile(evento.nativeEvent.data);
          if (mensaje?.tipo === 'token') setToken(mensaje.token);
          else if (mensaje?.tipo === 'expirado') setToken(undefined);
          else if (mensaje?.tipo === 'error') {
            setToken(undefined);
            mostrarError('No se pudo cargar la verificación de seguridad.');
          }
        }}
      />
    </View>
  ) : null;

  return {requerido: Boolean(siteKey), token, elemento, reiniciar};
};

const styles = StyleSheet.create(tema => ({
  contenedor: {height: 70},
  web: {backgroundColor: tema.colores.fondo},
}));
