"use client";

import { useState } from "react";
import {
  Building2,
  BedDouble,
  Plus,
  Trash2,
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
import { cn, uid } from "@/lib/utils";
import type { HotelInfo, Photographer, RoomAssignment, VenueInfo } from "@/types";
import type { TabProps } from "./EventWorkspace";
import { useAutosave } from "./autosave";

function Chip({ acronym, onDragStart, picked, onTap }: { acronym: string; onDragStart: (a: string) => void; picked?: boolean; onTap?: (a: string) => void }) {
  return (
    <span
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", acronym);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(acronym);
      }}
      onClick={(e) => { e.stopPropagation(); onTap?.(acronym); }}
      className={cn(
        "inline-flex cursor-grab items-center rounded bg-slate-900 px-2 py-1 text-[11px] font-bold text-white active:cursor-grabbing",
        picked && "ring-2 ring-blue-400 ring-offset-1"
      )}
    >
      {acronym}
    </span>
  );
}

function RoomBoard({
  rooms,
  photographers,
  onChange,
  assignedElsewhere,
}: {
  rooms: RoomAssignment[];
  photographers: Photographer[];
  onChange: (rooms: RoomAssignment[]) => void;
  /** Acronyms assigned to rooms in OTHER hotels — excluded from this pool too */
  assignedElsewhere?: Set<string>;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null); // room id or "pool"
  const [picked, setPicked] = useState<string | null>(null); // tap-to-assign (touch devices can't drag)

  const tapPick = (a: string) => setPicked((p) => (p === a ? null : a));
  const tapDrop = (roomId: string | null) => {
    if (!picked) return;
    moveTo(picked, roomId);
    setPicked(null);
  };

  const assigned = new Set(rooms.flatMap((r) => r.members));
  const pool = photographers.filter(
    (p) => p.acronym && !assigned.has(p.acronym) && !(assignedElsewhere?.has(p.acronym))
  );

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
        onClick={() => tapDrop(null)}
        className={`mb-2 flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-dashed p-2 transition-colors ${
          over === "pool" ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50"
        } ${picked ? "ring-1 ring-blue-300" : ""}`}
      >
        <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Unassigned</span>
        {pool.map((p) => (
          <Chip key={p.id} acronym={p.acronym} onDragStart={setDragging} picked={picked === p.acronym} onTap={tapPick} />
        ))}
        {pool.length === 0 && <span className="text-xs text-slate-400">Everyone has a room</span>}
      </div>
      {picked && (
        <p className="mb-2 text-[11px] font-medium text-blue-600">
          {picked} picked — tap a room to assign (tap the chip again to cancel)
        </p>
      )}

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
            <div
              className="flex min-h-8 flex-wrap gap-1.5"
              onClick={() => tapDrop(r.id)}
            >
              {r.members.map((m) => (
                <Chip key={m} acronym={m} onDragStart={setDragging} picked={picked === m} onTap={tapPick} />
              ))}
              {r.members.length === 0 && (
                <span className="self-center text-[11px] text-slate-400">
                  {picked ? `Tap to assign ${picked}` : "Drop people here"}
                </span>
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

export default function InfoTab({ event, patch }: TabProps) {
  const [venue, setVenue] = useState<VenueInfo>(event.venue);
  const [hotels, setHotels] = useState<HotelInfo[]>(event.hotels);
  useAutosave(venue, patch, (val) => ({ venue: val }));
  useAutosave(hotels, patch, (val) => ({ hotels: val }));

  const v = (k: keyof VenueInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setVenue((x) => ({ ...x, [k]: e.target.value }));
  };
  const h = (i: number, k: keyof HotelInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setHotels((x) => x.map((it, j) => (j === i ? { ...it, [k]: e.target.value } : it)));
  };
  const setHotelRooms = (i: number) => (roomAssign: RoomAssignment[]) => {
    setHotels((x) => {
      // Members newly added to this hotel's rooms get removed from other hotels' rooms
      const before = new Set(x[i].roomAssign.flatMap((r) => r.members));
      const added = roomAssign.flatMap((r) => r.members).filter((m) => !before.has(m));
      return x.map((it, j) => {
        if (j === i) return { ...it, roomAssign };
        if (added.length === 0) return it;
        return {
          ...it,
          roomAssign: it.roomAssign.map((r) => ({
            ...r,
            members: r.members.filter((m) => !added.includes(m)),
          })),
        };
      });
    });
  };
  // Acronyms assigned in any hotel OTHER than index i — shared pool exclusion
  const assignedInOtherHotels = (i: number) =>
    new Set(hotels.flatMap((h, j) => (j === i ? [] : h.roomAssign.flatMap((r) => r.members))));
  const EMPTY_HOTEL: HotelInfo = {
    name: "", address: "", mapLink: "", checkIn: "", checkOut: "",
    bookingRef: "", rooms: "", roomAssign: [], breakfast: "", parking: "", notes: "",
  };
  function addHotel() {
    setHotels((x) => [...x, { ...EMPTY_HOTEL, roomAssign: [] }]);
  }
  function removeHotel(i: number) {
    setHotels((x) => x.filter((_, j) => j !== i));
  }

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
      </Card>

      {/* ── Hotels ── */}
      <Card>
        <CardHeader
          title={hotels.length > 1 ? `Hotels / Accommodation (${hotels.length})` : "Hotel / Accommodation"}
          icon={<BedDouble size={15} className="text-blue-600" />}
          action={
            <Button size="sm" variant="outline" onClick={addHotel}>
              <Plus size={13} /> Hotel
            </Button>
          }
        />
        {hotels.length === 0 && (
          <p className="px-4 pb-4 text-sm text-slate-400">No hotel yet — click <b>+ Hotel</b> to add one.</p>
        )}
        {hotels.map((hotel, i) => (
          <div key={i} className="border-t border-slate-100 first:border-t-0">
            <div className="flex items-center justify-between px-4 pt-3">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {hotel.name || `Hotel ${i + 1}`}
              </span>
              <button
                title="Remove hotel"
                onClick={() => removeHotel(i)}
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <Field label="Hotel name"><Input value={hotel.name} onChange={h(i, "name")} /></Field>
              <Field label="Google Maps link">
                <Input value={hotel.mapLink} onChange={h(i, "mapLink")} placeholder="https://maps.google.com/…" />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <Input value={hotel.address} onChange={h(i, "address")} />
              </Field>
              <Field label="Check-in"><Input value={hotel.checkIn} onChange={h(i, "checkIn")} placeholder="Oct 17, 14:00" /></Field>
              <Field label="Check-out"><Input value={hotel.checkOut} onChange={h(i, "checkOut")} placeholder="Oct 19, 11:00" /></Field>
              <Field label="Booking reference"><Input value={hotel.bookingRef} onChange={h(i, "bookingRef")} /></Field>
              <div className="sm:col-span-2">
                <RoomBoard
                  rooms={hotel.roomAssign || []}
                  photographers={event.photographers}
                  onChange={setHotelRooms(i)}
                  assignedElsewhere={assignedInOtherHotels(i)}
                />
              </div>
              <Field label="Breakfast"><Input value={hotel.breakfast} onChange={h(i, "breakfast")} placeholder="06:00–10:00, Lobby level" /></Field>
              <Field label="Parking"><Input value={hotel.parking} onChange={h(i, "parking")} /></Field>
              <Field label="Notes" className="sm:col-span-2">
                <Textarea value={hotel.notes} onChange={h(i, "notes")} rows={2} />
              </Field>
            </div>
          </div>
        ))}
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
