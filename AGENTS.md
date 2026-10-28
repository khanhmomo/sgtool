<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project conventions

### Fixed dates — never shift by viewer timezone

Event dates and times belong to the **event**, not the person viewing the page. Every viewer anywhere in the world must see identical calendar dates/times.

- **Dates** are stored and handled as `YYYY-MM-DD` strings. When parsing for display or date math, append `T00:00:00` (local midnight) or `T12:00:00` (safe noon) and read local date parts (`getFullYear`/`getMonth`/`getDate`).
- **NEVER** use `toISOString()`, `Date.UTC`, or bare `new Date("YYYY-MM-DD")` (UTC parse) on event dates — they shift the day for viewers on one side of UTC.
- Use `dateRangeYmd(start, end, max)` from `src/lib/utils.ts` for event day lists — do not reimplement date loops.
- Use `fmtDate` for rendering `YYYY-MM-DD` or instant timestamps.
- **Times** (`HH:MM`, schedule times, callTime) are literal strings — render as-is, never pass through `new Date()`.
- The only intentional timezone conversion is rendering *real instants* (createdAt/updatedAt) in local time, and the "camera check" clock which explicitly formats in the **event's** timezone (`tz-lookup` on event coords).
- Server components render at server TZ — the same rules apply; noon-parse keeps hydration output identical.
