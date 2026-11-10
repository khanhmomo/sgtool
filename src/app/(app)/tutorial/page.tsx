import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  ImageIcon,
  Inbox,
  Library,
  MapPin,
  Megaphone,
  Plus,
  Route,
  Search,
  Settings,
  Share2,
  Target,
  Trash2,
  Users,
  Building2,
  AlarmClock,
  Check,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui";

export const metadata = { title: "Tutorial — Sportograf TL Tool" };

/* ── Visual helpers ────────────────────────────────────────────────────── */

/** A framed "screenshot" mock — browser-chrome top bar + content. */
function Mock({ caption, children }: { caption?: string; children: React.ReactNode }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        {caption && (
          <span className="ml-2 truncate text-[10px] font-medium text-slate-400">{caption}</span>
        )}
      </div>
      <div className="space-y-2 p-3">{children}</div>
    </figure>
  );
}

/** Pill button that looks like the app's buttons. */
function MockBtn({
  accent,
  outline,
  children,
}: {
  accent?: boolean;
  outline?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
        accent
          ? "bg-slate-900 text-white"
          : outline
            ? "border border-slate-300 bg-white text-slate-700"
            : "bg-slate-100 text-slate-600"
      }`}
    >
      {children}
    </span>
  );
}

/** The publish/hide toggle from the Tactic tab, in both states. */
function MockToggle({ published }: { published: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`relative flex h-5 w-9 items-center rounded-full ${
          published ? "bg-emerald-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute flex h-4 w-4 items-center justify-center rounded-full bg-white shadow ${
            published ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        >
          {published ? (
            <Eye size={9} className="text-emerald-600" />
          ) : (
            <EyeOff size={9} className="text-slate-400" />
          )}
        </span>
      </span>
      <span
        className={`text-[10px] font-semibold ${published ? "text-emerald-600" : "text-slate-400"}`}
      >
        {published ? "Published" : "Hidden"}
      </span>
    </span>
  );
}

/** Day-tab pills like on the multi-day Tactic tab. */
function MockDayPill({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={`rounded-md px-2.5 py-1 text-[10px] font-semibold ${
        active
          ? "bg-slate-900 text-white"
          : "bg-white text-slate-600 ring-1 ring-slate-200"
      }`}
    >
      {label}
    </span>
  );
}

