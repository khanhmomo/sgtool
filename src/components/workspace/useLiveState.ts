"use client";

import { useEffect, useRef, useState } from "react";

/** Key-order-stable JSON fingerprint — server echoes and local copies differ in
 *  key insertion order, so plain JSON.stringify miscompares. Undefined keys are
 *  dropped, matching what a Mongo round-trip does. */
export function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (v && typeof v === "object") {
    const keys = Object.keys(v as Record<string, unknown>)
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

/**
 * useState that stays live-synced with a server value (for collaborative editing).
 *
 * Three-way merge per value: the server copy is adopted only when local state
 * hasn't diverged from the last-seen server state. If the user has unsaved /
 * in-flight edits (local fingerprint ≠ server base fingerprint), the local copy
 * is kept — its autosave wins server-side anyway (last write wins), and the echo
 * of that save converges both sides. This guarantees typing is never reverted
 * by a poll or a save echo.
 *
 * Known limitation: if two editors change the SAME field at the same time, the
 * one whose save lands first keeps their local copy visible even after the
 * other's write wins server-side — converges on reload or next edit. Whole-field
 * conflicts are rare in practice (editors work on different sections).
 */
export function useLiveState<T>(serverValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [local, setLocal] = useState<T>(serverValue);
  /** Fingerprint of the last server value we saw (whether adopted or not) */
  const baseFp = useRef(canon(serverValue));
  /** Mirror of latest local state — updated in an effect, never during render */
  const localRef = useRef(local);
  useEffect(() => {
    localRef.current = local;
  }, [local]);

  useEffect(() => {
    const incFp = canon(serverValue);
    if (incFp === baseFp.current) return; // server unchanged (incl. echo of own save)
    const dirty = canon(localRef.current) !== baseFp.current;
    baseFp.current = incFp;
    if (!dirty) setLocal(serverValue);
    // dirty → keep local; its in-flight autosave wins server-side
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverValue]);

  return [local, setLocal];
}
