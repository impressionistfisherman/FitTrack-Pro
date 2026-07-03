import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}

export function useBufferedValue<T>(value: T, onChange: (value: T) => void, delayMs: number) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  useEffect(() => {
    if (Object.is(draftValue, value)) return;
    const timeoutId = window.setTimeout(() => onChange(draftValue), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [delayMs, draftValue, onChange, value]);

  return [draftValue, setDraftValue] as const;
}
