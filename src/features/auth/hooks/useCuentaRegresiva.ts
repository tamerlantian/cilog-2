import {useCallback, useEffect, useState} from 'react';

/** Segundos que faltan para volver a permitir una acción. Empieza a contar al montar. */
export const useCuentaRegresiva = (segundos: number) => {
  const [restante, setRestante] = useState(segundos);

  useEffect(() => {
    if (restante <= 0) return;
    const temporizador = setTimeout(() => setRestante(r => r - 1), 1000);
    return () => clearTimeout(temporizador);
  }, [restante]);

  const reiniciar = useCallback(() => setRestante(segundos), [segundos]);

  return {restante, reiniciar};
};

/** 42 → "0:42". */
export const formatoMinutos = (segundos: number) =>
  `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
