import { describe, expect, it } from "vitest";
import {
  buildLineStatusUrl,
  lineColour,
  selectDisruptions,
} from "./lineStatusService";

describe("line status client", () => {
  it.each([
    ["https://example.com/api", "https://example.com/api/tfl/line-status"],
    ["/api", "/api/tfl/line-status"],
    [undefined, "http://localhost:3001/api/tfl/line-status"],
  ])("builds one API prefix from %s", (baseUrl, expected) => {
    expect(buildLineStatusUrl(baseUrl)).toBe(expected);
  });

  it("keeps only disruptions, worst first", () => {
    const lines = [
      {
        id: "victoria",
        name: "Victoria",
        status: "Good Service",
        severity: 10,
      },
      { id: "central", name: "Central", status: "Severe Delays", severity: 6 },
      { id: "dlr", name: "DLR", status: "Service Closed", severity: 20 },
      {
        id: "piccadilly",
        name: "Piccadilly",
        status: "Part Suspended",
        severity: 3,
      },
    ];

    expect(selectDisruptions(lines).map((line) => line.id)).toEqual([
      "piccadilly",
      "central",
    ]);
  });

  it("falls back to grey for unknown lines", () => {
    expect(lineColour("central")).toBe("#E32017");
    expect(lineColour("not-a-line")).toBe("#5D6061");
  });
});
