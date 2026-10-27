import {htmlTurnstile, leerMensajeTurnstile} from '@/features/auth/turnstile';

describe('turnstile', () => {
  it('incluye la site key en la página', () => {
    expect(htmlTurnstile('0x4AAAA-clave')).toContain(
      'sitekey: "0x4AAAA-clave"',
    );
  });

  it('una site key con comillas o </script> no rompe el script', () => {
    const html = htmlTurnstile('a"b</script><b>');
    expect(html).toContain('sitekey: "a\\"b\\u003c/script>\\u003cb>"');
    // Solo debe haber las etiquetas </script> propias de la página.
    expect(html.match(/<\/script>/g)).toHaveLength(2);
  });

  it('lee los mensajes del WebView', () => {
    expect(leerMensajeTurnstile('{"tipo":"token","token":"abc"}')).toEqual({
      tipo: 'token',
      token: 'abc',
    });
    expect(leerMensajeTurnstile('{"tipo":"expirado"}')).toEqual({
      tipo: 'expirado',
    });
    expect(leerMensajeTurnstile('{"tipo":"error"}')).toEqual({tipo: 'error'});
  });

  it('ignora mensajes que no son del desafío', () => {
    expect(leerMensajeTurnstile('no es json')).toBeNull();
    expect(leerMensajeTurnstile('{"tipo":"token"}')).toBeNull();
    expect(leerMensajeTurnstile('{"tipo":"otro"}')).toBeNull();
  });
});
