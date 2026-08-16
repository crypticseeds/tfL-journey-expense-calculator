import React, { useEffect, useState } from "react";
import {
  fetchLineStatus,
  lineColour,
  type LineStatus,
} from "../services/lineStatusService";

const REFRESH_INTERVAL = 150000; // 2.5 minutes

// A compact pill in the masthead. It never moves the layout: the detail lives
// in a dropdown that opens over the page, and on good service nothing renders.
const DisruptionPill: React.FC = () => {
  const [lines, setLines] = useState<LineStatus[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const disruptions = await fetchLineStatus();
        if (!cancelled) setLines(disruptions);
      } catch {
        // Line status is nice-to-know; a failure must not disturb the page.
        if (!cancelled) setLines([]);
      }
    };

    load();
    const timer = window.setInterval(load, REFRESH_INTERVAL);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (lines.length === 0) return null;

  return (
    <details className="app-disruption-pill">
      <summary className="app-disruption-pill__summary">
        <span className="app-disruption-pill__dot" aria-hidden="true" />
        {lines.length} {lines.length === 1 ? "line" : "lines"} disrupted
      </summary>
      <ul className="app-disruption-pill__panel">
        {lines.map((line) => (
          <li key={line.id} className="app-disruption-pill__row">
            <span
              className="app-disruption-pill__chip"
              style={{ backgroundColor: lineColour(line.id) }}
              aria-hidden="true"
            />
            <span className="app-disruption-pill__name">{line.name}</span>
            <span className="app-disruption-pill__status">{line.status}</span>
          </li>
        ))}
      </ul>
    </details>
  );
};

export default DisruptionPill;
