import { NextResponse } from "next/server";
import path from "path";
import ExcelJS from "exceljs";
import { connectDB } from "@/lib/db";
import { Event } from "@/lib/models";
import { requireUser } from "@/auth";
import type {
  HyroxDayPlan, HyroxSwitchGroup, HyroxBreakRow, Photographer,
} from "@/types";

type Ctx = { params: Promise<{ id: string }> };

/** Template DAY-sheet station rows (B column labels, fixed layout) */
const DAY_ROWS: Record<string, number> = {
  skierg: 2, "sled push": 3, "sled pull": 4, rowing: 5, "farmers carry": 6,
  "sandbag lunges": 7, "wall ball": 8, finish: 9, "hero wall": 10, "ls arch": 11,
};
const dayRow = (station: string) => DAY_ROWS[station.toLowerCase().replace(/\s*\(optional\)\s*/g, "").trim()];

/** BREAKS sheet block layout: rows per (shift, station) */
const BREAK_BLOCKS: Record<number, Record<string, number>> = {
  0: { skierg: 1, "sled push": 4, "sled pull": 7 },
  1: { skierg: 10, "sled push": 13, "sled pull": 16 },
};

/** CONTROL TOWER station columns I–P */
const TOWER_COLS: [string, number][] = [
  ["skierg", 9], ["sled push", 10], ["sled pull", 11], ["rowing", 12],
  ["sandbag lunges", 13], ["wall ball", 14], ["finish", 15], ["hero wall", 16],
];

const norm = (s: string) => s.toLowerCase().replace(/\s*\(optional\)\s*/g, "").trim();
const joinNames = (a: string[] | undefined) => (a || []).filter(Boolean).join(", ");
const firstLast = (n: string) => {
  const i = n.trim().indexOf(" ");
  return i < 0 ? [n.trim(), ""] : [n.trim().slice(0, i), n.trim().slice(i + 1)];
};

function fillDaySheet(ws: ExcelJS.Worksheet, day: HyroxDayPlan) {
  const shifts = day.tactic.shifts || [];
  for (const [si, stns] of shifts.entries()) {
    // Template supports two photographer columns: C = shift 1, I = "until the end"
    const col = si === 0 ? 3 : 9;
    const brkCol = si === 0 ? 4 : 10;
    const covCol = si === 0 ? 5 : 11;
    for (const st of stns) {
      const r = dayRow(st.station);
      if (!r) continue;
      const names = joinNames(st.photographers);
      const extra = si >= 2 ? `Shift ${si + 1}: ${names}` : "";
      if (si < 2) {
        if (names) ws.getCell(r, col).value = names;
      } else if (extra) {
        ws.getCell(r, 9).value = [ws.getCell(r, 9).value, extra].filter(Boolean).join("\n");
      }
      // LS crew: LS Arch row keeps the crew names in column B
      if (norm(st.station) === "ls arch" && st.ls?.length) {
        ws.getCell(11, 2).value = joinNames(st.ls);
      }
      if (joinNames(st.cover)) ws.getCell(r, covCol).value = joinNames(st.cover);
      // Break windows: per-station ranges (station Break column) + shared table rows (stations 1-3)
      const own = Array.isArray(st.breaks)
        ? (st.breaks as { start?: string; end?: string }[]).filter((b) => b.start && b.end).map((b) => `${b.start}-${b.end}`)
        : [];
      const table = day.tactic.breaks?.[si];
      const rows = table?.rows?.[st.station] || table?.rows?.[norm(st.station)] || [];
      const timed = rows.filter((b: HyroxBreakRow) => b.start && b.end);
      const all = [...own, ...timed.map((b: HyroxBreakRow) => `${b.start}-${b.end}${b.cover ? `\n${b.cover}` : ""}`)];
      if (all.length) ws.getCell(r, brkCol).value = all.join("\n");
      // Station note goes under the station name area (F for shift 1 context)
      if (st.note && si === 0) {
        const cur = ws.getCell(r, 6).value;
        ws.getCell(r, 6).value = cur ? `${cur}\n${st.note}` : st.note;
      }
    }
  }
  if (day.callTime) {
    const t = ws.getCell("A1");
    if (!t.value) t.value = `CALL ${day.callTime}`;
  }
}

function fillSwitchSheet(ws: ExcelJS.Worksheet, groups: HyroxSwitchGroup[]) {
  // Our groups are named (e.g. "Finish", "Herowall") — write them
  // sequentially into the lettered rows, name in col A, chain across B–I.
  groups.slice(0, 9).forEach((g, i) => {
    const r = 2 + i;
    ws.getCell(r, 1).value = g.name;
    g.photographers.slice(0, 8).forEach((p, j) => {
      ws.getCell(r, 2 + j).value = p;
    });
  });
}

function fillBreaksSheet(ws: ExcelJS.Worksheet, day: HyroxDayPlan) {
  (day.tactic.breaks || []).forEach((table, si) => {
    const blocks = BREAK_BLOCKS[si];
    if (!blocks || !table?.rows) return;
    for (const [station, rows] of Object.entries(table.rows)) {
      const r = blocks[norm(station)];
      const timed = rows.filter((b: HyroxBreakRow) => b.start && b.end);
      if (!r || !timed.length) continue;
      timed.forEach((b: HyroxBreakRow, i) => {
        if (i < 9) ws.getCell(r + 1, 2 + i).value = `${b.start}-${b.end}${b.cover ? `\n${b.cover}` : ""}`;
      });
    }
  });
}

