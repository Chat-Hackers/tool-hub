import { type ResponseByType } from "./Stats";

const typeEmoji: { [type: string]: string } = {
  Question: "❓",
  Link: "🔗",
  "Photo or video": "📷",
  "Voice note": "🎤",
  "Long message": "📝",
  "Short message": "💬",
  Other: "📎",
};

export default function WhatGetsPeople({
  responsesByType,
  maxResponses,
  setTip,
}) {
  return (
    <section>
      <h2>🗣️ What gets people talking?</h2>
      <p className="note">
        How many replies and reactions each kind of message gets, on average.
        Who sends it and when matters too, so treat these as hints.
      </p>
      {responsesByType.length ? (
        <div className="bars">
          {responsesByType.map((r) => (
            <div
              className="bar-row"
              key={r.type}
              onMouseMove={(e) =>
                setTip({
                  x: e.clientX,
                  y: e.clientY,
                  text: `${r.type}: ${r.messages} messages, ${Math.round(r.shareWithResponse * 100)}% got at least one reply or reaction`,
                })
              }
              onMouseLeave={() => setTip(null)}
            >
              <span className="bar-label">
                {typeEmoji[r.type] ?? "💬"} {r.type}
              </span>
              <span className="bar-track">
                <span
                  className="bar series-1"
                  style={{
                    width: `${(r.averageResponses / maxResponses) * 100}%`,
                  }}
                />
              </span>
              <span className="bar-value">
                {r.averageResponses.toFixed(1)}{" "}
                <small>({r.messages} sent)</small>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">No messages yet.</p>
      )}
    </section>
  );
}
