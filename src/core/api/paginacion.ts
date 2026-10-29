import {z} from 'zod';

/** Respuesta paginada estándar de Fluor: {total, page, size, items}. */
export const paginaDe = <T extends z.ZodType>(item: T) =>
  z.object({
    total: z.number(),
    page: z.number(),
    size: z.number(),
    items: z.array(item),
  });
