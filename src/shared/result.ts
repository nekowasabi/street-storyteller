export type Result<T, E> = Success<T> | Failure<E>;

export type Success<T> = {
  readonly ok: true;
  readonly value: T;
};

export type Failure<E> = {
  readonly ok: false;
  readonly error: E;
};

export function ok<T>(value: T): Success<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Failure<E> {
  return { ok: false, error };
}
