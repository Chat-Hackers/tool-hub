import type { ParticipantSummary, Pattern } from "./WhoParticipates";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;

// ---- Thresholds (tune here) ----
export const NEW_WITHIN_DAYS = 14;

export const BACK_AWAY_DAYS = 28; // previous contribution must be older than this
export const LONG_QUIET_DAYS = 28;

export const QUIETER_SILENT_DAYS = 14;
export const QUIETER_LOOKBACK_WEEKS = 8; // the weeks before the silent stretch
export const QUIETER_MIN_ACTIVE_WEEKS = QUIETER_LOOKBACK_WEEKS / 2;

export const QUIET_WEEK_LOOKBACK_WEEKS = 4;
export const QUIET_WEEK_MIN_ACTIVE_WEEKS = 2;

export const MOSTLY_REACTS_MIN_CONTRIBUTIONS = 5;

export const STARTS_MIN_CONVERSATIONS = 3;
export const STARTS_MIN_SHARE = 0.25;

export const DRAWS_MIN_MESSAGES = 5;
export const DRAWS_MULTIPLIER = 1.5; // times the room average

export type PatternContext = {
    now: number;
    /** Responses per message across the whole room */
    roomAverageResponses: number;
};

/**
 * Counts how many of the weekly windows from `fromWeek` to `toWeek`
 * (inclusive) contain at least one contribution. Week 0 is the 7 days
 * ending at `now`, week 1 the 7 days before that, and so on.
 * Each window is (start, end], so a timestamp belongs to exactly one.
 */
function activeWeeks(
    timestamps: number[],
    now: number,
    fromWeek: number,
    toWeek: number,
): number {
    let count = 0;
    for (let week = fromWeek; week <= toWeek; week++) {
        const end = now - week * WEEK_MS;
        const start = end - WEEK_MS;
        if (timestamps.some((t) => t > start && t <= end)) count++;
    }
    return count;
}

// Presence patterns are mutually exclusive: first match wins.
function getPresencePattern(
    p: ParticipantSummary,
    timestamps: number[],
    now: number,
): Pattern | null {
    if (
        p.joinedAt !== null &&
        p.joinedAt <= now &&
        now - p.joinedAt <= NEW_WITHIN_DAYS * DAY_MS
    ) {
        return "new";
    }

    if (timestamps.length === 0) return "not-seen";

    const sinceLast = now - timestamps[timestamps.length - 1];

    if (sinceLast < WEEK_MS) {
        // Active this week: "back" if the contribution that ended their absence
        // came more than 4 weeks after the one before it.
        const firstThisWeek = timestamps.find((t) => now - t < WEEK_MS)!;
        const previous = [...timestamps].reverse().find((t) => t < firstThisWeek);
        if (previous !== undefined && firstThisWeek - previous > BACK_AWAY_DAYS * DAY_MS) {
            return "back";
        }
        return null;
    }

    if (sinceLast > LONG_QUIET_DAYS * DAY_MS) return "long-quiet";

    if (
        sinceLast >= QUIETER_SILENT_DAYS * DAY_MS &&
        activeWeeks(timestamps, now, 2, 1 + QUIETER_LOOKBACK_WEEKS) >=
        QUIETER_MIN_ACTIVE_WEEKS
    ) {
        return "quieter";
    }

    if (
        activeWeeks(timestamps, now, 1, QUIET_WEEK_LOOKBACK_WEEKS) >=
        QUIET_WEEK_MIN_ACTIVE_WEEKS
    ) {
        return "quiet-this-week";
    }

    return null;
}

// Style patterns are independent and can stack with a presence pattern.
function getStylePatterns(
    p: ParticipantSummary,
    roomAverageResponses: number,
): Pattern[] {
    const patterns: Pattern[] = [];

    if (
        p.reactions > p.messages &&
        p.reactions + p.messages >= MOSTLY_REACTS_MIN_CONTRIBUTIONS
    ) {
        patterns.push("mostly-reacts");
    }

    if (
        p.messages > 0 &&
        p.conversationsStarted >= STARTS_MIN_CONVERSATIONS &&
        p.conversationsStarted / p.messages >= STARTS_MIN_SHARE
    ) {
        patterns.push("starts-conversations");
    }

    if (p.messages >= DRAWS_MIN_MESSAGES && p.responsesReceived > 0) {
        const perMessage = p.responsesReceived / p.messages;
        if (perMessage >= DRAWS_MULTIPLIER * roomAverageResponses) {
            patterns.push("draws-responses");
        }
    }

    return patterns;
}

/**
 * @param contributions timestamps of the participant's messages and
 *   reactions (not joins, leaves or edits), in any order.
 */
export function derivePatterns(
    participant: ParticipantSummary,
    contributions: number[],
    { now, roomAverageResponses }: PatternContext,
): Pattern[] {
    const timestamps = contributions.filter((t) => t <= now).sort((a, b) => a - b);

    const presence = getPresencePattern(participant, timestamps, now);
    return [
        ...(presence ? [presence] : []),
        ...getStylePatterns(participant, roomAverageResponses),
    ];
}