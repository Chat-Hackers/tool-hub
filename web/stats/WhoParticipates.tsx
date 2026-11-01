import { useState, useMemo } from "react";
import {
  type ParticipantSummary,
  type Pattern,
  type Week,
  type Tip,
  type Concentration,
} from "./Stats";
import { heatStep, day, daysAgo } from "./Stats";

type Filter = "all" | "check-in" | Pattern;

const patternInfo: { [pattern in Pattern]: { label: string; detail: string } } =
  {
    new: { label: "👋 New", detail: "Joined in the last 2 weeks." },
    back: {
      label: "🌱 Back again",
      detail: "Joined in this week after more than 4 weeks away.",
    },
    "quiet-this-week": {
      label: "💤 Quiet this week",
      detail: "Usually joins in, but nothing in the last 7 days.",
    },
    quieter: {
      label: "🌙 Gone quiet",
      detail: "Used to join in most weeks, but nothing for 2 weeks.",
    },
    "long-quiet": {
      label: "🕰️ Quiet for 4+ weeks",
      detail:
        "Has joined in before, but nothing for more than 4 weeks. That's OK: people drift in and out.",
    },
    "not-seen": {
      label: "👀 Not heard from yet",
      detail: "Hasn't posted or reacted yet. They may still be reading.",
    },
    "mostly-reacts": {
      label: "👍 Mostly reacts",
      detail: "Joins in with reactions more than messages.",
    },
    "starts-conversations": {
      label: "🚀 Gets things going",
      detail: "Often the first to post after a quiet spell.",
    },
    "draws-responses": {
      label: "🔥 Gets people talking",
      detail: "Their messages get lots of replies and reactions.",
    },
  };

const checkInPatterns: Pattern[] = [
  "quiet-this-week",
  "quieter",
  "not-seen",
  "new",
];

function matchesFilter(person: ParticipantSummary, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "check-in")
    return person.patterns.some((p) => checkInPatterns.includes(p));
  return person.patterns.includes(filter);
}

function filterLabel(filter: Filter) {
  if (filter === "all") return "Everyone";
  if (filter === "check-in") return "💌 Worth a check-in";
  return patternInfo[filter].label;
}

function Participants({
  participants,
  weeks,
  hideNames,
  onTip,
}: {
  participants: ParticipantSummary[];
  weeks: Week[];
  hideNames: boolean;
  onTip: (tip: Tip) => void;
}) {
  const [sortKey, setSortKey] = useState<keyof ParticipantSummary>("messages");
  const [filter, setFilter] = useState<Filter>("all");

  // anonymous labels follow join order, so they don't change when sorting
  const labels = useMemo(() => {
    const byFirstSeen = [...participants].sort(
      (a, b) => a.firstSeen - b.firstSeen,
    );
    return new Map(byFirstSeen.map((p, i) => [p.id, `Member ${i + 1}`]));
  }, [participants]);

  const shown = participants.filter((p) => matchesFilter(p, filter));
  const sorted = [...shown].sort((a, b) => {
    if (sortKey === "name")
      return (hideNames ? labels.get(a.id)! : a.name).localeCompare(
        hideNames ? labels.get(b.id)! : b.name,
      );
    return (Number(b[sortKey]) || 0) - (Number(a[sortKey]) || 0);
  });

  const columns: [keyof ParticipantSummary, string][] = [
    ["messages", "💬 Messages"],
    ["replies", "↩️ Replies"],
    ["reactions", "👍 Reactions"],
    ["links", "🔗 Links"],
    ["responsesReceived", "🔥 Responses"],
    ["lastActive", "🕒 Last seen"],
  ];

  const count = (f: Filter) =>
    participants.filter((p) => matchesFilter(p, f)).length;
  const filters: Filter[] = [
    "all",
    "check-in",
    ...(Object.keys(patternInfo) as Pattern[]),
  ];

  return (
    <>
      <div className="filters" role="group" aria-label="Show">
        {filters
          .filter((f) => f === "all" || count(f) > 0)
          .map((f) => (
            <button
              key={f}
              className={`filter ${filter === f ? "on" : ""} ${f === "check-in" ? "check-in" : ""}`}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {filterLabel(f)} <span className="filter-count">{count(f)}</span>
            </button>
          ))}
      </div>
      {filter === "check-in" && (
        <p className="note">
          People who might appreciate a friendly hello before they drift away:
          quiet this week, gone quiet, not heard from yet, or new.
        </p>
      )}
      {filter !== "all" && filter !== "check-in" && (
        <p className="note">{patternInfo[filter].detail}</p>
      )}
      <div className="table-scroll">
        <table className="people">
          <thead>
            <tr>
              <th>
                <button className="sort" onClick={() => setSortKey("name")}>
                  Name
                </button>
              </th>
              <th>Each week</th>
              {columns.map(([key, label]) => (
                <th key={key} className="num">
                  <button
                    className={`sort ${sortKey === key ? "active" : ""}`}
                    onClick={() => setSortKey(key)}
                  >
                    {label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((person) => (
              <tr key={person.id}>
                <td className="name">
                  {hideNames ? labels.get(person.id) : person.name}
                  {person.patterns.length > 0 && (
                    <div className="badges">
                      {person.patterns.map((pattern) => (
                        <span
                          key={pattern}
                          className={`chip chip-${pattern}`}
                          title={patternInfo[pattern].detail}
                        >
                          {patternInfo[pattern].label}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  <div
                    className="heat"
                    style={{
                      gridTemplateColumns: `repeat(${person.weekly.length}, 12px)`,
                    }}
                  >
                    {person.weekly.map((count, i) => (
                      <span
                        key={i}
                        className={`cell step-${heatStep(count)}`}
                        onMouseMove={(e) =>
                          onTip({
                            x: e.clientX,
                            y: e.clientY,
                            text: `Week of ${day(weeks[i]?.weekStart)}: ${count} messages and reactions`,
                          })
                        }
                        onMouseLeave={() => onTip(null)}
                      />
                    ))}
                  </div>
                </td>
                <td className="num">{person.messages}</td>
                <td className="num">{person.replies}</td>
                <td className="num">{person.reactions}</td>
                <td className="num">{person.links}</td>
                <td className="num">{person.responsesReceived}</td>
                <td className="num">{daysAgo(person.lastActive)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length === 0 && (
        <p className="empty">No one here right now. 🎉</p>
      )}
    </>
  );
}

export default function WhoParticipates({
  participants,
  weeks,
  concentration,
  setTip,
  hideNames,
}: {
  participants: ParticipantSummary[];
  weeks: Week[];
  concentration: Concentration;
  setTip: (tip: Tip) => void;
  hideNames: boolean;
}) {
  return (
    <section>
      <h2>🙋 Who's taking part?</h2>
      <p className="note">
        The badges are just what shows up in the chat, not a judgement. Tap or
        hover over one to see what it means. "Responses" is how many replies and
        reactions someone's messages got from others.
        {concentration.posters >= 2 &&
          ` ${concentration.peopleForHalf} of the ${concentration.posters} people who posted wrote half of the messages.`}
      </p>
      {participants.length ? (
        <Participants
          participants={participants}
          weeks={weeks}
          hideNames={hideNames}
          onTip={setTip}
        />
      ) : (
        <p className="empty">No one's posted yet. Say hi in the group! 👋</p>
      )}
      <div className="legend heat-legend">
        <span>Quiet week</span>
        {[1, 2, 3, 4].map((step) => (
          <i key={step} className={`cell step-${step}`} />
        ))}
        <span>Busy week</span>
      </div>
    </section>
  );
}
