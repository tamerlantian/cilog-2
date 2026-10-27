/** Mensaje que la página del WebView envía a la app. */
export type MensajeTurnstile =
  {tipo: 'token'; token: string} | {tipo: 'error'} | {tipo: 'expirado'};

/** Texto como literal JS seguro dentro de un <script>: JSON sin `<` para que no cierre la etiqueta. */
const literalJs = (texto: string) =>
  JSON.stringify(texto).replace(/</g, '\\u003c');

/**
 * Página mínima que dibuja el widget de Turnstile y devuelve el token con
 * `ReactNativeWebView.postMessage`. La site key se serializa como JSON para
 * que ningún carácter rompa el script.
 */
export const htmlTurnstile = (siteKey: string): string => `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { margin: 0; background: transparent; display: flex; justify-content: center; }
    </style>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=iniciar" async defer></script>
    <script>
      function enviar(mensaje) {
        window.ReactNativeWebView.postMessage(JSON.stringify(mensaje));
      }
      function iniciar() {
        turnstile.render('#desafio', {
          sitekey: ${literalJs(siteKey)},
          callback: function (token) { enviar({tipo: 'token', token: token}); },
          'error-callback': function () { enviar({tipo: 'error'}); },
          'expired-callback': function () { enviar({tipo: 'expirado'}); },
        });
      }
    </script>
  </head>
  <body><div id="desafio"></div></body>
</html>`;

export const leerMensajeTurnstile = (
  datos: string,
): MensajeTurnstile | null => {
  try {
    const mensaje = JSON.parse(datos) as Partial<MensajeTurnstile>;
    if (mensaje.tipo === 'token' && typeof mensaje.token === 'string') {
      return {tipo: 'token', token: mensaje.token};
    }
    if (mensaje.tipo === 'error' || mensaje.tipo === 'expirado') {
      return {tipo: mensaje.tipo};
    }
    return null;
  } catch {
    return null;
  }
};
