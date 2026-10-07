"use client";

import { useState } from "react";
import {
  Building2,
  BedDouble,
  Plus,
  Trash2,
  Save,
  ExternalLink,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Textarea,
} from "@/components/ui";
import { uid } from "@/lib/utils";
import type { HotelInfo, Photographer, RoomAssignment, VenueInfo } from "@/types";
import type { TabProps } from "./EventWorkspace";

function SaveBar({
  dirty,
  saving,
  saved,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  if (!dirty && !saved) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      {saved && !dirty && <span className="text-xs font-medium text-emerald-600">Saved</span>}
      <Button size="sm" variant="accent" onClick={onSave} loading={saving} disabled={!dirty}>
        <Save size={13} /> Save
      </Button>
    </div>
  );
}

function Chip({ acronym, onDragStart }: { acronym: string; onDragStart: (a: string) => void }) {
  return (
    <span
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", acronym);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(acronym);
      }}
      className="inline-flex cursor-grab items-center rounded bg-slate-900 px-2 py-1 text-[11px] font-bold text-white active:cursor-grabbing"
    >
      {acronym}
    </span>
  );
}

function RoomBoard({
  rooms,
  photographers,
  onChange,
}: {
  rooms: RoomAssignment[];
  photographers: Photographer[];
  onChange: (rooms: RoomAssignment[]) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null); // room id or "pool"

  const assigned = new Set(rooms.flatMap((r) => r.members));
  const pool = photographers.filter((p) => p.acronym && !assigned.has(p.acronym));

  function moveTo(acronym: string, roomId: string | null) {
    if (!acronym) return;
    const next = rooms.map((r) => ({ ...r, members: r.members.filter((m) => m !== acronym) }));
    if (roomId) {
      const i = next.findIndex((r) => r.id === roomId);
      if (i >= 0 && !next[i].members.includes(acronym)) next[i].members.push(acronym);
    }
    onChange(next);
  }

  const dropProps = (target: string | null) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setOver(target ?? "pool");
    },
    onDragLeave: () => setOver((o) => (o === (target ?? "pool") ? null : o)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      moveTo(e.dataTransfer.getData("text/plain") || dragging || "", target);
      setDragging(null);
      setOver(null);
    },
  });

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Room assignments</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onChange([...rooms, { id: uid(), room: `Room ${rooms.length + 1}`, members: [] }])}
        >
          <Plus size={13} /> Add room
        </Button>
      </div>

      {/* Unassigned pool */}
      <div
        {...dropProps(null)}
        className={`mb-2 flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-dashed p-2 transition-colors ${
          over === "pool" ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50"
        }`}
      >
        <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Unassigned</span>
        {pool.map((p) => (
          <Chip key={p.id} acronym={p.acronym} onDragStart={setDragging} />
        ))}
        {pool.length === 0 && <span className="text-xs text-slate-400">Everyone has a room</span>}
      </div>

      {/* Rooms */}
      <div className="grid gap-2 sm:grid-cols-2">
        {rooms.map((r) => (
          <div
            key={r.id}
            {...dropProps(r.id)}
            className={`rounded-md border p-2 transition-colors ${
              over === r.id ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white"
            }`}
          >
            <div className="mb-1.5 flex items-center gap-1.5">
              <Input
                value={r.room}
                onChange={(e) =>
                  onChange(rooms.map((x) => (x.id === r.id ? { ...x, room: e.target.value } : x)))
                }
                placeholder="101"
                className="h-7 w-24 text-xs font-bold"
              />
              <button
                title="Remove room"
                onClick={() => onChange(rooms.filter((x) => x.id !== r.id))}
                className="ml-auto rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <div className="flex min-h-8 flex-wrap gap-1.5">
              {r.members.map((m) => (
                <Chip key={m} acronym={m} onDragStart={setDragging} />
              ))}
              {r.members.length === 0 && (
                <span className="self-center text-[11px] text-slate-400">Drop people here</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {photographers.length === 0 && (
        <p className="mt-1 text-[11px] text-slate-400">Add team members in the Team tab first.</p>
      )}
    </div>
  );
}

export default function InfoTab({ event, patch, saving }: TabProps) {
  const [venue, setVenue] = useState<VenueInfo>(event.venue);
  const [hotel, setHotel] = useState<HotelInfo>(event.hotel);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [savedMsg, setSavedMsg] = useState<Record<string, boolean>>({});

  const mark = (k: string) => setDirty((d) => ({ ...d, [k]: true }));

  async function save(key: string, fields: Record<string, unknown>) {
    const ok = await patch(fields as never);
    if (ok) {
      setDirty((d) => ({ ...d, [key]: false }));
      setSavedMsg((s) => ({ ...s, [key]: true }));
      setTimeout(() => setSavedMsg((s) => ({ ...s, [key]: false })), 2500);
    }
  }

  const v = (k: keyof VenueInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setVenue((x) => ({ ...x, [k]: e.target.value }));
    mark("venue");
  };
  const h = (k: keyof HotelInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setHotel((x) => ({ ...x, [k]: e.target.value }));
    mark("hotel");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* ── Venue ── */}
      <Card>
        <CardHeader title="Venue" icon={<Building2 size={15} className="text-blue-600" />} />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Venue name"><Input value={venue.name} onChange={v("name")} /></Field>
          <Field label="Google Maps link">
            <Input value={venue.mapLink} onChange={v("mapLink")} placeholder="https://maps.google.com/…" />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input value={venue.address} onChange={v("address")} />
          </Field>
          <Field label="Entrance"><Input value={venue.entrance} onChange={v("entrance")} /></Field>
          <Field label="Meeting point"><Input value={venue.meetingPoint} onChange={v("meetingPoint")} /></Field>
          <Field label="Parking"><Input value={venue.parking} onChange={v("parking")} /></Field>
          <Field label="Access instructions"><Input value={venue.access} onChange={v("access")} /></Field>
          <Field label="Accreditation" className="sm:col-span-2">
            <Input value={venue.accreditation} onChange={v("accreditation")} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={venue.notes} onChange={v("notes")} rows={2} />
          </Field>
        </div>
        <div className="border-t border-slate-100 px-4 pb-3">
          <SaveBar dirty={!!dirty.venue} saving={saving} saved={!!savedMsg.venue} onSave={() => save("venue", { venue })} />
        </div>
      </Card>

      {/* ── Hotel ── */}
      <Card>
        <CardHeader title="Hotel / Accommodation" icon={<BedDouble size={15} className="text-blue-600" />} />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Hotel name"><Input value={hotel.name} onChange={h("name")} /></Field>
          <Field label="Google Maps link">
            <Input value={hotel.mapLink} onChange={h("mapLink")} placeholder="https://maps.google.com/…" />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input value={hotel.address} onChange={h("address")} />
          </Field>
          <Field label="Check-in"><Input value={hotel.checkIn} onChange={h("checkIn")} placeholder="Oct 17, 14:00" /></Field>
          <Field label="Check-out"><Input value={hotel.checkOut} onChange={h("checkOut")} placeholder="Oct 19, 11:00" /></Field>
          <Field label="Booking reference"><Input value={hotel.bookingRef} onChange={h("bookingRef")} /></Field>
          <div className="sm:col-span-2">
            <RoomBoard
              rooms={hotel.roomAssign || []}
              photographers={event.photographers}
              onChange={(roomAssign) => {
                setHotel((x) => ({ ...x, roomAssign }));
                mark("hotel");
              }}
            />
          </div>
          <Field label="Breakfast"><Input value={hotel.breakfast} onChange={h("breakfast")} placeholder="06:00–10:00, Lobby level" /></Field>
          <Field label="Parking"><Input value={hotel.parking} onChange={h("parking")} /></Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={hotel.notes} onChange={h("notes")} rows={2} />
          </Field>
        </div>
        <div className="border-t border-slate-100 px-4 pb-3">
          <SaveBar dirty={!!dirty.hotel} saving={saving} saved={!!savedMsg.hotel} onSave={() => save("hotel", { hotel })} />
        </div>
      </Card>

      {event.website && (
        <a
          href={event.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
        >
          <ExternalLink size={14} /> Official event website
        </a>
      )}
    </div>
  );
}
