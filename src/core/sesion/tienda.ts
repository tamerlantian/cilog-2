import {create} from 'zustand';

import {clienteConsultas, configurarSesionApi} from '@/core/api';
import {
  almacen,
  borrarCredenciales,
  guardarCredenciales,
  leerCredenciales,
  type Credenciales,
} from '@/core/storage';

import {
  esquemaPerfil,
  type Empresa,
  type Perfil,
  type Usuario,
} from './esquemas';
import {tokenVencido} from './jwt';

const CLAVE_PERFIL = 'sesion.perfil';

/**
 * - iniciando: leyendo el llavero al arrancar
 * - sinSesion: hay que iniciar sesión
 * - activa: listo para operar
 *
 * La empresa es opcional: los despachos se acceden por su asignación al
 * repartidor, no por la empresa. Solo ingreso y envíos la piden.
 */
export type EstadoSesion = 'iniciando' | 'sinSesion' | 'activa';

type Tienda = {
  estado: EstadoSesion;
  token: string | null;
  /** Refresh token de Fluor (30 días). Null si el servidor no lo entregó. */
  tokenRenovacion: string | null;
  usuario: Usuario | null;
  /** Empresa elegida para ingreso y envíos; null si no ha elegido. */
  empresa: Perfil['empresa'];
  tieneVariasEmpresas: boolean;
  /** Se llena si la sesión terminó sola (token vencido o rechazado). */
  avisoSesion: string | null;
  restaurar: () => Promise<void>;
  iniciarSesion: (
    credenciales: Credenciales,
    usuario: Usuario,
  ) => Promise<void>;
  renovarToken: (token: string) => Promise<void>;
  elegirEmpresa: (empresa: Empresa, tieneVariasEmpresas: boolean) => void;
  cerrarSesion: (aviso?: string) => Promise<void>;
};

const leerPerfil = (): Perfil | null => {
  const texto = almacen.getString(CLAVE_PERFIL);
  if (!texto) return null;
  try {
    const perfil = esquemaPerfil.safeParse(JSON.parse(texto));
    return perfil.success ? perfil.data : null;
  } catch {
    return null;
  }
};

/** Hay sesión si el token de acceso sirve o se puede renovar. */
const sesionVigente = ({token, tokenRenovacion}: Credenciales) =>
  !tokenVencido(token) ||
  (tokenRenovacion !== null && !tokenVencido(tokenRenovacion));

const guardarPerfil = (perfil: Perfil) =>
  almacen.set(CLAVE_PERFIL, JSON.stringify(perfil));

export const useSesion = create<Tienda>((set, get) => ({
  estado: 'iniciando',
  token: null,
  tokenRenovacion: null,
  usuario: null,
  empresa: null,
  tieneVariasEmpresas: false,
  avisoSesion: null,

  restaurar: async () => {
    const credenciales = await leerCredenciales().catch(() => null);
    const perfil = leerPerfil();
    // Un token de acceso vencido no cierra la sesión: la primera petición lo renueva.
    if (!credenciales || !perfil || !sesionVigente(credenciales)) {
      await borrarCredenciales().catch(() => undefined);
      almacen.remove(CLAVE_PERFIL);
      set({
        estado: 'sinSesion',
        token: null,
        tokenRenovacion: null,
        usuario: null,
        empresa: null,
        tieneVariasEmpresas: false,
      });
      return;
    }
    set({
      token: credenciales.token,
      tokenRenovacion: credenciales.tokenRenovacion,
      usuario: perfil.usuario,
      empresa: perfil.empresa,
      tieneVariasEmpresas: perfil.tieneVariasEmpresas,
      estado: 'activa',
    });
  },

  iniciarSesion: async (credenciales, usuario) => {
    clienteConsultas.clear();
    await guardarCredenciales(credenciales);
    guardarPerfil({usuario, empresa: null, tieneVariasEmpresas: false});
    set({
      token: credenciales.token,
      tokenRenovacion: credenciales.tokenRenovacion,
      usuario,
      empresa: null,
      tieneVariasEmpresas: false,
      estado: 'activa',
      avisoSesion: null,
    });
  },

  renovarToken: async token => {
    const {tokenRenovacion} = get();
    // Primero en memoria: el cliente HTTP reintenta con este token de inmediato.
    set({token});
    await guardarCredenciales({token, tokenRenovacion}).catch(() => undefined);
  },

  elegirEmpresa: (empresa, tieneVariasEmpresas) => {
    const {usuario} = get();
    if (!usuario) return;
    clienteConsultas.clear();
    const elegida = {
      tenant_id: empresa.tenant_id,
      tenant_nombre: empresa.tenant_nombre,
    };
    guardarPerfil({usuario, empresa: elegida, tieneVariasEmpresas});
    set({empresa: elegida, tieneVariasEmpresas});
  },

  cerrarSesion: async aviso => {
    clienteConsultas.clear();
    almacen.remove(CLAVE_PERFIL);
    set({
      estado: 'sinSesion',
      token: null,
      tokenRenovacion: null,
      usuario: null,
      empresa: null,
      tieneVariasEmpresas: false,
      avisoSesion: aviso ?? null,
    });
    await borrarCredenciales().catch(() => undefined);
  },
}));

/** Conecta el cliente HTTP con la sesión. Se llama una sola vez al arrancar. */
export const conectarSesionConApi = () =>
  configurarSesionApi({
    obtenerToken: () => useSesion.getState().token,
    obtenerTokenRenovacion: () => useSesion.getState().tokenRenovacion,
    alRenovarToken: token => useSesion.getState().renovarToken(token),
    obtenerTenantId: () => useSesion.getState().empresa?.tenant_id ?? null,
    alSesionInvalida: () => {
      if (useSesion.getState().estado === 'sinSesion') return;
      useSesion
        .getState()
        .cerrarSesion('Tu sesión expiró. Inicia sesión de nuevo.');
    },
  });
