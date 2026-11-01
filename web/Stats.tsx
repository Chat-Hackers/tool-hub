import { useEffect, useState } from "react";
import { type MatrixEvent } from "../types";
import { Temporal } from "@js-temporal/polyfill";
import { getRoomEvents, getOptOuts } from "./requests";
import { LinkifyIt } from "linkify-it";

const groupTips: [string, string, string][] = [
  [
    "🎯",
    "Agree what the group is for",
    "A clear purpose keeps chat on track and makes it easy to say what belongs somewhere else.",
  ],
  [
    "📌",
    "Pin the next action",
    "Use the group description and pinned messages for key info, and make them about doing: the next meeting, the next ask.",
  ],
  [
    "👋",
    "Welcome everyone",
    "Greet new people by name and ask what brought them here.",
  ],
  [
    "📱",
    "QR codes are your friend",
    "Add people straight after meetings, stalls and door-knocking with a QR code invite.",
  ],
  [
    "🔁",
    "Build routines",
    "Weekly round-ups, upcoming dates and thank-yous. If no one has responded to someone, be that person!",
  ],
  [
    "📊",
    "People like polls",
    "Quick to answer, and a great first step for quieter members.",
  ],
  [
    "📸",
    "Create a bit of FOMO",
    'Share photos from the doors, the stall or the pub afterwards: "Great to see everyone out today!"',
  ],
  [
    "🏆",
    "Celebrate wins",
    "Share the results: doors knocked, sign-ups, the person who went the extra mile.",
  ],
  [
    "🙋",
    "Make specific asks",
    '"Can you help on Saturday at 10?" works better than "Can anyone help?" A one-to-one works even better.',
  ],
  [
    "🤝",
    "Share the load",
    "Have at least three admins so no one carries it alone, and agree a simple code of conduct.",
  ],
  [
    "💬",
    "Give off-topic chat a home",
    "A separate chat for off-topic conversation keeps the main group focused.",
  ],
  [
    "🛡️",
    "Keep people safe",
    "Remind people their number is visible to everyone in the group, and take care before adding under-18s.",
  ],
];

type Total = {
  joinedIn: number;
  messages: number;
  replies: number;
  reactions: number;
  links: number;
  newParticipants: number;
};

export function AtAGlance({
  total,
  optOuts,
}: {
  total: Total;
  optOuts: number;
}) {
  return (
    <section>
      <h2>✨ At a glance</h2>
      <div className="tiles">
        <div className="tile tile-people">
          <span className="icon">🙋</span>
          <span className="value">{total.joinedIn}</span>
          <span className="label">
            {total.joinedIn === 1 ? "person joined in" : "people joined in"}
          </span>
        </div>
        <div className="tile tile-messages">
          <span className="icon">💬</span>
          <span className="value">{total.messages}</span>
          <span className="label">messages</span>
        </div>
        <div className="tile tile-replies">
          <span className="icon">↩️</span>
          <span className="value">{total.replies}</span>
          <span className="label">replies</span>
        </div>
        <div className="tile tile-reactions">
          <span className="icon">👍</span>
          <span className="value">{total.reactions}</span>
          <span className="label">reactions</span>
        </div>
        <div className="tile tile-links">
          <span className="icon">🔗</span>
          <span className="value">{total.links}</span>
          <span className="label">links shared</span>
        </div>
        <div className="tile tile-new">
          <span className="icon">👋</span>
          <span className="value">{total.newParticipants}</span>
          <span className="label">new members</span>
        </div>
      </div>
      <p className="note">
        {optOuts > 0 &&
          ` ${optOuts} ${optOuts === 1 ? "person has" : "people have"} opted out and ${optOuts === 1 ? "isn't" : "aren't"} counted.`}
      </p>
    </section>
  );
}

const releaseInstant = new Temporal.Instant(1793453271852000000n);

const OPTIONS: Record<string, Temporal.DurationLike | null> = {
  "Last 7 days": { days: 7 },
  "Last 30 days": { days: 30 },
  "Last 3 months": { months: 3 },
  "Last year": { years: 1 },
  "All time": null,
};

export function TimeRangeSelect({
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

function processTimeline(timeline: MatrixEvent[]) {
  const analytics = {
    total: {
      joinedIn: 0,
      messages: 0,
      replies: 0,
      reactions: 0,
      links: 0,
      newParticipants: 0,
    },
  };

  const senders: string[] = [];

  timeline.forEach((event: MatrixEvent) => {
    if (!senders.includes(event.sender)) {
      senders.push(event.sender);
      analytics.total.joinedIn++;
    }
    if (event.type === "m.room.message") {
      analytics.total.messages++;
    }
    if (event.type === "m.room.message" && event.content["m.relates_to"]) {
      analytics.total.replies++;
    }
    if (event.type === "m.reaction") {
      analytics.total.reactions++;
    }
    if (event.type === "m.room.message" && event.content.body) {
      const linkify = new LinkifyIt({ fuzzyLink: true });
      const urls = linkify.match(event.content.body);

      if (urls) {
        analytics.total.links++;
      }
    }
    if (event.type === "m.room.member" && event.content.membership === "join") {
      analytics.total.newParticipants++;
    }
  });

  return analytics;
}

export default function Stats({ room, roomId }: { room: any; roomId: string }) {
  const [since, setSince] = useState<Temporal.Instant>(releaseInstant);
  const [timeline, setTimeline] = useState([]);
  const [optOutsTotal, setOptOutsTotal] = useState(0);
  const [tipsExpanded, setTipsExpanded] = useState(false);

  async function loadTimeline() {
    const { events } = await getRoomEvents(roomId, since);
    setTimeline(events);
  }

  async function loadOptOuts() {
    const optOuts = await getOptOuts(roomId);
    setOptOutsTotal(optOuts.length);
  }

  useEffect(() => {
    loadTimeline();
    loadOptOuts();
  }, [since]);

  const { total } = processTimeline(timeline);

  return (
    <div id="stats-container">
      <h1>{room ? room.title : "Room"}</h1>
      <TimeRangeSelect onChange={(since) => setSince(since)} />

      <AtAGlance total={total} optOuts={optOutsTotal} />

      {/* Graph/Table */}
      {/* Who Participates */}
      {/* Kinds of messages */}

      {/* Topics */}

      <section>
        <h2>🧰 Campaign Lab's Tips for Getting the Most Out of Chat Groups</h2>
        {tipsExpanded ? (
          <div className="tips">
            {groupTips.map(([icon, title, text]) => (
              <div className="tip-card" key={title}>
                <span className="icon" aria-hidden="true">
                  {icon}
                </span>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            ))}
            <button onClick={() => setTipsExpanded(false)}>Hide Tips</button>
          </div>
        ) : (
          <button onClick={() => setTipsExpanded(true)}>Show Tips</button>
        )}
      </section>
    </div>
  );
}
