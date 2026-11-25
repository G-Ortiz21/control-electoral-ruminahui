import type { FieldValues } from 'react-hook-form';
import { z } from 'zod';

/**
 * Adaptador mínimo entre Zod y React Hook Form sin dependencia extra
 * (@hookform/resolvers no está en el stack cerrado). Devuelve un resolver
 * compatible con useForm({ resolver }).
 */
export function crearZodResolver<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return async (values: unknown) => {
    const resultado = schema.safeParse(values);
    if (resultado.success) {
      return { values: resultado.data as FieldValues, errors: {} };
    }
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of resultado.error.issues) {
      const ruta = issue.path.length > 0 ? issue.path.join('.') : 'root';
      if (!errors[ruta]) {
        errors[ruta] = { type: issue.code, message: issue.message };
      }
    }
    return { values: {}, errors };
  };
}