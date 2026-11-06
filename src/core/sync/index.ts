export {clasificarFallo, type ClaseFallo} from './clasificar';
export {
  descartar,
  encolar,
  reintentar,
  resumenCola,
  SIN_CONFIRMAR,
  sinConfirmarDelDespacho,
  type ArchivoOperacion,
  type NuevaOperacion,
  type Operacion,
} from './cola';
export {calcularEspera} from './espera';
export {
  crearMotor,
  type Enviador,
  type Motor,
  type ResultadoEnvio,
} from './motor';
export {
  escucharCola,
  iniciarSincronizacion,
  obtenerMotor,
  sincronizarAhora,
} from './sincronizacion';
