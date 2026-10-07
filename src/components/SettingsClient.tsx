"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button, Card, CardHeader, Field, Input, Notice } from "@/components/ui";
import type { UserDTO } from "@/types";

export default function SettingsClient({ user }: { user: UserDTO }) {
  const [form, setForm] = useState({ name: user.name, acronym: user.acronym, image: user.image });
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: "error", text: data.error || "Save failed." });
      } else {
        setMsg({ kind: "ok", text: "Profile saved. (Sign out/in to refresh the sidebar acronym.)" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Profile" />
      <form onSubmit={save} className="grid gap-4 p-4">
        <Field label="Full name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Acronym" hint="Used for position IDs and shown to photographers">
          <Input
            value={form.acronym}
            onChange={(e) => setForm({ ...form, acronym: e.target.value.toUpperCase() })}
            maxLength={6}
            className="uppercase"
          />
        </Field>
        <Field label="Email">
          <Input value={user.email} disabled className="bg-slate-50 text-slate-400" />
        </Field>
        <Field label="Profile image URL">
          <Input
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
            placeholder="https://…"
          />
        </Field>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <div className="flex justify-end">
          <Button type="submit" variant="accent" loading={saving}>
            <Save size={14} /> Save
          </Button>
        </div>
      </form>
    </Card>
  );
}
