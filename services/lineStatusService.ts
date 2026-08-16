// TfL line status, fetched through the server proxy (never the browser
// directly) so an app key can be added server-side later.

export interface LineStatus {
  id: string;
  name: string;
  status: string;
  severity: number;
}

// The configured base is the API root. A relative value uses the same origin.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "http://localhost:3001/api" : "/api");

export const buildLineStatusUrl = (
  apiBaseUrl = "http://localhost:3001/api"
): string => `${apiBaseUrl.replace(/\/$/, "")}/tfl/line-status`;

// TfL statusSeverity: 10 is Good Service, 20 is Service Closed (overnight, not
// a disruption). Anything else is worth surfacing. Lower severity is worse.
export const selectDisruptions = (lines: LineStatus[]): LineStatus[] =>
  lines
    .filter((line) => line.severity !== 10 && line.severity !== 20)
    .sort((a, b) => a.severity - b.severity);

export const fetchLineStatus = async (): Promise<LineStatus[]> => {
  const response = await fetch(buildLineStatusUrl(API_BASE_URL));

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return selectDisruptions(data.lines ?? []);
};

// Official TfL line colours. Lines absent from the map fall back to grey.
const LINE_COLOURS: Record<string, string> = {
  bakerloo: "#B36305",
  central: "#E32017",
  circle: "#FFD300",
  district: "#00782A",
  "hammersmith-city": "#F3A9BB",
  jubilee: "#A0A5A9",
  metropolitan: "#9B0056",
  northern: "#000000",
  piccadilly: "#003688",
  victoria: "#0098D4",
  "waterloo-city": "#95CDBA",
  dlr: "#00A4A7",
  elizabeth: "#6950A1",
  tram: "#84B817",
  liberty: "#5D6061",
  lioness: "#FFA600",
  mildmay: "#0077AD",
  suffragette: "#5BBD72",
  weaver: "#823A62",
  windrush: "#ED1B00",
};

export const lineColour = (id: string): string => LINE_COLOURS[id] ?? "#5D6061";
