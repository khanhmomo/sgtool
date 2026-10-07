"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Field, Input, Notice } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", acronym: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }
      const login = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (login?.error) {
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm p-6">
      <h1 className="mb-1 text-xl font-bold text-slate-900">Create account</h1>
      <p className="mb-5 text-sm text-slate-500">
        Register as a Team Leader. Your acronym is used across positions and rosters.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name">
          <Input required value={form.name} onChange={set("name")} placeholder="Mo Tran" />
        </Field>
        <Field label="Acronym" hint="2–6 characters, e.g. AKT">
          <Input
            required
            value={form.acronym}
            onChange={set("acronym")}
            placeholder="AKT"
            maxLength={6}
            className="uppercase"
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            required
            value={form.email}
            onChange={set("email")}
            placeholder="akt@sportograf.com"
          />
        </Field>
        <Field label="Password" hint="Minimum 6 characters">
          <Input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={set("password")}
          />
        </Field>
        {error && <Notice kind="error">{error}</Notice>}
        <Button type="submit" variant="accent" loading={loading} className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
