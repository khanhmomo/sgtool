"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Target,
  Route,
  FolderOpen,
  CheckSquare,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventDTO, FileDTO } from "@/types";
import OverviewTab from "./OverviewTab";
import InfoTab from "./InfoTab";
import TeamTab from "./TeamTab";
import TacticTab from "./TacticTab";
import CourseTab from "./CourseTab";
import FilesTab from "./FilesTab";
import ChecklistTab from "./ChecklistTab";
import SettingsTab from "./SettingsTab";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "info", label: "Information", icon: Building2 },
  { id: "team", label: "Team", icon: Users },
  { id: "tactic", label: "Tactic", icon: Target },
  { id: "course", label: "Course & Positions", icon: Route },
  { id: "files", label: "Files", icon: FolderOpen },
  { id: "checklist", label: "Checklist", icon: CheckSquare },
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
  const [tab, setTab] = useState<TabId>(
    (TABS.find((t) => t.id === initialTab)?.id as TabId) || "overview"
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // HYROX + Fitness Indoor have no course/GPX — hide the map tab entirely
  const noCourse = /hyrox|fitness\s*indoor/i.test(event.type);
  const visibleTabs = TABS.filter((t) => !(t.id === "course" && noCourse));

  const patch = useCallback(
    async (fields: Partial<EventDTO>) => {
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
        setSaving(false);
      }
    },
    [event.id]
  );

  const props: TabProps = { event, patch, setEvent, saving };

  return (
    <div>
      {/* Tab bar */}
      <div className="sticky top-[53px] z-20 -mx-3 mb-4 border-b border-slate-200 bg-slate-50/95 px-3 backdrop-blur md:top-[61px] md:-mx-6 md:px-6">
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
          </div>
        </div>
      </div>

      {tab === "overview" && <OverviewTab {...props} goTab={setTab} />}
      {tab === "info" && <InfoTab {...props} />}
      {tab === "team" && <TeamTab {...props} />}
      {tab === "tactic" && <TacticTab {...props} />}
      {tab === "course" && !noCourse && <CourseTab {...props} />}
      {tab === "files" && <FilesTab {...props} files={files} setFiles={setFiles} />}
      {tab === "checklist" && <ChecklistTab {...props} />}
      {tab === "settings" && (
        <SettingsTab {...props} onDeleted={() => router.push("/dashboard")} />
      )}
    </div>
  );
}
