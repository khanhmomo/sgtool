"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Target,
  Route,
  FolderOpen,
  CheckSquare,
  Settings,
  Megaphone,
  Inbox,
  Camera,
  Copy,
  Check,
  ExternalLink,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import type { EventDTO, FileDTO } from "@/types";
import BriefingTab from "./BriefingTab";
import InfoTab from "./InfoTab";
import TeamTab from "./TeamTab";
import TacticTab from "./TacticTab";
import CourseTab from "./CourseTab";
import FilesTab from "./FilesTab";
import ChecklistTab from "./ChecklistTab";
import CameraCheckTab from "./CameraCheckTab";
import RequestsTab from "./RequestsTab";
import SettingsTab from "./SettingsTab";

const TABS = [
  { id: "briefing", label: "Briefing", icon: Megaphone },
  { id: "info", label: "Information", icon: Building2 },
  { id: "team", label: "Team", icon: Users },
  { id: "tactic", label: "Tactic", icon: Target },
  { id: "course", label: "Course & Positions", icon: Route },
  { id: "files", label: "Files", icon: FolderOpen },
  { id: "checklist", label: "Checklist", icon: CheckSquare },
  { id: "camera", label: "Camera check", icon: Camera },
  { id: "requests", label: "Requests", icon: Inbox },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export interface TabProps {
  event: EventDTO;
  patch: (fields: Partial<EventDTO>) => Promise<boolean>;
  setEvent: React.Dispatch<React.SetStateAction<EventDTO>>;
  saving: boolean;
}

export default function EventWorkspace({
  event: initial,
  files: initialFiles,
  initialTab,
}: {
  event: EventDTO;
  files: FileDTO[];
  initialTab?: string;
}) {
  const router = useRouter();
  const [event, setEvent] = useState<EventDTO>(initial);
  const [files, setFiles] = useState<FileDTO[]>(initialFiles);
  // Always initialize deterministically (server === client) — the localStorage
  // fallback is applied in an effect after mount to avoid hydration mismatch
  const [tab, setTabState] = useState<TabId>(
    () => (TABS.find((t) => t.id === initialTab)?.id as TabId) || "info"
  );
  useEffect(() => {
    if (TABS.some((t) => t.id === initialTab)) return; // explicit ?tab= wins
    try {
      const saved = localStorage.getItem(`tl-tab-${initial.id}`);
      const t = TABS.find((x) => x.id === saved)?.id as TabId;
      if (t && t !== tab) setTabState(t);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setTab = useCallback(
    (t: TabId) => {
      setTabState(t);
      // Persist so a reload lands on the same tab (URL + client-side fallback)
      window.history.replaceState(null, "", `?tab=${t}`);
      try {
        localStorage.setItem(`tl-tab-${event.id}`, t);
      } catch {}
    },
    [event.id]
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Share link actions — live in the tab bar now that the overview tab is gone
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareUrl = event.shareSlug ? `/e/${event.shareSlug}` : null;
  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  async function share(action: string) {
    setSharing(true);
    try {
      const res = await fetch(`/api/events/${event.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) patch({ shareSlug: data.event.shareSlug });
    } finally {
      setSharing(false);
    }
  }

  // HYROX + Fitness Indoor have no course/GPX — hide the map tab entirely
  const noCourse = /hyrox|fitness\s*indoor/i.test(event.type);
  const visibleTabs = TABS.filter((t) => !(t.id === "course" && noCourse));

  // Count of in-flight PATCHes — live polling never applies server state while
  // a save is in flight, so typing is never reverted by a stale snapshot.
  const inFlightRef = useRef(0);

  const patch = useCallback(
    async (fields: Partial<EventDTO>) => {
      inFlightRef.current += 1;
      setSaving(true);
      setSaveError("");
      // optimistic local update
      setEvent((e) => ({ ...e, ...fields }));
      try {
        const res = await fetch(`/api/events/${event.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        const data = await res.json();
        if (!res.ok) {
          setSaveError(data.error || "Save failed.");
          return false;
        }
        setEvent(data.event);
        return true;
      } catch {
        setSaveError("Save failed. Check your connection.");
        return false;
      } finally {
        inFlightRef.current -= 1;
        // Accurate even with overlapping PATCHes — live-sync hooks key off this
        setSaving(inFlightRef.current > 0);
      }
    },
    [event.id]
  );

  // Live collaboration — poll the event every 3s so other team leaders' edits
  // appear automatically. Skipped while hidden or while a save is in flight;
  // applied only when updatedAt actually changed, so idle polls cost no re-render.
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden || inFlightRef.current > 0) return;
      try {
        const res = await fetch(`/api/events/${event.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.event || inFlightRef.current > 0) return;
        setEvent((cur) => (data.event.updatedAt === cur.updatedAt ? cur : data.event));
      } catch {
        // network blip — next tick retries
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [event.id]);

  const props: TabProps = { event, patch, setEvent, saving };

  return (
    <div>
      {/* Tab bar */}
      <div className="sticky top-[61px] z-20 -mx-3 mb-4 border-b border-slate-200 bg-slate-50/95 px-3 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex gap-1 overflow-x-auto py-2">
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === t.id
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-200"
                )}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
          <div className="ml-auto flex shrink-0 items-center gap-2 pl-3">
            {saving && <span className="text-xs text-slate-400">Saving…</span>}
            {saveError && <span className="text-xs font-medium text-red-600">{saveError}</span>}
            {shareUrl ? (
              <>
                <button
                  onClick={copyLink}
                  title="Copy the photographer link"
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                >
                  {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span className="hidden sm:inline">{copied ? "Copied!" : "Copy event link"}</span>
                </button>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open the photographer view"
                  className="flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  <ExternalLink size={13} />
                  <span className="hidden sm:inline">Photographer view</span>
                </a>
              </>
            ) : (
              <Button size="xs" variant="accent" loading={sharing} onClick={() => share("enable")}>
                <Share2 size={12} /> <span className="hidden sm:inline">Share event</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {tab === "briefing" && <BriefingTab {...props} />}
      {tab === "info" && <InfoTab {...props} />}
      {tab === "team" && <TeamTab {...props} />}
      {tab === "tactic" && <TacticTab {...props} />}
      {tab === "course" && !noCourse && <CourseTab {...props} />}
      {tab === "files" && <FilesTab {...props} files={files} setFiles={setFiles} />}
      {tab === "checklist" && <ChecklistTab {...props} />}
      {tab === "camera" && <CameraCheckTab {...props} />}
      {tab === "requests" && <RequestsTab {...props} />}
      {tab === "settings" && (
        <SettingsTab {...props} onDeleted={() => router.push("/dashboard")} />
      )}
    </div>
  );
}
