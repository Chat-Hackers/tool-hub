import { useState } from "react";
import { Temporal } from "@js-temporal/polyfill";

export const releaseInstant = new Temporal.Instant(0n);

const OPTIONS: Record<string, Temporal.DurationLike | null> = {
  "Last 7 days": { days: 7 },
  "Last 30 days": { days: 30 },
  "Last 3 months": { months: 3 },
  "Last year": { years: 1 },
  "All time": null,
};

export default function TimeRangeSelect({
  onChange,
}: {
  onChange: (since: Temporal.Instant) => void;
}) {
  const [label, setLabel] = useState("All time");

  return (
    <select
      value={label}
      onChange={(e) => {
        const next = e.target.value;
        const duration = OPTIONS[next];
        setLabel(next);
        onChange(
          duration
            ? Temporal.Now.zonedDateTimeISO().subtract(duration).toInstant()
            : releaseInstant,
        );
      }}
    >
      {Object.keys(OPTIONS).map((l) => (
        <option key={l}>{l}</option>
      ))}
    </select>
  );
}