function fillTowerSheet(ws: ExcelJS.Worksheet, team: Photographer[], day: HyroxDayPlan | undefined) {
  const assignment = new Map<string, Set<number>>();
  if (day) {
    for (const sh of day.tactic.shifts || []) {
      for (const st of sh) {
        const col = TOWER_COLS.find(([n]) => n === norm(st.station))?.[1];
        if (col == null) continue;
        for (const p of st.photographers || []) {
          assignment.set(p, (assignment.get(p) || new Set()).add(col));
        }
      }
    }
  }
  const startRow = 3; // row 1 = headers, row 2 = side score block headers
  team.forEach((p, i) => {
    const r = startRow + i;
    ws.getCell(r, 1).value = p.acronym;
    ws.getCell(r, 8).value = p.name;
    if (p.cameras) ws.getCell(r, 2).value = p.cameras;
    if (p.lenses) ws.getCell(r, 3).value = p.lenses;
    if (p.flashes) ws.getCell(r, 5).value = p.flashes;
    for (const c of assignment.get(p.acronym || p.name) || []) ws.getCell(r, c).value = 1;
  });
}

function fillCrewSheet(ws: ExcelJS.Worksheet, team: Photographer[]) {
  team.forEach((p, i) => {
    const r = 4 + i; // headers at row 3
    const [first, last] = firstLast(p.name || "");
    ws.getCell(r, 1).value = p.acronym;
    ws.getCell(r, 2).value = first;
    ws.getCell(r, 3).value = last;
    if (p.cameras) ws.getCell(r, 4).value = p.cameras;
    if (p.lenses) ws.getCell(r, 5).value = p.lenses;
    if (p.flashes) ws.getCell(r, 6).value = p.flashes;
  });
}

/** Clone a worksheet (unofficial but reliable via model copy) — for multi-day events */
function cloneSheet(wb: ExcelJS.Workbook, src: ExcelJS.Worksheet, name: string) {
  const model = JSON.parse(JSON.stringify(src.model)) as ExcelJS.WorksheetModel;
  delete (model as { name?: string }).name;
  delete (model as { id?: number }).id;
  const ws = wb.addWorksheet();
  ws.model = model;
  ws.name = name;
  return ws;
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await connectDB();
  const isAdmin = (user as { role?: string }).role === "admin";
  const event = await Event.findOne(
    isAdmin ? { _id: id } : { _id: id, $or: [{ ownerId: (user as { id: string }).id }, { teamLeaders: (user as { id: string }).id }] }
  );
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(process.cwd(), "public", "momo.xlsx"));

  const team = (event.photographers || []) as unknown as Photographer[];
  const days = ((event.hyrox || []) as unknown as HyroxDayPlan[]).filter((d) => d.tactic?.shifts?.length);

  const daySheet = wb.getWorksheet("DAY 1");
  const switchSheet = wb.getWorksheet("SWITCH DAY 1");
  const breaksSheet = wb.getWorksheet("BREAKS 1,2,3 DAY 1");
  const tower = wb.getWorksheet("CONTROL TOWER");
  const crew = wb.getWorksheet("BASE CREW");
  const accom = wb.getWorksheet("ACCOMODATION");

  // Clone day sheets for extra days BEFORE filling (clones inherit empty cells)
  const extraDaySheets: { day?: ExcelJS.Worksheet; sw?: ExcelJS.Worksheet; br?: ExcelJS.Worksheet }[] = [];
  if (daySheet && days.length > 1) {
    for (let i = 1; i < days.length; i++) {
      extraDaySheets.push({
        day: cloneSheet(wb, daySheet, `DAY ${i + 1}`),
        sw: switchSheet ? cloneSheet(wb, switchSheet, `SWITCH DAY ${i + 1}`) : undefined,
        br: breaksSheet ? cloneSheet(wb, breaksSheet, `BREAKS 1,2,3 DAY ${i + 1}`) : undefined,
      });
    }
  }

  days.forEach((d, i) => {
    const t = i === 0 ? { day: daySheet, sw: switchSheet, br: breaksSheet } : extraDaySheets[i - 1];
    if (t.day) fillDaySheet(t.day, d);
    if (t.sw) fillSwitchSheet(t.sw, d.tactic.switchGroups || []);
    if (t.br) fillBreaksSheet(t.br, d);
  });
  if (tower) fillTowerSheet(tower, team, days[0]);
  if (crew) fillCrewSheet(crew, team);
  if (accom) {
    let r = 2;
    for (const h of (event.hotels || []) as { name?: string; roomAssign?: { room: string; members: string[] }[] }[]) {
      for (const ra of h.roomAssign || []) {
        for (const m of ra.members || []) {
          accom.getCell(r, 1).value = m;
          accom.getCell(r, 2).value = ra.room;
          if (h.name) accom.getCell(r, 3).value = h.name;
          r++;
        }
      }
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  const fname = `${String(event.name || "tactic").replace(/[^\w\- ]+/g, "").trim() || "tactic"}-tactic.xlsx`;
  return new Response(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
