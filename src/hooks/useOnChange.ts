import { useState } from 'react';

const UNSET = Symbol('unset');

/**
 * Run `onChange` during render when `value` changes (React's
 * "adjust state when a prop changes" pattern). Use it to reset local state
 * such as loading flags without an extra effect-triggered render.
 * Pass `{ onMount: true }` to also run it on the first render.
 * `onChange` must only update this component's own state.
 */
export function useOnChange<T>(value: T, onChange: (next: T) => void, options?: { onMount?: boolean }): void {
  const [prev, setPrev] = useState<T | typeof UNSET>(() => (options?.onMount ? UNSET : value));
  if (!Object.is(prev, value)) {
    setPrev(value);
    onChange(value);
  }
}
