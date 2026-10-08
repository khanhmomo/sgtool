"use client";

import { useEffect, useState } from "react";
import { Plus, KeyRound, Power, UserCog, Trash2 } from "lucide-react";
import { Button, Card, CardHeader, Field, Input, Notice, Badge } from "@/components/ui";
import { cn, fmtDate } from "@/lib/utils";
import type { UserDTO } from "@/types";

/** Admin-only account management: create TLs, reset passwords, activate/deactivate */
export default function AccountsClient({ meId }: { meId: string }) {
  const [users, setUsers] = useState<UserDTO[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // create form
  const [name, setName] = useState("");
  const [acronym, setAcronym] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);

  // per-row reset form
  const [resetId, setResetId] = useState("");
  const [resetPw, setResetPw] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const res = await fetch("/api/accounts");
    if (!res.ok) {
      setError("Failed to load accounts.");
      return;
    }
    setUsers((await res.json()).users);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, acronym, email }),
    });
    setCreating(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Failed to create account.");
      return;
    }
    setNotice(
      data.emailSent
        ? `Account created for ${email} — welcome email sent. Temp password: ${data.tempPassword}`
        : `Account created for ${email} (temp password: ${data.tempPassword}), but the welcome email failed${data.emailError ? ` (${data.emailError})` : ""} — share the password manually.`
    );
    setName("");
    setAcronym("");
    setEmail("");
    load();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setError("");
    setBusy(id);
    const res = await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy("");
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Update failed.");
      return;
    }
    if (body.resetPassword) setNotice("Password reset — the user must set a new one on next sign-in.");
    setResetId("");
    setResetPw("");
    load();
  }

  async function remove(u: UserDTO) {
    if (!window.confirm(`Delete ${u.name} (${u.email})? This cannot be undone.`)) return;
    setError("");
    setBusy(u.id);
    const res = await fetch(`/api/accounts/${u.id}`, { method: "DELETE" });
    setBusy("");
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Delete failed.");
      return;
    }
    setNotice(`Account ${u.email} deleted.`);
    load();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="New Team Leader" icon={<UserCog size={15} className="text-blue-600" />} />
        <form onSubmit={create} className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </Field>
          <Field label="Acronym (2–6 chars)">
            <Input
              required
              value={acronym}
              onChange={(e) => setAcronym(e.target.value.toUpperCase())}
              placeholder="JD"
              maxLength={6}
            />
          </Field>
          <Field label="Email">
            <Input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@sportograf.com"
            />
          </Field>
          <p className="text-xs text-slate-400 sm:col-span-2">
            A random temporary password is generated and emailed to the Team Leader.
          </p>
          <div className="sm:col-span-2">
            <Button type="submit" variant="accent" loading={creating}>
              <Plus size={14} /> Create account
            </Button>
          </div>
        </form>
      </Card>

      {error && <Notice kind="error">{error}</Notice>}
      {notice && <Notice kind="ok">{notice}</Notice>}

      <Card>
        <CardHeader title="Team Leaders" icon={<UserCog size={15} className="text-blue-600" />} />
        <div className="divide-y divide-slate-100">
          {(users || []).map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                {u.acronym.slice(0, 3)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {u.name}{" "}
                  {u.role === "admin" && <Badge className="ml-1 bg-blue-100 text-blue-800">Admin</Badge>}
                  {u.id === meId && <span className="ml-1 text-[10px] text-slate-400">(you)</span>}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {u.email} · {u.acronym}
                  {u.createdAt ? ` · joined ${fmtDate(u.createdAt)}` : ""}
                </p>
              </div>
              <Badge className={cn(u.active ? "bg-emerald-50 text-emerald-700" : "bg-red-100 text-red-700")}>
                {u.active ? "Active" : "Disabled"}
              </Badge>
              {u.mustChangePassword && u.active && (
                <Badge className="bg-amber-100 text-amber-800">Pending first login</Badge>
              )}
              {u.id !== meId && (
                <div className="flex items-center gap-1">
                  {resetId === u.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (resetPw.length >= 8) patch(u.id, { resetPassword: resetPw });
                      }}
                      className="flex items-center gap-1"
                    >
                      <Input
                        type="text"
                        required
                        minLength={8}
                        autoFocus
                        value={resetPw}
                        onChange={(e) => setResetPw(e.target.value)}
                        placeholder="New temp password"
                        className="h-7 w-40 text-xs"
                      />
                      <Button type="submit" size="sm">Set</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setResetId("")}>
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={busy === u.id}
                      onClick={() => {
                        setResetId(u.id);
                        setResetPw("");
                      }}
                    >
                      <KeyRound size={13} /> Reset
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    loading={busy === u.id}
                    onClick={() => patch(u.id, { active: !u.active })}
                    className={cn(u.active ? "text-red-600" : "text-emerald-600")}
                  >
                    <Power size={13} /> {u.active ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={busy === u.id}
                    onClick={() => remove(u)}
                    className="text-red-600"
                  >
                    <Trash2 size={13} /> Delete
                  </Button>
                </div>
              )}
            </div>
          ))}
          {users && !users.length && (
            <p className="px-4 py-6 text-center text-sm text-slate-400">No accounts yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