/** Photographer acronym chip used in room assignments / HYROX. */
function Chip({ a, dim }: { a: string; dim?: boolean }) {
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${
        dim ? "bg-slate-400" : "bg-slate-900"
      }`}
    >
      {a}
    </span>
  );
}

/** Section wrapper — text + visual side by side on desktop, stacked on mobile. */
function Section({
  id,
  icon,
  title,
  children,
  visual,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  visual?: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <Card>
        <CardHeader title={title} icon={icon} />
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div className="space-y-3 text-sm text-slate-700">{children}</div>
          {visual && <div className="self-start md:sticky md:top-24">{visual}</div>}
        </div>
      </Card>
    </section>
  );
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function TutorialPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
          Team Leader tutorial
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Everything you need to plan an event and share it with your photographers.
          Everything autosaves — there is no save button.
        </p>
      </div>

      <Section
        id="start"
        icon={<BookOpen size={15} className="text-blue-600" />}
        title="Getting started"
        visual={
          <Mock caption="sidebar — your way around">
            <div className="space-y-1 text-[11px] font-medium">
              {["Dashboard", "Events", "Bookshelf", "Files", "Tutorial", "Settings"].map(
                (n, i) => (
                  <div
                    key={n}
                    className={`rounded-md px-2.5 py-1.5 ${
                      i === 4 ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {n}
                  </div>
                )
              )}
            </div>
          </Mock>
        }
      >
        <Ul>
          <li>
            <b>Your account</b> — log in with the email and password your admin gave you.
            Your <b>acronym</b> (e.g. AKT) is how photographers and the tool refer to you.
          </li>
          <li>
            <b>Dashboard</b> — all events you own or co-lead, with status badges
            (Planning → Ready → Live → Completed → Archived).
          </li>
          <li>
            <b>Events</b> — the full event list with filters. <b>New event</b> creates one.
          </li>
          <li>
            <b>Autosave</b> — every tab saves ~1 second after you stop typing. Watch for
            &quot;Saving…&quot; in the tab bar.
          </li>
        </Ul>
      </Section>

      <Section
        id="create"
        icon={<CalendarDays size={15} className="text-blue-600" />}
        title="Create an event"
        visual={
          <Mock caption="events → new event">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-400">
                Event name — IRONMAN 70.3 Shanghai 2026
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-400">
                Type ▾ IRONMAN 70.3
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-400">
                Organizer
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-400">
                Start date
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-400">
                End date
              </div>
              <div className="col-span-2 flex justify-end gap-1.5">
                <MockBtn outline>Cancel</MockBtn>
                <MockBtn accent>Create Event</MockBtn>
              </div>
            </div>
          </Mock>
        }
      >
        <p>
          Go to <b>Events → New event</b> and fill in the basics: name, type, organizer,
          start/end dates, location and country.
        </p>
        <Ul>
          <li>
            The <b>type</b> decides which tactic editor you get — HYROX and Fitness
            Indoor have their own layouts and no course map tab.
          </li>
          <li>
            Set a correct <b>end date</b> for multi-day events — the Tactic tab builds
            one table per day from the date range.
          </li>
        </Ul>
      </Section>

      <Section
        id="overview"
        icon={<ClipboardList size={15} className="text-blue-600" />}
        title="Overview tab"
        visual={
          <Mock caption="event → overview">
            <div className="rounded-md bg-slate-950 p-3 text-white">
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-800">
                Ready
              </span>
              <p className="mt-1 text-sm font-bold">IRONMAN 70.3 Shanghai 2026</p>
              <p className="text-[10px] text-slate-400">IRONMAN 70.3 · Shanghai, China</p>
              <div className="mt-2 flex gap-1.5">
                <MockBtn outline>
                  <Copy size={10} /> Copy Event Link
                </MockBtn>
                <MockBtn accent>
                  <ExternalLink size={10} /> Photographer View
                </MockBtn>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                ["Information", true],
                ["Team", true],
                ["Tactic", false],
                ["Checklist", false],
              ].map(([l, filled]) => (
                <div
                  key={l as string}
                  className="rounded-md border border-slate-200 bg-white p-2"
                >
                  <span
                    className={`mb-1 block h-1.5 w-1.5 rounded-full ${
                      filled ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  />
                  <p className="text-[10px] font-semibold text-slate-800">{l}</p>
                </div>
              ))}
            </div>
          </Mock>
        }
      >
        <Ul>
          <li>Event header with dates, location, organizer and status.</li>
          <li>
            <b>Share Event</b> generates the photographer link (<code>/e/…</code>). Once
            shared you get <b>Copy Event Link</b> and a <b>Photographer View</b> preview.
          </li>
          <li>
            Section cards jump to each tab — a green dot means that section has content.
          </li>
          <li>
            &quot;Key operational info&quot; surfaces the meeting point, first schedule
            item and hotels.
          </li>
        </Ul>
      </Section>

      <Section
        id="briefing"
        icon={<Megaphone size={15} className="text-blue-600" />}
        title="Briefing"
        visual={
          <Mock caption="event → briefing">
            <div className="rounded-md border border-slate-200 bg-white p-2 font-mono text-[10px] leading-relaxed text-slate-600">
              <p className="font-bold text-slate-900"># Briefing</p>
              <p>- Meet 06:00 at venue main gate</p>
              <p>- <b>**Bring spare batteries**</b></p>
              <p>- Lunch provided 12:00–13:00</p>
            </div>
            <p className="text-center text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              renders as ↓
            </p>
            <div className="rounded-md border border-slate-200 bg-white p-2 text-[10px] leading-relaxed">
              <p className="text-xs font-bold text-slate-900">Briefing</p>
              <p>• Meet 06:00 at venue main gate</p>
              <p>• <b>Bring spare batteries</b></p>
              <p>• Lunch provided 12:00–13:00</p>
            </div>
          </Mock>
        }
      >
        <p>
          The welcome message photographers read first on the shared page. Write it in
          Markdown (<code>#</code> headings, <code>-</code> bullets, <code>**bold**</code>,
          links) and check the live preview underneath.
        </p>
        <p>
          Use <b>Import from Bookshelf</b> to drop in a saved template instead of
          rewriting the same briefing every race.
        </p>
      </Section>

      <Section
        id="info"
        icon={<Building2 size={15} className="text-blue-600" />}
        title="Information"
        visual={
          <Mock caption="event → information → room assignments">
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-2">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Unassigned
              </p>
              <div className="flex gap-1">
                <Chip a="MJD" />
                <Chip a="LHT" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-slate-200 bg-white p-2">
                <p className="mb-1 text-[10px] font-semibold text-slate-700">Room 1</p>
                <div className="flex gap-1">
                  <Chip a="AKT" />
                  <Chip a="PTH" />
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-2">
                <p className="mb-1 text-[10px] font-semibold text-slate-700">Room 2</p>
                <div className="flex gap-1">
                  <Chip a="VQN" />
                </div>
              </div>
            </div>
          </Mock>
        }
      >
        <Ul>
          <li><b>Venue</b> — name, address, map link, meeting point.</li>
          <li><b>Hotel / Accommodation</b> — one or more hotels with check-in/out.</li>
          <li>
            <b>Room assignments</b> — drag acronym chips (or tap them on mobile) into
            rooms. Unassigned photographers wait in the pool at the top.
          </li>
        </Ul>
      </Section>

      <Section
        id="team"
        icon={<Users size={15} className="text-blue-600" />}
        title="Team"
        visual={
          <Mock caption="event → team → import from csv">
            <div className="rounded-md border border-slate-200 bg-white">
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[9px] uppercase text-slate-400">
                    <th className="px-2 py-1">Acronym</th>
                    <th className="px-2 py-1">Name</th>
                    <th className="px-2 py-1">Role</th>
                    <th className="px-2 py-1">Phone</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  <tr className="border-b border-slate-50">
                    <td className="px-2 py-1"><Chip a="AKT" /></td>
                    <td className="px-2 py-1">Khanh Tran</td>
                    <td className="px-2 py-1">Team Leader</td>
                    <td className="px-2 py-1">+84 90…</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1"><Chip a="MJD" /></td>
                    <td className="px-2 py-1">Minh Do</td>
                    <td className="px-2 py-1">Photographer</td>
                    <td className="px-2 py-1">+84 91…</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-1.5">
              <MockBtn outline>Import from CSV</MockBtn>
              <span className="text-[9px] text-emerald-600">
                ✓ Imported 12 photographers — saved automatically
              </span>
            </div>
          </Mock>
        }
      >
        <Ul>
          <li>
            Add photographers manually, or use <b>Import from CSV</b> — the file needs an
            <code> Acronym</code> column; First/Last Name, Email, Phone, Cameras, Lenses,
            Flashes and Remote camera columns are picked up automatically.
          </li>
          <li>Tap the equipment icon on a member to see their cameras and lenses.</li>
          <li>
            The acronym is what you assign in the Tactic tab — keep it short and unique.
          </li>
        </Ul>
      </Section>

      <Section
        id="tactic"
        icon={<Target size={15} className="text-blue-600" />}
        title="Tactic"
        visual={
          <Mock caption="event → tactic">
            <div className="flex flex-wrap items-center gap-1">
              <MockDayPill label="Nov 13" active />
              <MockDayPill label="Nov 14" />
              <MockDayPill label="Nov 15" />
              <span className="ml-auto inline-flex items-center gap-1 text-[9px] text-slate-500">
                <AlarmClock size={10} /> Call time
                <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono">
                  05:30
                </span>
              </span>
            </div>
            <div className="rounded-md border border-slate-200 bg-white">
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[9px] uppercase text-slate-400">
                    <th className="px-2 py-1">Spot</th>
                    <th className="px-2 py-1">Photographer</th>
                    <th className="px-2 py-1">Lens</th>
                    <th className="px-2 py-1">Arrival</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  <tr className="border-b border-slate-50">
                    <td className="px-2 py-1 font-semibold">Swim In</td>
                    <td className="px-2 py-1"><Chip a="MJD" /></td>
                    <td className="px-2 py-1">24-70 / 16-35</td>
                    <td className="px-2 py-1">05:45</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-semibold">Finish Line</td>
                    <td className="px-2 py-1"><Chip a="PTH" /></td>
                    <td className="px-2 py-1">70-200</td>
                    <td className="px-2 py-1">09:00</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1.5">
              <span className="text-[10px] font-semibold text-slate-700">
                Photographer visibility
              </span>
              <div className="flex items-center gap-3">
                <MockToggle published={false} />
                <span className="text-slate-300">→</span>
                <MockToggle published />
              </div>
            </div>
          </Mock>
        }
      >
        <p>
          The core of race day: a table of <b>spots</b> (Swim In, Bike 3, Finish Line…)
          with photographer, lens, arrival time, note and optional map link.
        </p>
        <Ul>
          <li>
            <b>Multi-day events</b> get one table per day with day tabs, a call-time
            field, and <b>Copy day from…</b> to clone a previous day&rsquo;s tactic.
          </li>
          <li>
            Use <b>IRONMAN skeleton</b> / <b>Station template</b> to pre-fill standard
            spots, then reorder rows with the arrows. Row colors help scanning.
          </li>
          <li>
            <b>HYROX</b> events get a different editor: stations, shifts, switch
            schedules and break coverage.
          </li>
          <li>
            <b>Publish toggle</b> — a day&rsquo;s tactic is hidden from photographers
            until you flip it to Published. Publish each day separately.
          </li>
        </Ul>
      </Section>

      <Section
        id="course"
        icon={<Route size={15} className="text-blue-600" />}
        title="Course & Positions"
        visual={
          <Mock caption="event → course & positions">
            <div className="relative h-28 overflow-hidden rounded-md border border-slate-200 bg-emerald-50">
              {/* stylized course path */}
              <svg viewBox="0 0 200 90" className="absolute inset-0 h-full w-full">
                <path
                  d="M15 75 C 50 20, 90 80, 130 40 S 180 60, 190 20"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <MapPin size={14} className="absolute left-[28%] top-[30%] text-red-500" />
              <MapPin size={14} className="absolute left-[62%] top-[52%] text-red-500" />
              <MapPin size={14} className="absolute left-[80%] top-[18%] text-red-500" />
              <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
                Bike leg · 90 km
              </span>
            </div>
            <div className="space-y-1">
              {[
                ["B1", "Bike 1 · km 35.2", "16.1234, 108.2345"],
                ["B2", "Bike 2 · km 61.0", "16.1876, 108.3120"],
              ].map(([id, l, c]) => (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1"
                >
                  <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    {id}
                  </span>
                  <span className="flex-1 text-[10px] text-slate-600">{l}</span>
                  <span className="font-mono text-[9px] text-slate-400">{c}</span>
                  <Copy size={10} className="text-slate-400" />
                </div>
              ))}
            </div>
          </Mock>
        }
      >
        <Ul>
          <li>
            Upload the official <b>GPX</b> (or KMZ) course file — the map draws the legs
            and elevation chart automatically.
          </li>
          <li>
            <b>Positions</b> are where photographers stand. Click the map or paste a
            Google Maps link; the tool shows which leg and km it sits on.
          </li>
          <li>
            Loop courses offer multiple distances per spot — pick the right ones.
          </li>
          <li>
            Each position has a <b>copy line</b> button producing a compact text to send
            photographers, plus a Street View preview.
          </li>
          <li><b>Pre-spots</b> are extra landmarks (parking, entrances) on the map.</li>
        </Ul>
        <p className="text-xs text-slate-500">
          Not shown for HYROX and Fitness Indoor events — they have no course map.
        </p>
      </Section>

      <Section
        id="files"
        icon={<FolderOpen size={15} className="text-blue-600" />}
        title="Files"
        visual={
          <Mock caption="event → files">
            <div className="space-y-1">
              {[
                ["Course_map_2026.pdf", "Course / map", true],
                ["hotel_booking.jpg", "Hotel", true],
                ["internal_budget.xlsx", "Other", false],
              ].map(([n, c, vis]) => (
                <div
                  key={n as string}
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5"
                >
                  {String(n).endsWith(".pdf") ? (
                    <FileText size={13} className="text-red-500" />
                  ) : (
                    <ImageIcon size={13} className="text-blue-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-semibold text-slate-800">{n}</p>
                    <p className="text-[9px] text-slate-400">{c}</p>
                  </div>
                  {vis ? (
                    <Eye size={12} className="text-slate-500" />
                  ) : (
                    <EyeOff size={12} className="text-amber-500" />
                  )}
                  <Trash2 size={11} className="text-slate-300" />
                </div>
              ))}
            </div>
          </Mock>
        }
      >
        <Ul>
          <li>
            Upload PDFs, images and GPX files with a category (map, briefing, venue,
            hotel).
          </li>
          <li>
            The <Eye size={12} className="inline" /> toggle controls whether each file
            is visible on the photographer page — hide drafts and internal docs.
          </li>
          <li>Photographers can preview PDFs and photos directly on their phones.</li>
        </Ul>
      </Section>

      <Section
        id="checklist"
        icon={<CheckSquare size={15} className="text-blue-600" />}
        title="Checklist"
        visual={
          <Mock caption="event → checklist">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-2/3 rounded-full bg-blue-600" />
              </div>
              <span className="text-[9px] font-medium text-slate-500">8/12 done</span>
            </div>
            <div className="rounded-md border border-slate-200 bg-white">
              <p className="border-b border-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                Race day
              </p>
              {[
                ["Confirm call times with all photographers", true],
                ["Send WhatsApp group invite", true],
                ["Print position list backup", false],
              ].map(([t, done]) => (
                <div key={t as string} className="flex items-center gap-2 border-b border-slate-50 px-2 py-1.5 last:border-0">
                  <span
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
                      done ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
                    }`}
                  >
                    {done && <Check size={9} className="text-white" />}
                  </span>
                  <span
                    className={`text-[10px] ${done ? "text-slate-400 line-through" : "text-slate-700"}`}
                  >
                    {t}
                  </span>
                </div>
              ))}
            </div>
          </Mock>
        }
      >
        <Ul>
          <li>Create groups like PRE-EVENT / RACE DAY / POST-EVENT and tick items off.</li>
          <li>The progress bar shows how much is done — the Overview card counts it too.</li>
          <li>
            <b>Import from Bookshelf</b> pulls in checklist templates you save once and
            reuse every event.
          </li>
        </Ul>
      </Section>

      <Section
        id="requests"
        icon={<Inbox size={15} className="text-blue-600" />}
        title="Requests"
        visual={
          <Mock caption="event → requests">
            <div className="space-y-1">
              {[
                ["MJD", "Need review", "Can I swap Bike 2 with Run 1? My car…", "bg-amber-100 text-amber-800"],
                ["PTH", "Accepted", "Requesting hotel near finish line.", "bg-emerald-100 text-emerald-700"],
                ["VQN", "Declined", "Can I leave at 14:00?", "bg-red-100 text-red-700"],
              ].map(([a, st, t, cls]) => (
                <div
                  key={t as string}
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5"
                >
                  <Chip a={a as string} />
                  <span className={`rounded px-1 py-0.5 text-[8px] font-bold uppercase ${cls}`}>
                    {st}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[10px] text-slate-600">{t}</span>
                </div>
              ))}
            </div>
          </Mock>
        }
      >
        <p>
          Photographers can message you from the shared event page — new requests appear
          here in near real-time (the tab live-updates).
        </p>
        <Ul>
          <li>Click a request to open it (marks it Read).</li>
          <li>Accept or decline it, and leave a reply note for the photographer.</li>
        </Ul>
      </Section>

      <Section
        id="settings"
        icon={<Settings size={15} className="text-blue-600" />}
        title="Settings"
        visual={
          <Mock caption="event → settings">
            <div className="rounded-md border border-slate-200 bg-white p-2">
              <p className="mb-1 text-[10px] font-semibold text-slate-800">Team leaders</p>
              <div className="flex items-center gap-2">
                <Chip a="AKT" /> <span className="text-[10px] text-slate-600">Khanh Tran</span>
                <span className="ml-auto text-[8px] font-semibold uppercase text-slate-400">Creator</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Chip a="MJD" /> <span className="text-[10px] text-slate-600">Minh Do</span>
                <Plus size={10} className="ml-auto text-slate-400" />
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-2">
              <p className="mb-1 text-[10px] font-semibold text-slate-800">
                Photographer share link
              </p>
              <div className="flex items-center gap-1.5">
                <code className="flex-1 truncate rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[9px] text-slate-600">
                  /e/5cf53876
                </code>
                <MockBtn outline>
                  <Copy size={9} />
                </MockBtn>
              </div>
            </div>
            <div className="rounded-md border border-red-200 bg-white p-2">
              <p className="text-[10px] font-semibold text-red-700">Danger zone</p>
              <MockBtn outline>
                <Trash2 size={9} /> Delete event
              </MockBtn>
            </div>
          </Mock>
        }
      >
        <Ul>
          <li>Edit event details and status — same fields as creation.</li>
          <li>
            <b>Team leaders</b> — add co-leaders who get full edit access (useful when
            two TLs split an event).
          </li>
          <li>
            <b>Previous-year best-of</b> — paste a Sportograf event link to show last
            year&rsquo;s gallery to photographers as reference.
          </li>
          <li>
            <b>Share link</b> — enable, copy, rotate (new URL, old one dies) or revoke.
          </li>
          <li><b>Danger zone</b> — permanently delete the event.</li>
        </Ul>
      </Section>

      <Section
        id="share"
        icon={<Share2 size={15} className="text-blue-600" />}
        title="Sharing with photographers"
        visual={
          <Mock caption="photographer view — /e/5cf53876">
            <div className="mx-auto max-w-[220px] overflow-hidden rounded-xl border border-slate-300 bg-white">
              <div className="bg-slate-950 p-2.5 text-white">
                <p className="text-[10px] font-bold">TransLantau by UTMB 2026</p>
                <p className="text-[8px] text-slate-400">Nov 13–15 · Lantau, Hong Kong</p>
              </div>
              <div className="flex gap-1 overflow-hidden border-b border-slate-100 px-2 py-1.5">
                {["Briefing", "Venue", "Tactic", "Files", "Team"].map((t, i) => (
                  <span
                    key={t}
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-semibold ${
                      i === 2 ? "bg-slate-900 text-white" : "text-slate-500"
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="p-2">
                <div className="rounded-md border border-slate-200">
                  <table className="w-full text-left text-[8px]">
                    <tbody className="text-slate-700">
                      <tr className="border-b border-slate-50">
                        <td className="px-1.5 py-1 font-semibold">Start — Tai O</td>
                        <td className="px-1.5 py-1"><Chip a="MJD" /></td>
                      </tr>
                      <tr>
                        <td className="px-1.5 py-1 font-semibold">Finish — Mui Wo</td>
                        <td className="px-1.5 py-1"><Chip a="PTH" /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-1.5 text-center text-[7px] uppercase tracking-wider text-slate-400">
                  published day only · read-only
                </p>
              </div>
            </div>
          </Mock>
        }
      >
        <p>
          Click <b>Share Event</b> on the Overview tab (or enable sharing in Settings).
          You get a link like <code>/e/abc123</code> — send it via WhatsApp.
        </p>
        <Ul>
          <li>
            Photographers need <b>no account</b> — the page is read-only and
            mobile-first.
          </li>
          <li>
            They see: Briefing, Venue, <b>published</b> Tactic days, Course map, Files,
            Hotel, Team and Best-of gallery.
          </li>
          <li>
            Unpublished tactic days and hidden files stay invisible — publish
            deliberately.
          </li>
          <li>Leaked link? Rotate it in Settings → the old URL stops working.</li>
        </Ul>
      </Section>

      <Section
        id="bookshelf"
        icon={<Library size={15} className="text-blue-600" />}
        title="Bookshelf"
        visual={
          <Mock caption="bookshelf — reusable templates">
            <div className="space-y-1">
              {[
                ["Race day briefing", "briefing"],
                ["Pre-event checklist", "checklist"],
                ["HYROX station guide", "guide"],
              ].map(([t, c]) => (
                <div
                  key={t}
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5"
                >
                  <BookOpen size={12} className="text-slate-400" />
                  <span className="flex-1 text-[10px] font-semibold text-slate-800">{t}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-slate-500">
                    {c}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-center text-[9px] text-slate-400">
              ↓ imported into Briefing & Checklist tabs of any event
            </p>
          </Mock>
        }
      >
        <p>
          Your reusable template library. Save briefing texts, checklists, notes and
          guides once, then import them into any event from the Briefing or Checklist
          tabs. Supports Markdown, and checklist templates get a point-and-click editor.
        </p>
      </Section>

      <Section
        id="other"
        icon={<Search size={15} className="text-blue-600" />}
        title="Files, Search & tips"
        visual={
          <Mock caption="global search">
            <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5">
              <Search size={11} className="text-slate-400" />
              <span className="text-[10px] text-slate-400">
                Search events, tactics, files, positions…
              </span>
            </div>
            <div className="space-y-1">
              {[
                ["Event", "TransLantau by UTMB 2026"],
                ["Tactic", "Swim In — assigned MJD"],
                ["File", "Course_map_2026.pdf"],
              ].map(([k, v]) => (
                <div
                  key={v}
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1"
                >
                  <span className="w-10 shrink-0 rounded bg-slate-100 px-1 py-0.5 text-center text-[8px] font-bold uppercase text-slate-500">
                    {k}
                  </span>
                  <span className="truncate text-[10px] text-slate-600">{v}</span>
                </div>
              ))}
            </div>
          </Mock>
        }
      >
        <Ul>
          <li><b>Files</b> (sidebar) — every file across all your events in one place.</li>
          <li><b>Search</b> (top bar) — find events, positions, tactics and files.</li>
          <li>
            Dates are fixed to the event — photographers everywhere see the same days.
          </li>
          <li>Your last-used tab per event is remembered when you reopen it.</li>
          <li>
            Before race day, open &quot;Photographer View&quot; on your phone and check
            what the team will actually see.
          </li>
        </Ul>
      </Section>
    </div>
  );
}

