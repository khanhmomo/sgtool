"use client";

import { useEffect, useState } from "react";
import { Plus, KeyRound, Power, UserCog, Trash2, Pencil, Save, X, Search } from "lucide-react";
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

  const [query, setQuery] = useState("");

  const [busy, setBusy] = useState("");

  // per-row edit form
  const [editId, setEditId] = useState("");
  const [editForm, setEditForm] = useState({ name: "", acronym: "", email: "" });
  const [editPw, setEditPw] = useState("");

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
    setEditId("");
    setEditPw("");
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
        <CardHeader
          title="Team Leaders"
          icon={<UserCog size={15} className="text-blue-600" />}
          action={
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find name or acronym"
                className="h-8 w-52 pl-7 text-xs"
              />
            </div>
          }
        />
        <div className="divide-y divide-slate-100">
          {(users || [])
            .filter((u) => {
              const q = query.trim().toLowerCase();
              return (
                !q ||
                u.name.toLowerCase().includes(q) ||
                u.acronym.toLowerCase().includes(q)
              );
            })
            .map((u) => (
            <div
              key={u.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3",
                !u.active && "opacity-60"
              )}
            >
              {u.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- user-uploaded/blob URL
                <img src={u.image} alt={u.name} className="h-9 w-9 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                  {u.acronym.slice(0, 3)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 truncate text-sm font-semibold text-slate-900">
                  <span className="truncate">{u.name}</span>
                  {u.id === meId && <span className="text-[10px] font-normal text-slate-400">(you)</span>}
                  {u.role === "admin" && (
                    <Badge className="bg-blue-100 text-blue-800">Admin</Badge>
                  )}
                  {u.active ? (
                    u.mustChangePassword && (
                      <Badge className="bg-amber-100 text-amber-800">Pending first login</Badge>
                    )
                  ) : (
                    <Badge className="bg-slate-200 text-slate-500">Disabled</Badge>
                  )}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {u.email} · {u.acronym}
                  {u.createdAt ? ` · joined ${fmtDate(u.createdAt)}` : ""}
                </p>
              </div>
              {u.id !== meId && (
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    onClick={() => {
                      setEditId(u.id);
                      setEditForm({ name: u.name, acronym: u.acronym, email: u.email });
                      setEditPw("");
                    }}
                    title="Edit account"
                    className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() =>
                      patch(u.id, { role: u.role === "admin" ? "team_leader" : "admin" })
                    }
                    disabled={busy === u.id}
                    title={u.role === "admin" ? "Remove admin rights" : "Grant admin rights"}
                    className={cn(
                      "rounded-md p-1.5 transition-colors disabled:opacity-40",
                      u.role === "admin"
                        ? "text-amber-500 hover:bg-amber-50"
                        : "text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                    )}
                  >
                    <UserCog size={15} />
                  </button>
                  <button
                    onClick={() => patch(u.id, { active: !u.active })}
                    disabled={busy === u.id}
                    title={u.active ? "Disable account" : "Enable account"}
                    className={cn(
                      "rounded-md p-1.5 transition-colors disabled:opacity-40",
                      u.active
                        ? "text-slate-400 hover:bg-red-50 hover:text-red-600"
                        : "text-emerald-500 hover:bg-emerald-50"
                    )}
                  >
                    <Power size={15} />
                  </button>
                  <button
                    onClick={() => remove(u)}
                    disabled={busy === u.id}
                    title="Delete account"
                    className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {users && !users.length && (
            <p className="px-4 py-6 text-center text-sm text-slate-400">No accounts yet.</p>
          )}
        </div>
      </Card>

      {/* Edit account modal */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditId("")}>
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <h2 className="text-sm font-bold text-slate-900">Edit account</h2>
              <button onClick={() => setEditId("")} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                patch(editId, {
                  name: editForm.name,
                  acronym: editForm.acronym,
                  email: editForm.email,
                  ...(editPw.trim() ? { resetPassword: editPw.trim() } : {}),
                });
              }}
              className="grid gap-4 p-5"
            >
              <Field label="Full name">
                <Input
                  required
                  autoFocus
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Jane Doe"
                />
              </Field>
              <Field label="Acronym (2–6 chars)" hint="Used for position IDs and the sidebar badge">
                <Input
                  required
                  value={editForm.acronym}
                  onChange={(e) => setEditForm({ ...editForm, acronym: e.target.value.toUpperCase() })}
                  placeholder="JD"
                  maxLength={6}
                  className="uppercase"
                />
              </Field>
              <Field label="Email">
                <Input
                  required
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="jane@sportograf.com"
                />
              <Field
                label="New temporary password"
                hint="Optional — leave blank to keep the current password. Min 8 chars; user must reset on next sign-in."
              >
                <div className="relative">
                  <KeyRound size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    minLength={8}
                    value={editPw}
                    onChange={(e) => setEditPw(e.target.value)}
                    placeholder="Leave blank to keep"
                    className="pl-7"
                  />
                </div>
              </Field>
              </Field>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditId("")}>
                  Cancel
                </Button>
                <Button type="submit" variant="accent" loading={busy === editId}>
                  <Save size={14} /> Save changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
