import { uid } from "@/lib/utils";
import type { ChecklistGroup } from "@/types";

/** Parse a markdown checklist template into groups:
 *  headings (# ## ###) → groups, `- [ ]` / `-` bullets → items. */
export function parseChecklist(body: string): ChecklistGroup[] {
  const groups: ChecklistGroup[] = [];
  let cur: ChecklistGroup | null = null;
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const head = line.match(/^#{1,4}\s+(.+)/);
    if (head) {
      cur = { id: uid(), title: head[1].replace(/\*\*/g, "").trim().toUpperCase(), items: [] };
      groups.push(cur);
      continue;
    }
    const item = line.match(/^[-*•]\s+(?:\[\s*[xX ]?\s*\]\s*)?(.+)/);
    const text = item ? item[1].trim() : line.replace(/^\d+[.)]\s*/, "").trim();
    if (!text) continue;
    if (!cur) {
      cur = { id: uid(), title: "CHECKLIST", items: [] };
      groups.push(cur);
    }
    const checked = /\[x\]/i.test(line);
    cur.items.push({ id: uid(), text: text.replace(/^\[\s*[xX ]?\s*\]\s*/, ""), done: checked });
  }
  return groups;
}

/** Serialize structured groups back to markdown (template body storage format). */
export function serializeChecklist(groups: ChecklistGroup[]): string {
  return groups
    .map(
      (g) =>
        `# ${g.title}\n` +
        g.items.map((it) => `- ${it.done ? "[x] " : ""}${it.text}`).join("\n")
    )
    .join("\n\n");
}
