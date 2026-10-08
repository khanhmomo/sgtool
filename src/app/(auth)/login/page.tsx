"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Notice } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm p-6">
      <h1 className="mb-1 text-xl font-bold text-slate-900">Sign in</h1>
      <p className="mb-5 text-sm text-slate-500">Team Leader access</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email">
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="akt@sportograf.com"
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        {error && <Notice kind="error">{error}</Notice>}
        <Button type="submit" variant="accent" loading={loading} className="w-full">
          Sign in
        </Button>
      </form>
    </Card>
  );
}
