import {create} from 'zustand';

import {clienteConsultas, configurarSesionApi} from '@/core/api';
import {almacen, borrarToken, guardarToken, leerToken} from '@/core/storage';

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
 * - sinEmpresa: hay token pero falta elegir la empresa (tenant)
 * - activa: listo para operar
 */
export type EstadoSesion = 'iniciando' | 'sinSesion' | 'sinEmpresa' | 'activa';

type Tienda = {
  estado: EstadoSesion;
  token: string | null;
  usuario: Usuario | null;
  empresa: Perfil['empresa'];
  tieneVariasEmpresas: boolean;
  /** Se llena si la sesión terminó sola (token vencido o rechazado). */
  avisoSesion: string | null;
  restaurar: () => Promise<void>;
  iniciarSesion: (token: string, usuario: Usuario) => Promise<void>;
  elegirEmpresa: (empresa: Empresa, tieneVariasEmpresas: boolean) => void;
  cambiarEmpresa: () => void;
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

const guardarPerfil = (perfil: Perfil) =>
  almacen.set(CLAVE_PERFIL, JSON.stringify(perfil));

export const useSesion = create<Tienda>((set, get) => ({
  estado: 'iniciando',
  token: null,
  usuario: null,
  empresa: null,
  tieneVariasEmpresas: false,
  avisoSesion: null,

  restaurar: async () => {
    const token = await leerToken().catch(() => null);
    const perfil = leerPerfil();
    if (!token || !perfil || tokenVencido(token)) {
      if (token) await borrarToken().catch(() => undefined);
      almacen.remove(CLAVE_PERFIL);
      set({
        estado: 'sinSesion',
        token: null,
        usuario: null,
        empresa: null,
        tieneVariasEmpresas: false,
      });
      return;
    }
    set({
      token,
      usuario: perfil.usuario,
      empresa: perfil.empresa,
      tieneVariasEmpresas: perfil.tieneVariasEmpresas,
      estado: perfil.empresa ? 'activa' : 'sinEmpresa',
    });
  },

  iniciarSesion: async (token, usuario) => {
    clienteConsultas.clear();
    await guardarToken(token);
    guardarPerfil({usuario, empresa: null, tieneVariasEmpresas: false});
    set({
      token,
      usuario,
      empresa: null,
      tieneVariasEmpresas: false,
      estado: 'sinEmpresa',
      avisoSesion: null,
    });
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
    set({empresa: elegida, tieneVariasEmpresas, estado: 'activa'});
  },

  cambiarEmpresa: () => {
    const {usuario, tieneVariasEmpresas} = get();
    if (!usuario) return;
    clienteConsultas.clear();
    guardarPerfil({usuario, empresa: null, tieneVariasEmpresas});
    set({empresa: null, estado: 'sinEmpresa'});
  },

  cerrarSesion: async aviso => {
    clienteConsultas.clear();
    almacen.remove(CLAVE_PERFIL);
    set({
      estado: 'sinSesion',
      token: null,
      usuario: null,
      empresa: null,
      tieneVariasEmpresas: false,
      avisoSesion: aviso ?? null,
    });
    await borrarToken().catch(() => undefined);
  },
}));

/** Conecta el cliente HTTP con la sesión. Se llama una sola vez al arrancar. */
export const conectarSesionConApi = () =>
  configurarSesionApi({
    obtenerToken: () => useSesion.getState().token,
    obtenerTenantId: () => useSesion.getState().empresa?.tenant_id ?? null,
    alSesionInvalida: () => {
      if (useSesion.getState().estado === 'sinSesion') return;
      useSesion
        .getState()
        .cerrarSesion('Tu sesión expiró. Inicia sesión de nuevo.');
    },
  });
