"use client";

import { useEffect, useState } from "react";

export default function TutorialNav({
  items,
  variant,
}: {
  items: { id: string; label: string }[];
  variant: "side" | "bar";
}) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const sections = items
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      // Trigger when a section occupies the upper-middle band of the viewport
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  if (variant === "bar") {
    return (
      <div className="sticky top-[53px] z-10 -mx-3 mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50/95 px-3 py-2 backdrop-blur lg:hidden">
        {items.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
              active === s.id
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {s.label}
          </a>
        ))}
      </div>
    );
  }

  return (
    <aside className="sticky top-24 hidden w-44 shrink-0 self-start lg:block">
      <nav className="flex flex-col gap-0.5">
        {items.map((s, i) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`flex items-baseline gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              active === s.id
                ? "border-l-2 border-blue-600 bg-blue-50 font-bold text-blue-700"
                : "border-l-2 border-transparent text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
            }`}
          >
            <span
              className={`w-4 shrink-0 text-right text-[10px] ${
                active === s.id ? "text-blue-500" : "text-slate-400"
              }`}
            >
              {i + 1}
            </span>
            {s.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
