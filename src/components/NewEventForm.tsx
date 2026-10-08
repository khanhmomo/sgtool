"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardHeader, Field, Input, Notice, Select } from "@/components/ui";
import { DOC_CATEGORY_META } from "@/lib/design";
import type { TemplateDTO } from "@/types";

const EVENT_TYPES = [
  "IRONMAN", "IRONMAN 70.3", "Obstacle Race", "Marathon", "Trail Run", "HYROX",
  "Fitness Indoor", "Bike Race",
];

export default function NewEventForm({ templates }: { templates: TemplateDTO[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", type: "IRONMAN 70.3", date: "", endDate: "",
    location: "", country: "", organizer: "", website: "", templateId: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, templateId: form.templateId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create event.");
        return;
      }
      router.push(`/events/${data.event.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card>
        <CardHeader title="Event details" />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Event name" className="sm:col-span-2">
            <Input
              required
              value={form.name}
              onChange={set("name")}
              placeholder="IRONMAN 70.3 Shanghai 2026"
            />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={set("type")}>
              {EVENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Organizer">
            <Input value={form.organizer} onChange={set("organizer")} placeholder="IRONMAN Asia" />
          </Field>
          <Field label="Start date">
            <Input type="date" value={form.date} onChange={set("date")} />
          </Field>
          <Field label="End date">
            <Input type="date" value={form.endDate} onChange={set("endDate")} />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={set("location")} placeholder="Shanghai" />
          </Field>
          <Field label="Country">
            <Input value={form.country} onChange={set("country")} placeholder="China" />
          </Field>
          <Field label="Event website" className="sm:col-span-2">
            <Input value={form.website} onChange={set("website")} placeholder="https://…" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Start from template" />
        <div className="p-4">
          <Select value={form.templateId} onChange={set("templateId")}>
            <option value="">Create from scratch</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {DOC_CATEGORY_META[t.category]?.label || "Template"} — {t.title}
              </option>
            ))}
          </Select>
          <p className="mt-2 text-xs text-slate-500">
            The selected template is copied into the event — later edits to the template won&apos;t
            change this event.
          </p>
        </div>
      </Card>

      {error && <Notice kind="error">{error}</Notice>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" variant="accent" loading={loading}>
          Create Event
        </Button>
      </div>
    </form>
  );
}
