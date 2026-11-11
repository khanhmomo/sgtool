import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  ImageIcon,
  Inbox,
  Library,
  Megaphone,
  Route,
  Search,
  Settings,
  Share2,
  Target,
  Trash2,
  Users,
  Building2,
  Zap,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import TutorialNav from "./TutorialNav";

export const metadata = { title: "Tutorial — Sportograf TL Tool" };

/* ── Visual helpers ────────────────────────────────────────────────────── */

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

function Chip({ a, amber }: { a: string; amber?: boolean }) {
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${
        amber ? "bg-amber-400 text-slate-900" : "bg-slate-900 text-white"
      }`}
    >
      {a}
    </span>
  );
}

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
        <div className={`grid gap-4 p-4 ${visual ? "md:grid-cols-2" : ""}`}>
          <div className="space-y-3 text-sm text-slate-700">{children}</div>
          {visual && <div className="self-start md:sticky md:top-24">{visual}</div>}
        </div>
      </Card>
    </section>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="pt-1 text-sm font-bold text-slate-900">{children}</h3>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[9px] font-bold text-white">
        {n}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

const NAV = [
  { id: "start", label: "Getting started" },
  { id: "create", label: "Create an event" },
  { id: "tabs", label: "Workspace tabs" },
  { id: "briefing", label: "Briefing" },
  { id: "info", label: "Information" },
  { id: "team", label: "Team" },
  { id: "tactic-outdoor", label: "Tactic — outdoor" },
  { id: "tactic-hyrox", label: "Tactic — HYROX & indoor" },
  { id: "course", label: "Course & Positions" },
  { id: "files", label: "Files" },
  { id: "checklist", label: "Checklist" },
  { id: "requests", label: "Requests" },
  { id: "settings", label: "Settings" },
  { id: "share", label: "Sharing" },
  { id: "bookshelf", label: "Bookshelf" },
  { id: "other", label: "Search & tips" },
];

export default function TutorialPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
          Tutorial
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Everything you need to plan an event and share it with your photographers.
          Everything autosaves — there is no save button.
        </p>
      </div>

      <TutorialNav items={NAV} variant="bar" />

      <div className="flex items-start gap-6">
        <TutorialNav items={NAV} variant="side" />

        <div className="min-w-0 flex-1 space-y-4">
          <Section id="start" icon={<BookOpen size={15} className="text-blue-600" />} title="Getting started">
            <Ul>
              <li>
                <b>Your account</b> — log in with the email and password your admin gave
                you. Your <b>acronym</b> (e.g. AKT) identifies you to photographers and
                across the tool.
              </li>
              <li>
                <b>Dashboard</b> — all events you own or co-lead, with status badges
                (Planning → Ready → Live → Completed → Archived).
              </li>
              <li>
                <b>Events</b> — the full list with filters. <b>New event</b> creates one.
              </li>
              <li>
                <b>Autosave</b> — every tab saves ~1 second after you stop typing. Watch
                for &quot;Saving…&quot; in the tab bar; a red message means a save failed.
              </li>
            </Ul>
          </Section>

          <Section id="create" icon={<CalendarDays size={15} className="text-blue-600" />} title="Create an event"
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
                </div>
              </Mock>
            }
          >
            <p>
              Go to <b>Events → New event</b> and fill in name, type, organizer,
              start/end dates, location and country.
            </p>
            <Ul>
              <li>
                <b>Type matters</b> — it decides the tactic editor: HYROX and Fitness
                Indoor get their own layouts (no course map tab); everything else uses
                the standard spot-table tactic.
              </li>
              <li>
                <b>End date</b> — set it for multi-day events; the Tactic tab seeds one
                table per date automatically.
              </li>
              <li>
                <b>Previous-year best-of link</b> (optional) — shows last year&rsquo;s
                Sportograf gallery to photographers as reference.
              </li>
            </Ul>
          </Section>

          <Section id="tabs" icon={<ClipboardList size={15} className="text-blue-600" />} title="Workspace tabs">
            <p>Every event opens into a tabbed workspace:</p>
            <Ul>
              <li><b>Overview</b> — header, share button, section cards, key operational info.</li>
              <li><b>Briefing</b> — Markdown welcome note shown to photographers first.</li>
              <li><b>Information</b> — venue, hotels, room assignments.</li>
              <li><b>Team</b> — photographer roster + equipment, CSV import.</li>
              <li><b>Tactic</b> — spot/station assignments per day or category, publish control.</li>
              <li><b>Course &amp; Positions</b> — GPX map legs, photographer spots, pre-spots.</li>
              <li><b>Files</b> — uploads with photographer-visibility toggles.</li>
              <li><b>Checklist</b> — grouped to-do lists with progress.</li>
              <li><b>Requests</b> — live inbox for photographer messages.</li>
              <li><b>Settings</b> — event details, co-leaders, share link, danger zone.</li>
            </Ul>
            <p className="text-xs text-slate-500">
              Your last-used tab per event is remembered when you reopen it.
            </p>
          </Section>

          <Section id="briefing" icon={<Megaphone size={15} className="text-blue-600" />} title="Briefing">
            <p>
              The welcome message photographers read first on the shared page. Write in
              Markdown (<code>#</code> headings, <code>-</code> bullets,{" "}
              <code>**bold**</code>, links); a live preview renders below.
            </p>
            <Ul>
              <li>
                <b>Import from Bookshelf</b> — drop in a saved template instead of
                rewriting the same briefing every race.
              </li>
              <li>Autosaves as you type.</li>
            </Ul>
          </Section>

          <Section id="info" icon={<Building2 size={15} className="text-blue-600" />} title="Information">
            <Ul>
              <li><b>Venue</b> — name, address, Google Maps link, meeting point.</li>
              <li><b>Hotel / Accommodation</b> — one or more hotels with check-in/out.</li>
              <li>
                <b>Room assignments</b> — drag acronym chips (or tap on mobile) into
                rooms; unassigned photographers wait in the pool at the top.
              </li>
            </Ul>
          </Section>

          <Section id="team" icon={<Users size={15} className="text-blue-600" />} title="Team"
            visual={
              <Mock caption="event → team → import from csv">
                <div className="rounded-md border border-slate-200 bg-white">
                  <table className="w-full text-left text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-[9px] uppercase text-slate-400">
                        <th className="px-2 py-1">Acronym</th>
                        <th className="px-2 py-1">Name</th>
                        <th className="px-2 py-1">Role</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      <tr className="border-b border-slate-50">
                        <td className="px-2 py-1"><Chip a="AKT" /></td>
                        <td className="px-2 py-1">Khanh Tran</td>
                        <td className="px-2 py-1">Team Leader</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1"><Chip a="MJD" /></td>
                        <td className="px-2 py-1">Minh Do</td>
                        <td className="px-2 py-1">Photographer</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <span className="text-[9px] text-emerald-600">
                  ✓ Imported 12 photographers — saved automatically
                </span>
              </Mock>
            }
          >
            <Ul>
              <li>
                <b>Add manually</b> or <b>Import from CSV</b> — needs an{" "}
                <code>Acronym</code> column; First/Last Name, Email, Phone, Cameras,
                Lenses, Flashes and Remote camera columns are picked up automatically.
                Duplicate acronyms merge equipment instead of duplicating.
              </li>
              <li>Tap a member&rsquo;s equipment icon to see their cameras and lenses.</li>
              <li>
                The <b>acronym</b> is what you assign in the Tactic tab — keep it short
                and unique.
              </li>
            </Ul>
          </Section>

          <Section id="tactic-outdoor" icon={<Target size={15} className="text-blue-600" />} title="Tactic — outdoor events (IRONMAN, Trail, Marathon…)"
            visual={
              <Mock caption="tactic → date tabs + categories">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="rounded-md bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white">Nov 13</span>
                  <span className="rounded-md bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">Nov 14</span>
                  <span className="rounded-md bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">100K</span>
                  <span className="rounded-md border border-dashed border-slate-300 bg-white px-2 py-1 text-[9px] font-semibold text-slate-500">+ Tactic</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Category</span>
                  <span className="rounded bg-slate-900 px-2 py-0.5 text-[9px] font-semibold text-white">Full race</span>
                  <span className="rounded bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-600 ring-1 ring-slate-200">Kids race</span>
                </div>
                <div className="rounded-md border border-slate-200 bg-white">
                  <table className="w-full text-left text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-[9px] uppercase text-slate-400">
                        <th className="px-2 py-1">Spot</th>
                        <th className="px-2 py-1">Photographer</th>
                        <th className="px-2 py-1">Arrival</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      <tr className="border-b border-slate-50">
                        <td className="px-2 py-1 font-semibold">Swim In</td>
                        <td className="px-2 py-1"><Chip a="MJD" /></td>
                        <td className="px-2 py-1">05:45</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1 font-semibold">Finish Line</td>
                        <td className="px-2 py-1"><Chip a="PTH" /></td>
                        <td className="px-2 py-1">09:00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Mock>
            }
          >
            <H>Tactic tabs — dates and named categories</H>
            <Ul>
              <li>
                <b>Date tabs</b> — multi-day events auto-create one tactic per event
                date. Each has its own rows, call time, day note and publish state.
              </li>
              <li>
                <b>+ Tactic</b> — re-add a removed event date, or create a{" "}
                <b>custom named tab</b> like &quot;100K&quot; or &quot;50K&quot;. Named
                tabs get optional start/end date pickers (for categories racing across
                days) and work on single-day events too.
              </li>
              <li>
                <b>Pencil / ×</b> on each pill — rename a tab (dates can also get a
                display name) or remove it. Removing deletes that tab&rsquo;s rows —
                confirm carefully.
              </li>
              <li>
                <b>Copy day from…</b> — clones another tab&rsquo;s full tactic (rows,
                call time, note, categories) into the active tab.
              </li>
            </Ul>
            <H>Race categories inside a day</H>
            <Ul>
              <li>
                <b>Category row</b> — &quot;Race&quot; is the main table; add more with
                <b> + Category</b> (e.g. &quot;Kids race&quot;) for races sharing the
                same date. The pencil renames any category, including the main table.
              </li>
              <li>Every category keeps its own spot table; publish stays per-tab.</li>
            </Ul>
            <H>Spot table</H>
            <Ul>
              <li>
                <b>Add spot</b> / <b>IRONMAN skeleton</b> — pre-fills Swim In → Finish
                Line. Reorder with the arrows; row colors help scanning.
              </li>
              <li>
                <b>Spot</b> can be a free text or a map position linked from the Course
                tab; <b>Photographer</b> takes acronyms (comma-separate several).
              </li>
              <li>
                <b>Call time</b> and <b>Day note</b> sit below the day pills —
                per-tab.
              </li>
            </Ul>
            <H>Publish</H>
            <Ul>
              <li>
                <Eye size={12} className="inline" /> <b>Toggle per tab</b> — hidden
                until you flip to Published. Photographers see only published tabs,
                each as a pill on their page.
              </li>
            </Ul>
          </Section>

          <Section id="tactic-hyrox" icon={<Zap size={15} className="text-blue-600" />} title="Tactic — HYROX & Fitness Indoor"
            visual={
              <Mock caption="hyrox tactic → shifts + stations">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-medium text-slate-500">Day:</span>
                  <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[9px] font-semibold text-white">Nov 13</span>
                  <span className="rounded-md bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-600 ring-1 ring-slate-200">Nov 14</span>
                </div>
                <div className="flex gap-1">
                  <span className="rounded bg-slate-900 px-2 py-0.5 text-[9px] font-bold text-white">Shift 1</span>
                  <span className="rounded bg-white px-2 py-0.5 text-[9px] font-bold text-slate-600 ring-1 ring-slate-200">Shift 2</span>
                </div>
                <div className="rounded-md border border-slate-200 bg-white">
                  <table className="w-full text-left text-[9px]">
                    <thead>
                      <tr className="bg-[#FFED00] text-[8px] uppercase text-slate-900">
                        <th className="px-2 py-1">Station</th>
                        <th className="px-2 py-1">Photographers</th>
                        <th className="px-2 py-1">Cover</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      <tr className="border-b border-slate-50">
                        <td className="px-2 py-1 font-bold">1. SkiErg</td>
                        <td className="px-2 py-1"><Chip a="MJD" /></td>
                        <td className="px-2 py-1"><Chip a="AKT" /></td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1 font-bold">Farmers Carry</td>
                        <td className="px-2 py-1"><Chip a="VQN" amber /> <span className="text-[8px] font-bold text-amber-600">LS</span></td>
                        <td className="px-2 py-1 text-slate-300">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Mock>
            }
          >
            <H>HYROX day plans</H>
            <Ul>
              <li>
                <b>Day pills</b> — one plan per event date; publish each day
                separately. Saved days outside the event range stay visible (amber
                pill) so nothing is silently lost if dates change.
              </li>
              <li>
                <b>Call time</b> per day; <b>Day note</b> for logistics;{" "}
                <b>Clear this day&rsquo;s tactic</b> resets a day.
              </li>
            </Ul>
            <H>Shifts &amp; stations</H>
            <Ul>
              <li>
                The race splits into <b>shifts</b> — each shift is a full station table
                (SkiErg 1 → Wall Ball 8, plus Finish, Hero Wall, LS Arch). Add/remove
                shifts as needed; clone one shift into another to reuse assignments.
              </li>
              <li>
                <b>Photographers cell</b> — drag or tap acronym chips into a station.
                Non-team names and external-crew stations (Farmers Carry, LS Arch)
                render as amber <b>LS</b> chips; the LS column is for local-support
                crew.
              </li>
              <li>
                <b>Cover</b> — jumpers covering a station during breaks (blue chips).
                Cover assignments never trigger duplicate-station alerts.
              </li>
              <li>
                <b>Breaks</b> per station row — free-form time ranges; stations 1–3
                additionally get the shared <b>break schedule</b> matrix below (they
                self-cover, no jumpers).
              </li>
            </Ul>
            <H>Switch schedule</H>
            <Ul>
              <li>
                Rotation groups — photographers move station-to-station (P1 → P2&rsquo;s
                station, and so on). Add groups and columns; shown on the photographer
                page as a compact table.
              </li>
            </Ul>
            <H>Duplicate-station alert</H>
            <Ul>
              <li>
                A sidebar warns when the same team member is assigned to the same
                station on multiple days — LS crew and cover never alert.
              </li>
            </Ul>
            <H>Fitness Indoor</H>
            <Ul>
              <li>
                Uses the standard date-tab tactic (like outdoor events) with a{" "}
                <b>Station template</b> generator (Station 1–10, Finish, Hero Wall) and
                an <b>LS</b> column per row for local-support crew.
              </li>
            </Ul>
          </Section>

          <Section id="course" icon={<Route size={15} className="text-blue-600" />} title="Course & Positions">
            <Ul>
              <li>
                Upload the official <b>GPX</b> (or KMZ) course file — legs, distance
                and elevation chart render automatically on the map.
              </li>
              <li>
                <b>Positions</b> — where photographers stand. Click the map or paste a
                Google Maps link; the tool reports which leg and km it sits on.
              </li>
              <li>
                Loop courses can offer multiple distances per spot — pick the right
                ones.
              </li>
              <li>
                Each position has a <b>copy line</b> button producing a compact text to
                send photographers, plus a Street View preview.
              </li>
              <li><b>Pre-spots</b> — extra landmarks (parking, entrances) on the map.</li>
            </Ul>
            <p className="text-xs text-slate-500">
              Hidden for HYROX and Fitness Indoor events — they have no course map.
            </p>
          </Section>

          <Section id="files" icon={<FolderOpen size={15} className="text-blue-600" />} title="Files"
            visual={
              <Mock caption="event → files">
                <div className="space-y-1">
                  {[
                    ["Course_map_2026.pdf", true],
                    ["internal_budget.xlsx", false],
                  ].map(([n, vis]) => (
                    <div
                      key={n as string}
                      className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5"
                    >
                      {String(n).endsWith(".pdf") ? (
                        <FileText size={13} className="text-red-500" />
                      ) : (
                        <ImageIcon size={13} className="text-blue-500" />
                      )}
                      <span className="flex-1 truncate text-[10px] font-semibold text-slate-800">{n}</span>
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
                Upload PDFs, images and GPX with a category (map, briefing, venue,
                hotel) and optional description.
              </li>
              <li>
                The <Eye size={12} className="inline" /> toggle controls visibility on
                the photographer page — hide drafts and internal docs.
              </li>
              <li>Photographers preview PDFs and photos directly on their phones.</li>
            </Ul>
          </Section>

          <Section id="checklist" icon={<CheckSquare size={15} className="text-blue-600" />} title="Checklist">
            <Ul>
              <li>
                Create groups like PRE-EVENT / RACE DAY / POST-EVENT and tick items
                off — the progress bar tracks completion.
              </li>
              <li>
                <b>Import from Bookshelf</b> pulls in checklist templates saved once
                and reused every event.
              </li>
            </Ul>
          </Section>

          <Section id="requests" icon={<Inbox size={15} className="text-blue-600" />} title="Requests">
            <p>
              Photographers can message you from the shared event page — new requests
              appear here in near real-time.
            </p>
            <Ul>
              <li>Click a request to open it (marks it Read).</li>
              <li>Accept or decline, and leave a reply note for the photographer.</li>
            </Ul>
          </Section>

          <Section id="settings" icon={<Settings size={15} className="text-blue-600" />} title="Settings">
            <Ul>
              <li><b>Event details</b> — same fields as creation, incl. status.</li>
              <li>
                <b>Team leaders</b> — add co-leaders with full edit access (useful when
                two TLs split an event).
              </li>
              <li>
                <b>Previous-year best-of</b> — Sportograf gallery link shown to
                photographers.
              </li>
              <li>
                <b>Share link</b> — enable, copy, rotate (old URL dies) or revoke.
              </li>
              <li><b>Danger zone</b> — permanently delete the event.</li>
            </Ul>
          </Section>

          <Section id="share" icon={<Share2 size={15} className="text-blue-600" />} title="Sharing with photographers"
            visual={
              <Mock caption="photographer view — /e/5cf53876">
                <div className="mx-auto max-w-[220px] overflow-hidden rounded-xl border border-slate-300 bg-white">
                  <div className="bg-slate-950 p-2.5 text-white">
                    <p className="text-[10px] font-bold">TransLantau by UTMB 2026</p>
                    <p className="text-[8px] text-slate-400">Nov 13–15 · Lantau, Hong Kong</p>
                  </div>
                  <div className="flex gap-1 border-b border-slate-100 px-2 py-1.5">
                    {["Briefing", "Venue", "Tactic", "Files"].map((t, i) => (
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
                      published tabs only · read-only
                    </p>
                  </div>
                </div>
              </Mock>
            }
          >
            <Step n={1}>
              Click <b>Share Event</b> on the Overview tab (or enable in Settings) — you
              get a link like <code>/e/abc123</code>; send it via WhatsApp.
            </Step>
            <Step n={2}>
              Photographers need <b>no account</b> — the page is read-only and
              mobile-first: Briefing, Venue, published Tactic tabs (with category
              tables), Course map, Files, Hotel, Team, Best-of.
            </Step>
            <Step n={3}>
              Publish deliberately — unpublished tactic tabs and hidden files stay
              invisible.
            </Step>
            <Step n={4}>
              Leaked link? Rotate it in Settings — the old URL stops working.
            </Step>
          </Section>

          <Section id="bookshelf" icon={<Library size={15} className="text-blue-600" />} title="Bookshelf">
            <p>
              Your reusable template library: briefing texts, checklists, notes and
              guides saved once and imported into any event from the Briefing or
              Checklist tabs. Supports Markdown; checklist templates get a
              point-and-click editor.
            </p>
          </Section>

          <Section id="other" icon={<Search size={15} className="text-blue-600" />} title="Files, Search & tips">
            <Ul>
              <li><b>Files</b> (sidebar) — every file across all your events in one place.</li>
              <li><b>Search</b> (top bar) — find events, positions, tactics and files.</li>
              <li>
                Dates are fixed to the event — photographers everywhere see the same
                days.
              </li>
              <li>Your last-used tab per event is remembered when you reopen it.</li>
              <li>
                Before race day, open &quot;Photographer View&quot; on your phone and
                check what the team will actually see.
              </li>
            </Ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
