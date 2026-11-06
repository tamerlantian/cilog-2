/**
 * Roles de color que toda paleta debe definir. Los componentes solo conocen
 * estos nombres (`tema.colores.accion`), nunca un hex: cambiar de paleta es
 * cambiar los valores, no los componentes.
 *
 * Una escena es un ambiente completo de color. Hay tres:
 * - `claro` y `oscuro`: la app según el tema del sistema.
 * - `marca`: superficie de marca (acceso, tarjeta destacada). Se aplica con
 *   `<Escena nombre="marca">` y todos los componentes dentro toman sus colores.
 */
export type Escena = {
  /** Fondo de la pantalla (el "suelo" sobre el que van las tarjetas). */
  suelo: string;
  /** Fondo elevado: tarjetas, diálogos, hojas. */
  fondo: string;
  /** Relleno sutil sobre `suelo` o `fondo`: chips neutros, segmentos, vacíos. */
  superficie: string;
  /** Fondo de los campos de texto. */
  campo: string;
  /** Borde de los campos (≥3:1 sobre `campo`). */
  bordeCampo: string;
  /** Separadores y bordes de tarjetas. Decorativo, sin exigencia de contraste. */
  borde: string;

  texto: string;
  textoSecundario: string;

  /** Color de marca para texto, íconos, selección, foco y progreso (≥4.5:1 sobre `suelo`). */
  primario: string;
  primarioSuave: string;
  sobrePrimario: string;

  /** Relleno de la acción principal de la pantalla (botón primario). */
  accion: string;
  sobreAccion: string;

  /** Toque decorativo (punto de destino, marca). No lleva texto encima salvo `sobreAcento`. */
  acento: string;
  sobreAcento: string;

  /** Estados: el color base es texto/ícono sobre `suelo` y sobre su `*Suave`. */
  exito: string;
  exitoSuave: string;
  advertencia: string;
  advertenciaSuave: string;
  advertenciaBorde: string;
  /** Relleno de la novedad en barras y gráficos (sin texto encima). */
  advertenciaRelleno: string;
  peligro: string;
  peligroSuave: string;
  /** Relleno de acciones destructivas. */
  peligroFuerte: string;
  info: string;
  infoSuave: string;

  deshabilitado: string;
  sobreDeshabilitado: string;
  /** Capa detrás de diálogos y hojas. */
  velo: string;

  /** Ilustración de ruta (login): línea punteada y paradas. */
  traza: string;
  nodo: string;

  /** Fondo de los toasts y su texto. */
  marca: string;
  sobreMarca: string;
};

export type Paleta = {
  /** Nombre con el que se presenta a la junta (igual al del mockup). */
  nombre: string;
  claro: Escena;
  oscuro: Escena;
  marca: Escena;
};
