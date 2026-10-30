import {
  leerDespacho,
  leerDespachos,
  leerGuia,
  leerGuias,
} from '../db/repositorio';
import {clavesDespachos} from './claves';
import {useConsultaLocal, useUsuarioId} from './local';

export const useDespachos = () => {
  const usuarioId = useUsuarioId() ?? 0;
  return useConsultaLocal(
    clavesDespachos.lista(usuarioId),
    db => leerDespachos(db, usuarioId),
    usuarioId > 0,
  );
};

export const useDespacho = (tenantDespachoId: number) =>
  useConsultaLocal(clavesDespachos.despacho(tenantDespachoId), db =>
    leerDespacho(db, tenantDespachoId),
  );

export const useGuias = (tenantDespachoId: number) =>
  useConsultaLocal(clavesDespachos.guias(tenantDespachoId), db =>
    leerGuias(db, tenantDespachoId),
  );

export const useGuia = (tenantDespachoId: number, codigoGuia: number) =>
  useConsultaLocal(clavesDespachos.guia(tenantDespachoId, codigoGuia), db =>
    leerGuia(db, tenantDespachoId, codigoGuia),
  );
