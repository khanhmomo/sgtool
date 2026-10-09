"use client";

import { useRef, useState } from "react";
import { Save, KeyRound, ImagePlus } from "lucide-react";
import { Button, Card, CardHeader, Field, Input, Notice } from "@/components/ui";
import type { UserDTO } from "@/types";

export default function SettingsClient({ user }: { user: UserDTO }) {
  const [form, setForm] = useState({ name: user.name, image: user.image });
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pw.next !== pw.confirm) {
      setPwMsg({ kind: "error", text: "New passwords do not match." });
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwMsg({ kind: "error", text: data.error || "Password change failed." });
      } else {
        setPwMsg({ kind: "ok", text: "Password updated." });
        setPw({ current: "", next: "", confirm: "" });
      }
    } finally {
      setPwSaving(false);
    }
  }

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
    <div className="space-y-4">
    <Card>
      <CardHeader title="Profile" />
      <form onSubmit={save} className="grid gap-4 p-4">
        <Field label="Full name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Acronym" hint="Assigned by your admin — used for position IDs">
          <Input value={user.acronym} disabled className="bg-slate-50 text-slate-400 uppercase" />
        </Field>
        <Field label="Email" hint="Assigned by your admin — contact them to change it">
          <Input value={user.email} disabled className="bg-slate-50 text-slate-400" />
        </Field>
        <Field label="Profile photo">
          <div className="flex items-center gap-3">
            {form.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-uploaded/blob URL
              <img src={form.image} alt={form.name} className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                {user.acronym.slice(0, 3)}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setAvatarBusy(true);
                setMsg(null);
                try {
                  const fd = new FormData();
                  fd.append("file", f);
                  const res = await fetch("/api/me/avatar", { method: "POST", body: fd });
                  const data = await res.json().catch(() => ({}));
                  if (res.ok) {
                    setForm((p) => ({ ...p, image: data.user.image }));
                    setMsg({ kind: "ok", text: "Avatar updated. (Sign out/in to refresh the sidebar.)" });
                  } else {
                    setMsg({ kind: "error", text: data.error || "Upload failed." });
                  }
                } finally {
                  setAvatarBusy(false);
                  if (fileRef.current) fileRef.current.value = "";
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              loading={avatarBusy}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus size={14} /> {form.image ? "Change photo" : "Upload photo"}
            </Button>
          </div>
        </Field>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <div className="flex justify-end">
          <Button type="submit" variant="accent" loading={saving}>
            <Save size={14} /> Save
          </Button>
        </div>
      </form>
    </Card>

    <Card>
      <CardHeader title="Change password" icon={<KeyRound size={15} className="text-blue-600" />} />
        <form onSubmit={changePw} className="grid gap-4 p-4">
          <Field label="Current password">
            <Input
              type="password"
              required
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
              autoComplete="current-password"
            />
          </Field>
          <Field label="New password" hint="Minimum 8 characters">
            <Input
              type="password"
              required
              minLength={8}
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password">
            <Input
              type="password"
              required
              minLength={8}
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
              autoComplete="new-password"
            />
          </Field>
          {pwMsg && <Notice kind={pwMsg.kind}>{pwMsg.text}</Notice>}
          <div className="flex justify-end">
            <Button type="submit" variant="accent" loading={pwSaving}>
              <KeyRound size={14} /> Update password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
