"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  Library,
  Users,
  UserCog,
  FolderOpen,
  Settings,
  Search,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/bookshelf", label: "Bookshelf", icon: Library },
  { href: "/photographers", label: "Photographers", icon: Users },
  { href: "/files", label: "Files", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppShell({
  user,
  children,
}: {
  user: { name: string; acronym: string; email: string; role?: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navItems =
    user.role === "admin"
      ? [...NAV.slice(0, -1), { href: "/accounts", label: "Accounts", icon: UserCog }, NAV[NAV.length - 1]]
      : NAV;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950 p-4 md:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-1">
          <Image src="/logo.png" alt="Sportograf TL" width={32} height={32} className="h-8 w-8 rounded-md object-contain" />
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">Sportograf</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              TL Tool
            </p>
          </div>
        </Link>
        {nav}
        <div className="mt-auto border-t border-slate-800 pt-4">
          <div className="mb-2 flex items-center gap-2.5 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
              {user.acronym.slice(0, 3)}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="truncate text-[11px] text-slate-500">{user.acronym} · {user.role === "admin" ? "Admin" : "Team Leader"}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar + slide-over */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 md:px-6 md:py-3">
          <button
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Menu"
          >
            <Menu size={18} />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
            <Image src="/logo.png" alt="Sportograf TL" width={28} height={28} className="h-7 w-7 rounded-md object-contain" />
          </Link>
          <form onSubmit={submitSearch} className="relative ml-auto w-full max-w-md">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search events, tactics, files, positions…"
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </form>
          <div className="ml-2 hidden h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white md:flex">
            {user.acronym.slice(0, 3)}
          </div>
        </header>

        {open && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
            <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-slate-950 p-4">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Image src="/logo.png" alt="Sportograf TL" width={32} height={32} className="h-8 w-8 rounded-md object-contain" />
                  <p className="text-sm font-bold text-white">Sportograf TL</p>
                </div>
                <button onClick={() => setOpen(false)} className="p-2 text-slate-400">
                  <X size={18} />
                </button>
              </div>
              {nav}
              <div className="mt-auto border-t border-slate-800 pt-4">
                <p className="mb-2 px-1 text-xs text-slate-500">
                  {user.name} · {user.acronym}
                </p>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 p-3 md:p-6">{children}</main>
      </div>
    </div>
  );
}
