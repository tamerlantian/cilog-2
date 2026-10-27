/** UUID v4 para `X-Request-ID` (Fluor acepta [A-Za-z0-9-]{1,64}). */
export const generarIdPeticion = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, caracter => {
    const aleatorio = Math.floor(Math.random() * 16);
    const valor = caracter === 'x' ? aleatorio : (aleatorio % 4) + 8;
    return valor.toString(16);
  });
