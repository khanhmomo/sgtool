"use client";

import { useState } from "react";
import { UserCog } from "lucide-react";
import type { UserDTO } from "@/types";

// Shared one-time fetch of the TL list — every row reuses the same promise
let usersPromise: Promise<UserDTO[]> | null = null;
function loadUsers(): Promise<UserDTO[]> {
  usersPromise ||= fetch("/api/accounts")
    .then((r) => (r.ok ? r.json() : { users: [] }))
    .then((d) => d.users.filter((u: UserDTO) => u.active));
  return usersPromise;
}

/** Admin-only select to reassign an event to another Team Leader */
export default function AssignTl({
  eventId,
  ownerAcronym,
  ownerId,
}: {
  eventId: string;
  ownerAcronym: string;
  ownerId: string;
}) {
  const [users, setUsers] = useState<UserDTO[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState(ownerAcronym);

  function open(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditing(true);
    if (!users) loadUsers().then(setUsers).catch(() => setUsers([]));
  }

  async function assign(e: React.ChangeEvent<HTMLSelectElement>) {
    e.preventDefault();
    e.stopPropagation();
    const tl = (users || []).find((u) => u.id === e.target.value);
    if (!tl) return;
    setSaving(true);
    const res = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: tl.id }),
    });
    setSaving(false);
    setEditing(false);
    if (res.ok) setCurrent(tl.acronym);
  }

  return editing ? (
    <select
      autoFocus
      disabled={saving}
      defaultValue={ownerId}
      onChange={assign}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onBlur={() => setEditing(false)}
      className="h-7 rounded-md border border-slate-300 bg-white px-1.5 text-xs font-medium text-slate-700 outline-none"
    >
      {(users || []).map((u) => (
        <option key={u.id} value={u.id}>
          {u.name} ({u.acronym})
        </option>
      ))}
    </select>
  ) : (
    <button
      onClick={open}
      title="Reassign Team Leader"
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600"
    >
      <UserCog size={12} /> TL: {current || "—"}
    </button>
  );
}
