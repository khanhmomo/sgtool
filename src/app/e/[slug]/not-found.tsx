import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 font-black text-white">
        TL
      </div>
      <h1 className="text-xl font-bold text-white">Event link not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-400">
        This link may have been revoked or rotated by your Team Leader. Ask them for the current
        event link.
      </p>
      <Link href="/" className="mt-6 text-sm font-medium text-blue-400 hover:underline">
        Sportograf TL Tool
      </Link>
    </div>
  );
}
