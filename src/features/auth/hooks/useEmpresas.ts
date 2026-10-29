import {useQuery} from '@tanstack/react-query';

import {listarEmpresasApi} from '../api/auth';
import {clavesAuth} from './claves';

export const useEmpresas = () =>
  useQuery({queryKey: clavesAuth.empresas, queryFn: listarEmpresasApi});
