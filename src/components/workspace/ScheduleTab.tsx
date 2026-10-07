"use client";

import { useState } from "react";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { Button, Card, CardHeader, Empty, Input } from "@/components/ui";
import { uid } from "@/lib/utils";
import type { ScheduleItem } from "@/types";
import type { TabProps } from "./EventWorkspace";

export default function ScheduleTab({ event, patch, saving }: TabProps) {
  const [items, setItems] = useState<ScheduleItem[]>(event.schedule);
  const [dirty, setDirty] = useState(false);

  function update(i: number, k: keyof ScheduleItem, val: string) {
    setItems((s) => s.map((x, j) => (j === i ? { ...x, [k]: val } : x)));
    setDirty(true);
  }

  function add() {
    setItems((s) => [...s, { id: uid(), day: "Race day", time: "", title: "", detail: "" }]);
    setDirty(true);
  }

  function remove(i: number) {
    setItems((s) => s.filter((_, j) => j !== i));
    setDirty(true);
  }

  const days = [...new Set(items.map((i) => i.day || "Schedule"))];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader
          title="Event schedule"
          icon={<CalendarClock size={15} className="text-blue-600" />}
          action={
            <div className="flex gap-2">
              {dirty && (
                <Button size="sm" variant="accent" loading={saving} onClick={() => patch({ schedule: items }).then((ok) => ok && setDirty(false))}>
                  Save
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={add}>
                <Plus size={14} /> Add item
              </Button>
            </div>
          }
        />
        <div className="p-4">
          {items.length === 0 ? (
            <Empty
              icon={<CalendarClock size={26} />}
              title="No schedule yet"
              hint="Add briefing times, race start, cutoffs, debriefs — photographers see this on the shared page."
              action={
                <Button size="sm" variant="accent" onClick={add}>
                  <Plus size={14} /> Add first item
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {days.map((day) => (
                <div key={day}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {day}
                  </p>
                  <div className="space-y-2">
                    {items.map((it, i) =>
                      (it.day || "Schedule") === day ? (
                        <div
                          key={it.id}
                          className="grid items-center gap-2 rounded-md border border-slate-200 bg-slate-50/50 p-2 sm:grid-cols-[130px_90px_1fr_1fr_auto]"
                        >
                          <Input
                            value={it.day}
                            onChange={(e) => update(i, "day", e.target.value)}
                            placeholder="Day"
                            className="h-8 text-xs"
                          />
                          <Input
                            value={it.time}
                            onChange={(e) => update(i, "time", e.target.value)}
                            placeholder="06:30"
                            className="h-8 text-xs"
                          />
                          <Input
                            value={it.title}
                            onChange={(e) => update(i, "title", e.target.value)}
                            placeholder="Team briefing"
                            className="h-8 text-xs font-medium"
                          />
                          <Input
                            value={it.detail}
                            onChange={(e) => update(i, "detail", e.target.value)}
                            placeholder="Details…"
                            className="h-8 text-xs"
                          />
                          <button
                            onClick={() => remove(i)}
                            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
