/** Resultado tipado para reglas puras del dominio (sin dependencias — RNF-02). */
export type Resultado<T, E = string> =
  | { ok: true; valor: T }
  | { ok: false; error: E };

export function ok<T>(valor: T): Resultado<T, never> {
  return { ok: true, valor };
}

export function err<E>(error: E): Resultado<never, E> {
  return { ok: false, error };
}
