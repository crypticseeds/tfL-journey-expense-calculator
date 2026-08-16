import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  addPreviousPageContext,
  mergeEntriesByMaxCount,
  parseCsvToTravelEntries,
  parseJourneysHeuristically,
  rebuildPageTextWithLineBreaks,
} from "./geminiService";

const fixture = (name: string) =>
  readFileSync(
    fileURLToPath(new URL(`../sample/${name}`, import.meta.url)),
    "utf8"
  );

describe("travel entry parsing", () => {
  it("parses the sample payments CSV", () => {
    const entries = parseCsvToTravelEntries(
      fixture("Amex - 2003 - October 2025 (Payments).csv")
    );

    expect(entries).toHaveLength(26);
    expect(entries[0]).toEqual({ date: "2025-10-03", amount: 7.2 });
    expect(entries.at(-1)).toEqual({ date: "2025-10-30", amount: 7.2 });
  });

  it("inherits date headings and ignores non-journey lines", () => {
    expect(parseJourneysHeuristically(fixture("journeys-text.txt"))).toEqual([
      { date: "2025-10-14", amount: 2.8 },
      { date: "2025-10-14", amount: 2.8 },
      { date: "2025-10-15", amount: 3.4 },
    ]);
  });

  it("keeps the maximum duplicate count while merging", () => {
    const entry = { date: "2025-10-14", amount: 2.8 };
    expect(mergeEntriesByMaxCount([entry], [entry, entry])).toEqual([
      entry,
      entry,
    ]);
  });

  it("rebuilds PDF text in visual reading order", () => {
    expect(
      rebuildPageTextWithLineBreaks(
        JSON.parse(fixture("pdf-text-content.json"))
      )
    ).toBe("Tue 14 Oct 2025\nOxford Circus to Victoria £2.80");
  });

  it("includes the previous page as date context for later chunks", () => {
    expect(addPreviousPageContext(["p1", "p2", "p3", "p4", "p5"], 2)).toEqual([
      { pages: ["p1", "p2"] },
      { context: "p2", pages: ["p3", "p4"] },
      { context: "p4", pages: ["p5"] },
    ]);
  });
});
