"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  Library,
  UserCog,
  FolderOpen,
  Settings,
  Search,
  LogOut,
  BookOpen,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/events", label: "Events", icon: CalendarDays },
];

const MENU_NAV = [
  { href: "/bookshelf", label: "Bookshelf", icon: Library },
  { href: "/files", label: "Files", icon: FolderOpen },
  { href: "/tutorial", label: "Tutorial", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppShell({
  user,
  children,
}: {
  user: { name: string; acronym: string; email: string; role?: string; image?: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const menuItems =
    user.role === "admin"
      ? [...MENU_NAV.slice(0, -1), { href: "/accounts", label: "Accounts", icon: UserCog }, MENU_NAV[MENU_NAV.length - 1]]
      : MENU_NAV;

  // Close the menu on outside click (desktop dropdown), Escape, or navigation
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (navRef.current?.contains(t) || sheetRef.current?.contains(t)) return;
      if (menuRef.current && !menuRef.current.contains(t)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (searchOpen) mobileSearchRef.current?.focus();
  }, [searchOpen]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) {
      setSearchOpen(false);
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const avatar = user.image ? (
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded/blob URL
    <img src={user.image} alt={user.name} className="h-8 w-8 shrink-0 rounded-full object-cover" />
  ) : (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
      {user.acronym.slice(0, 3)}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 px-3 py-2 md:gap-6 md:px-6 md:py-3">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
            <Image src="/logo.png" alt="Sportograf TL" width={32} height={32} className="h-8 w-8 rounded-md object-contain" />
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900">Sportograf</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                TL Tool
              </p>
            </div>
          </Link>

          <nav className="hidden shrink-0 items-center gap-1 md:flex">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <form onSubmit={submitSearch} className="relative ml-auto hidden w-full max-w-md md:block">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search events, tactics, files, positions…"
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </form>

          <button
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
            aria-expanded={searchOpen}
            className={cn(
              "ml-auto flex h-9 w-9 items-center justify-center rounded-md transition-colors md:hidden",
              searchOpen ? "bg-slate-100 text-blue-600" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {searchOpen ? <X size={18} /> : <Search size={18} />}
          </button>

          {/* User menu */}
          <div ref={menuRef} className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-slate-100"
            >
              {avatar}
              <div className="hidden text-left leading-tight sm:block">
                <p className="max-w-[140px] truncate text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="text-[11px] text-slate-400">{user.acronym}</p>
              </div>
              <ChevronDown size={15} className={cn("hidden text-slate-400 transition-transform sm:block", menuOpen && "rotate-180")} />
            </button>

            {/* Desktop dropdown */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 hidden w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg md:block">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                        isActive(item.href)
                          ? "bg-blue-50 font-medium text-blue-700"
                          : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <Icon size={16} className={isActive(item.href) ? "text-blue-600" : "text-slate-400"} />
                      {item.label}
                    </Link>
                  );
                })}
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <LogOut size={16} className="text-slate-400" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile search row (scrolls away with the page — sits below the sticky header) */}
      {searchOpen && (
        <div className="border-b border-slate-200 bg-white px-3 py-2 md:hidden">
          <form onSubmit={submitSearch} className="relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={mobileSearchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search events, tactics, files, positions…"
              className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-3 text-base outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </form>
        </div>
      )}

      {/* Mobile menu bottom sheet */}
      {menuOpen && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div ref={sheetRef} className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white shadow-2xl">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-200" />
            <div className="flex items-center gap-3 px-4 pb-2 pt-3">
              {avatar}
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-400">{user.acronym} · {user.email}</p>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto py-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-base transition-colors",
                      isActive(item.href)
                        ? "bg-blue-50 font-medium text-blue-700"
                        : "text-slate-700 active:bg-slate-50"
                    )}
                  >
                    <Icon size={18} className={isActive(item.href) ? "text-blue-600" : "text-slate-400"} />
                    {item.label}
                  </Link>
                );
              })}
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-3 px-4 py-3 text-base text-slate-700 transition-colors active:bg-slate-50"
              >
                <LogOut size={18} className="text-slate-400" />
                Sign out
              </button>
            </div>
            <div className="pb-[env(safe-area-inset-bottom)]" />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 p-3 pb-20 md:p-6 md:pb-6">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav ref={navRef} className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-4">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold",
                  active ? "text-blue-600" : "text-slate-500 active:text-slate-800"
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => setSearchOpen((v) => !v)}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold",
              searchOpen ? "text-blue-600" : "text-slate-500 active:text-slate-800"
            )}
          >
            <Search size={20} />
            Search
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold",
              menuOpen ? "text-blue-600" : "text-slate-500 active:text-slate-800"
            )}
          >
            <Menu size={20} />
            Menu
          </button>
        </div>
      </nav>
    </div>
  );
}
