type DespachoRastreable = {
  tenantDespachoId: number;
  terminadoEn: number | null;
  liberado: boolean;
};

/**
 * Se comparte la ubicación mientras el despacho está en curso: ni terminado
 * por el conductor ni liberado por la empresa (docs/rastreo.md).
 */
export const puedeRastrearse = (despacho: DespachoRastreable) =>
  despacho.terminadoEn === null && !despacho.liberado;

/**
 * El rastreo activo ya no corresponde a ningún despacho en curso del teléfono:
 * lo terminó, lo desvinculó o la empresa lo liberó. No se pasa solo a otro
 * despacho: el siguiente arranca cuando el conductor lo abre.
 */
export const debeDetenerse = (
  rastreada: number | null,
  despachos: readonly DespachoRastreable[],
) =>
  rastreada !== null &&
  !despachos.some(d => d.tenantDespachoId === rastreada && puedeRastrearse(d));

/**
 * Lo que la línea del despacho le dice al conductor, del problema más urgente
 * al estado normal. Sin permiso ni GPS la empresa no lo ve; con el ahorro de
 * batería puede dejar de verlo con la pantalla apagada.
 */
export type IndicadorUbicacion =
  'sinPermiso' | 'gpsApagado' | 'bateria' | 'activa';

export const indicadorUbicacion = ({
  permiso,
  gpsEncendido,
  bateriaSinRestricciones,
  bateriaRevisada,
}: {
  permiso: 'concedido' | 'negado' | 'bloqueado';
  gpsEncendido: boolean;
  bateriaSinRestricciones: boolean;
  /** El conductor ya vio la guía de batería y dijo "Ya lo hice". */
  bateriaRevisada: boolean;
}): IndicadorUbicacion => {
  if (permiso !== 'concedido') return 'sinPermiso';
  if (!gpsEncendido) return 'gpsApagado';
  if (!bateriaSinRestricciones && !bateriaRevisada) return 'bateria';
  return 'activa';
};

export type GuiaBateria = {marca: string; pasos: readonly string[]};

/**
 * Pasos para sacar a Cilog del ahorro de batería según la marca del teléfono.
 * Los menús cambian con cada versión de Android: verificar en teléfonos reales.
 */
export const guiaBateria = (marcaTelefono: string): GuiaBateria => {
  const marca = marcaTelefono.toLowerCase();
  if (['xiaomi', 'redmi', 'poco'].some(m => marca.includes(m))) {
    return {
      marca: 'Xiaomi',
      pasos: [
        'Toca Abrir ajustes.',
        'En Ahorro de batería elige Sin restricciones.',
        'Activa Inicio automático para Cilog.',
      ],
    };
  }
  if (marca.includes('samsung')) {
    return {
      marca: 'Samsung',
      pasos: [
        'Toca Abrir ajustes.',
        'En Batería elige Sin restricciones.',
        'Revisa que Cilog no esté en Apps en suspensión.',
      ],
    };
  }
  if (['huawei', 'honor'].some(m => marca.includes(m))) {
    return {
      marca: 'Huawei',
      pasos: [
        'Toca Abrir ajustes.',
        'En Inicio de aplicaciones apaga Gestionar automáticamente.',
        'Deja activas las tres opciones que aparecen.',
      ],
    };
  }
  return {
    marca: 'teléfono',
    pasos: [
      'Toca Abrir ajustes.',
      'Busca Batería u Optimización de batería.',
      'Elige No optimizar o Sin restricciones para Cilog.',
    ],
  };
};
