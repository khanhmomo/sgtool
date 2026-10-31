"use client";

import { useEffect, useState } from "react";

/**
 * One-time "we moved" toast — shown for ~5s when a request lands with
 * ?moved=1 (set by the proxy redirect from sgtool.vercel.app), then the
 * marker is stripped from the URL.
 */
export function MovedToast() {
  const [show, setShow] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("moved") === "1"
  );

  useEffect(() => {
    if (!show) return;
    const p = new URLSearchParams(window.location.search);
    p.delete("moved");
    const q = p.toString();
    history.replaceState(
      null,
      "",
      window.location.pathname + (q ? `?${q}` : "") + window.location.hash
    );
    const t = setTimeout(() => setShow(false), 5000);
    return () => clearTimeout(t);
  }, [show]);

  if (!show) return null;
  return (
    <div className="fixed inset-x-0 top-3 z-[100] flex justify-center px-4" role="status">
      <div className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
        Our home has moved — we&apos;re now at{" "}
        <span className="font-bold">sgtool.ktprod.com</span>. Please update your
        bookmarks.
      </div>
    </div>
  );
}
