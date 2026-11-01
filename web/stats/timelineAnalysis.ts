import { LinkifyIt } from "linkify-it";
import { type MatrixEvent } from "../../types";
import { type Total, type Week, type ParticipantSummary, Concentration } from "./Stats";

// Monday 00:00 UTC of the week containing the timestamp
function getWeekStart(timestamp: number): number {
  const date = new Date(timestamp);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - daysSinceMonday,
  );
}

const CONVERSATION_GAP_MS = 3 * 60 * 60 * 1000; // 3 hours
const DAY_MS = 24 * 60 * 60 * 1000;
const LONG_MESSAGE_CHARS = 280;

type ResponseByType = {
  type: string;
  messages: number;
  averageResponses: number;
  shareWithResponse: number;
};

const isEdit = (content: any): boolean =>
  content["m.relates_to"]?.rel_type === "m.replace";

// The event a message is replying to, or null if it isn't a reply.
// Edits are ignored; thread messages count as a reply to the thread root
// (the m.in_reply_to fallback inside threads is deliberately not counted).
function getReplyTarget(content: any): string | null {
  const rel = content["m.relates_to"];
  if (!rel || rel.rel_type === "m.replace") return null;
  if (rel.rel_type === "m.thread") return rel.event_id ?? null;
  return rel["m.in_reply_to"]?.event_id ?? null;
}

