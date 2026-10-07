import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
      <div className="mb-8 flex items-center gap-3">
        <Image src="/logo.png" alt="Sportograf TL" width={40} height={40} className="h-10 w-10 rounded-lg object-contain" />
        <div>
          <p className="text-lg font-bold tracking-tight text-white">Sportograf TL Tool</p>
          <p className="text-xs text-slate-400">One event. One source of truth.</p>
        </div>
      </div>
      {children}
      <p className="mt-8 text-xs text-slate-600">
        Internal operations tool — authorized Team Leaders only.
      </p>
    </div>
  );
}
