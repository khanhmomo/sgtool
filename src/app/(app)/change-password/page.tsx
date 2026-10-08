"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { CheckCircle2 } from "lucide-react";
import { Button, Card, Field, Input, Notice } from "@/components/ui";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: next }),
    });
    setLoading(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Failed to update password.");
      return;
    }
    setDone(true);
  }

  async function finish() {
    setSigningOut(true);
    await signOut({ redirect: false });
    router.push("/login?changed=1");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm items-center">
      <Card className="w-full p-6">
        <h1 className="mb-1 text-xl font-bold text-slate-900">Set a new password</h1>
        <p className="mb-5 text-sm text-slate-500">
          For security you must choose your own password before continuing.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="New password (min 8 chars)">
            <Input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password">
            <Input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          {error && <Notice kind="error">{error}</Notice>}
          <Button type="submit" variant="accent" loading={loading} className="w-full">
            Update password
          </Button>
        </form>
      </Card>

      {done && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 size={26} className="text-emerald-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Password changed</h2>
            <p className="mt-1 text-sm text-slate-500">
              Please sign in again with your new password.
            </p>
            <Button
              variant="accent"
              loading={signingOut}
              onClick={finish}
              className="mt-5 w-full"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
