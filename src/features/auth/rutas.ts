/** Rutas sin sesión. La app las compone con las demás en `app/navegacion/rutas.ts`. */
export type RutasAuth = {
  Login: undefined;
  Registro: undefined;
  RecuperarClave: {email?: string} | undefined;
  ReenviarVerificacion: {email?: string} | undefined;
};
