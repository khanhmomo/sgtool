"use client";

import { useState } from "react";
import {
  Settings,
  Save,
  Share2,
  Copy,
  Check,
  RefreshCw,
  Ban,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Notice,
  Select,
} from "@/components/ui";
import { STATUS_META } from "@/lib/design";
import { fmtDate } from "@/lib/utils";
import type { EventStatus } from "@/types";
import type { TabProps } from "./EventWorkspace";

const EVENT_TYPES = [
  "IRONMAN", "IRONMAN 70.3", "Obstacle Race", "Marathon", "Trail Run",
];

export default function SettingsTab({
  event,
  patch,
  saving,
  onDeleted,
}: TabProps & { onDeleted: () => void }) {
  const [form, setForm] = useState({
    name: event.name, type: event.type, date: event.date, endDate: event.endDate,
    location: event.location, country: event.country, organizer: event.organizer,
    website: event.website, status: event.status,
  });
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setDirty(true);
  };

  // relative URL — identical on server and client (no hydration mismatch)
  const shareUrl = event.shareSlug ? `/e/${event.shareSlug}` : null;

  async function shareAction(action: string) {
    setShareBusy(true);
    try {
      const res = await fetch(`/api/events/${event.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) patch({ shareSlug: data.event.shareSlug });
    } finally {
      setShareBusy(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    const absolute = `${window.location.origin}${shareUrl}`;
    await navigator.clipboard.writeText(absolute).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function deleteEvent() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      if (res.ok) onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader title="Event details" icon={<Settings size={15} className="text-blue-600" />} />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Event name" className="sm:col-span-2">
            <Input value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={set("type")}>
              {EVENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={set("status")}>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Start date"><Input type="date" value={form.date} onChange={set("date")} /></Field>
          <Field label="End date"><Input type="date" value={form.endDate} onChange={set("endDate")} /></Field>
          <Field label="Location"><Input value={form.location} onChange={set("location")} /></Field>
          <Field label="Country"><Input value={form.country} onChange={set("country")} /></Field>
          <Field label="Organizer"><Input value={form.organizer} onChange={set("organizer")} /></Field>
          <Field label="Website"><Input value={form.website} onChange={set("website")} /></Field>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-400">
            Created {fmtDate(event.createdAt)} · Updated {fmtDate(event.updatedAt)}
          </p>
          <Button
            size="sm"
            variant="accent"
            loading={saving}
            disabled={!dirty}
            onClick={() =>
              patch({ ...form, status: form.status as EventStatus }).then((ok) => ok && setDirty(false))
            }
          >
            <Save size={13} /> Save changes
          </Button>
        </div>
      </Card>

      {/* Sharing */}
      <Card>
        <CardHeader title="Photographer share link" icon={<Share2 size={15} className="text-blue-600" />} />
        <div className="space-y-3 p-4">
          <p className="text-sm text-slate-600">
            Anyone with this link gets a read-only, mobile-optimized view of the event — no account
            needed.
          </p>
          {shareUrl ? (
            <>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  {shareUrl}
                </code>
                <Button size="sm" variant="outline" onClick={copyLink}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline">
                    <ExternalLink size={14} />
                  </Button>
                </a>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" loading={shareBusy} onClick={() => shareAction("rotate")}>
                  <RefreshCw size={13} /> Rotate link
                </Button>
                <Button size="sm" variant="outline" loading={shareBusy} onClick={() => shareAction("revoke")}>
                  <Ban size={13} /> Revoke link
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Notice kind="info" className="flex-1">
                Sharing is off — no public link exists for this event.
              </Notice>
              <Button size="sm" variant="accent" loading={shareBusy} onClick={() => shareAction("enable")}>
                <Share2 size={14} /> Enable sharing
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200">
        <CardHeader title={<span className="text-red-700">Danger zone</span>} />
        <div className="flex items-center justify-between p-4">
          <p className="text-sm text-slate-600">
            Permanently delete this event, its positions and file metadata.
          </p>
          {confirmDelete ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="danger" loading={deleting} onClick={deleteEvent}>
                Confirm delete
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} /> Delete event
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
