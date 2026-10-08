"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SessionProvider, useSession, signOut } from "next-auth/react";
import { Button, Card, Field, Input, Notice } from "@/components/ui";

export default function ChangePasswordPage() {
  return (
    <SessionProvider>
      <ChangePasswordForm />
    </SessionProvider>
  );
}

function ChangePasswordForm() {
  const router = useRouter();
  const { update } = useSession();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (!res.ok) {
      setLoading(false);
      setError((await res.json().catch(() => ({}))).error || "Failed to update password.");
      return;
    }
    // Rewrite the JWT in place so mustChangePassword clears without re-login
    try {
      await update({ mustChangePassword: false });
    } catch {
      await signOut({ redirect: false });
      router.push("/login?changed=1");
      router.refresh();
      return;
    }
    setLoading(false);
    router.push("/dashboard");
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
    </div>
  );
}