export default function processTimeline(timeline: MatrixEvent[]) {
  const analytics: {
    total: Total;
    weeks: Week[];
    participants: ParticipantSummary[];
    responsesByType: ResponseByType[];
    maxResponses: number;
    concentration: Concentration;
  } = {
    total: {
      joinedIn: 0,
      messages: 0,
      replies: 0,
      reactions: 0,
      links: 0,
      newParticipants: 0,
    },
    weeks: [],
    participants: [],
    responsesByType: [],
    maxResponses: 0,
    concentration: {
      posters: 0,
      peopleForHalf: 0,
      topFifthShare: 0
    }
  };

  const senders: string[] = [];
  const weekSenders: Record<number, string[]> = {};
  const linkify = new LinkifyIt({ fuzzyLink: true });

  const participants: Record<string, ParticipantSummary> = {};
  const participantDays: Record<string, Set<number>> = {};
  const participantWeekly: Record<string, Record<number, number>> = {};
  let previousMessageTs: number | null = null;

  const messageTypeById: Record<string, string> = {};
  const responseTargets: string[] = [];

  const getMessageType = (content: any): string => {
    if (
      content.msgtype === "m.audio" ||
      content["org.matrix.msc3245.voice"] ||
      content["m.voice"]
    ) {
      return "Voice note";
    }
    if (content.msgtype === "m.image" || content.msgtype === "m.video") {
      return "Photo or video";
    }
    if (!["m.text", "m.notice", "m.emote"].includes(content.msgtype)) {
      return "Other"; // files, locations, etc.
    }
    const body: string = content.body ?? "";
    if (linkify.match(body)) return "Link";
    if (body.trim().endsWith("?")) return "Question";
    return body.length >= LONG_MESSAGE_CHARS ? "Long message" : "Short message";
  };

  const getParticipant = (id: string, timestamp: number) => {
    if (!participants[id]) {
      participants[id] = {
        id,
        name: id,
        firstSeen: timestamp,
        joinedAt: null,
        lastActive: null,
        messages: 0,
        reactions: 0,
        replies: 0,
        links: 0,
        conversationsStarted: 0,
        responsesReceived: 0, // TODO
        activeDays: 0,
        weekly: [],
        patterns: [], // TODO
      };
      participantDays[id] = new Set();
      participantWeekly[id] = {};
    }
    return participants[id];
  };

  // The conversation-gap logic needs chronological order
  const sorted = [...timeline].sort(
    (a, b) => a.origin_server_ts - b.origin_server_ts
  );

  sorted.forEach((event: MatrixEvent) => {
    const timestamp = event.origin_server_ts;
    const weekStart = getWeekStart(timestamp);

    let week = analytics.weeks.find((w) => w.weekStart === weekStart);
    if (!week) {
      week = {
        weekStart,
        messages: 0,
        replies: 0,
        reactions: 0,
        links: 0,
        activeParticipants: 0,
        newParticipants: 0,
      };
      analytics.weeks.push(week);
      weekSenders[weekStart] = [];
    }

    const participant = getParticipant(event.sender, timestamp);
    participant.lastActive = timestamp;
    participantDays[event.sender].add(Math.floor(timestamp / DAY_MS));
    participantWeekly[event.sender][weekStart] =
      (participantWeekly[event.sender][weekStart] ?? 0) + 1;

    // Edits are m.room.message events too, but aren't new messages
    const isMessage = event.type === "m.room.message" && !isEdit(event.content);

    if (!senders.includes(event.sender)) {
      senders.push(event.sender);
      analytics.total.joinedIn++;
    }
    if (!weekSenders[weekStart].includes(event.sender)) {
      weekSenders[weekStart].push(event.sender);
      week.activeParticipants++;
    }
    if (isMessage) {
      analytics.total.messages++;
      week.messages++;
      participant.messages++;

      if (
        previousMessageTs === null ||
        timestamp - previousMessageTs >= CONVERSATION_GAP_MS
      ) {
        participant.conversationsStarted++;
      }
      previousMessageTs = timestamp;

      if (event.content.msgtype) {
        messageTypeById[event.event_id] = getMessageType(event.content);
      }
    }
    if (isMessage) {
      const replyTarget = getReplyTarget(event.content);
      if (replyTarget) {
        analytics.total.replies++;
        week.replies++;
        participant.replies++;
        responseTargets.push(replyTarget);
      }
    }
    if (event.type === "m.reaction") {
      analytics.total.reactions++;
      week.reactions++;
      participant.reactions++;

      const target = event.content["m.relates_to"]?.event_id;
      if (target) responseTargets.push(target);
    }
    if (isMessage && event.content.body) {
      const urls = linkify.match(event.content.body);

      if (urls) {
        analytics.total.links++;
        week.links++;
        participant.links++;
      }
    }
    if (event.type === "m.room.member" && event.content.membership === "join") {
      analytics.total.newParticipants++;
      week.newParticipants++;

      // For member events the subject is state_key (usually the same as sender)
      const member = getParticipant(event.state_key ?? event.sender, timestamp);
      member.joinedAt = member.joinedAt ?? timestamp;
      if (event.content.displayname) {
        member.name = event.content.displayname;
      }
    }
  });

  // Second pass: credit each response to the message it targets
  const responseCountById: Record<string, number> = {};
  responseTargets.forEach((id) => {
    if (id in messageTypeById) {
      responseCountById[id] = (responseCountById[id] ?? 0) + 1;
    }
  });

  const typeTotals: Record<
    string,
    { messages: number; totalResponses: number; withResponse: number }
  > = {};

  Object.entries(messageTypeById).forEach(([id, type]) => {
    const count = responseCountById[id] ?? 0;
    const totals = (typeTotals[type] ??= {
      messages: 0,
      totalResponses: 0,
      withResponse: 0,
    });
    totals.messages++;
    totals.totalResponses += count;
    if (count > 0) totals.withResponse++;
    analytics.maxResponses = Math.max(analytics.maxResponses, count);
  });

  analytics.responsesByType = Object.entries(typeTotals)
    .map(([type, t]) => ({
      type,
      messages: t.messages,
      averageResponses: t.totalResponses / t.messages,
      shareWithResponse: t.withResponse / t.messages,
    }))
    .sort((a, b) => b.messages - a.messages);

  // Weeks are already chronological because the timeline was sorted,
  // so weekly arrays can line up with analytics.weeks by index.
  analytics.participants = Object.values(participants).map((p) => ({
    ...p,
    activeDays: participantDays[p.id].size,
    weekly: analytics.weeks.map(
      (w) => participantWeekly[p.id][w.weekStart] ?? 0
    ),
  }));

  const posterCounts = analytics.participants.map(p => p.messages).filter(n => n > 0).sort((a, b) => b - a);
  const totalPosted = posterCounts.reduce((s, n) => s + n, 0);
  const topFifth = posterCounts.slice(0, Math.ceil(posterCounts.length / 5)).reduce((s, n) => s + n, 0);
  let peopleForHalf = 0;
  for (let running = 0; running < totalPosted / 2; peopleForHalf++) running += posterCounts[peopleForHalf];

  analytics.concentration = {
    posters: posterCounts.length,
    topFifthShare: totalPosted ? topFifth / totalPosted : 0,
    peopleForHalf,
  }

  return analytics;
}