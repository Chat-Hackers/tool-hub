import { useEffect, useState, useMemo } from "react";
import { Temporal } from "@js-temporal/polyfill";
import { getRoomEvents, getOptOuts } from "../requests";
import processTimeline from "./timelineAnalysis";
import Tips from "./Tips";
import TimeRangeSelect, { releaseInstant } from "./TimeRangeSelect";
import AtAGlance from "./AtAGlance";
import HowBusy from "./HowBusy";
import WhoParticipates from "./WhoParticipates";
import WhatGetsPeople from "./WhatGetsPeople";

export type Total = {
  joinedIn: number;
  messages: number;
  replies: number;
  reactions: number;
  links: number;
  newParticipants: number;
};

export type Week = {
  weekStart: number; //timestamp processable by Date, millisecond epoch
  messages: number;
  replies: number;
  reactions: number;
  links: number;
  activeParticipants: number;
  newParticipants: number;
};

export function day(ts: number | null) {
  return ts
    ? new Date(ts).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      })
    : "–";
}

export function daysAgo(ts: number | null) {
  if (!ts) return "never";
  const days = Math.floor((Date.now() - ts) / 86400000);
  return days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

export function heatStep(count: number) {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 7) return 3;
  return 4;
}

export type Tip = { x: number; y: number; text: string } | null;

export type Pattern =
  | "new"
  | "back"
  | "quiet-this-week"
  | "quieter"
  | "long-quiet"
  | "not-seen"
  | "mostly-reacts"
  | "starts-conversations"
  | "draws-responses";

export type ParticipantSummary = {
  id: string;
  name: string;
  firstSeen: number;
  joinedAt: number | null;
  lastActive: number | null;
  messages: number;
  reactions: number;
  replies: number;
  links: number;
  conversationsStarted: number;
  responsesReceived: number;
  activeDays: number;
  weekly: number[];
  patterns: Pattern[];
};

export type Concentration = {
  posters: number;
  topFifthShare: number;
  peopleForHalf: number;
};

export type ResponseByType = {
  type: string;
  messages: number;
  averageResponses: number;
  shareWithResponse: number;
};

export default function Stats({ room, roomId }: { room: any; roomId: string }) {
  const [since, setSince] = useState<Temporal.Instant>(releaseInstant);
  const [timeline, setTimeline] = useState([]);
  const [optOutsTotal, setOptOutsTotal] = useState(0);
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [tip, setTip] = useState<Tip>(null);

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

  const {
    total,
    weeks,
    participants,
    concentration,
    responsesByType,
    maxResponses,
  } = processTimeline(timeline);
  console.log(total, weeks);

  return (
    <div id="stats-container">
      <h1>{room ? room.title : "Room"}</h1>
      <TimeRangeSelect onChange={(since) => setSince(since)} />
      <AtAGlance total={total} optOuts={optOutsTotal} />
      <HowBusy weeks={weeks} setTip={setTip} />
      <WhoParticipates
        weeks={weeks}
        setTip={setTip}
        hideNames={false}
        participants={participants}
        concentration={concentration}
      />
      <WhatGetsPeople
        responsesByType={responsesByType}
        maxResponses={maxResponses}
        setTip={setTip}
      />

      {/* Themes */}

      <Tips tipsExpanded={tipsExpanded} setTipsExpanded={setTipsExpanded} />

      {tip && (
        <div className="tooltip" style={{ left: tip.x + 12, top: tip.y + 12 }}>
          {tip.text}
        </div>
      )}
    </div>
  );
}
