"use client";

import { useEffect, useRef } from "react";
import type { EventDTO } from "@/types";

type Patch = (fields: Partial<EventDTO>) => Promise<boolean>;

/**
 * Debounced autosave: calls patch(fields) ~800ms after value stops changing.
 * `value` should be the raw data being edited (string, array, object, …).
 * Pass the same key as `fields` built each render — patch runs only when value changes.
 */
export function useAutosave<T>(
  value: T,
  patch: Patch,
  build: (v: T) => Partial<EventDTO>,
  delay = 800
) {
  const patchRef = useRef(patch);
  const buildRef = useRef(build);
  useEffect(() => {
    patchRef.current = patch;
    buildRef.current = build;
  });
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef<T | null>(null);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      lastSent.current = value;
      return;
    }
    if (value === lastSent.current) return;
    if (timer.current) clearTimeout(timer.current);
    const v = value;
    timer.current = setTimeout(() => {
      lastSent.current = v;
      void patchRef.current(buildRef.current(v));
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, delay]);
}
