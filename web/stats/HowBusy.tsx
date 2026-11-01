import { type Week, type Tip } from "./Stats";
import { day } from "./Stats";

function WeeklyChart({
  weeks,
  onTip,
}: {
  weeks: Week[];
  onTip: (tip: Tip) => void;
}) {
  const height = 160;
  const barWidth = 28;
  const gap = 10;
  const width = Math.max(weeks.length * (barWidth + gap), 200);
  const max = Math.max(1, ...weeks.map((w) => w.messages + w.reactions));
  const scale = (n: number) => (n / max) * (height - 8);
  const labelEvery = Math.ceil(weeks.length / 8);

  return (
    <div className="chart-scroll">
      <svg
        viewBox={`0 0 ${width} ${height + 22}`}
        style={{ width: "100%", maxWidth: width, height: "auto" }}
        role="img"
        aria-label="Messages and reactions per week"
      >
        <line x1={0} x2={width} y1={height} y2={height} className="axis" />
        {weeks.map((week, i) => {
          const x = i * (barWidth + gap) + gap / 2;
          const messageHeight = scale(week.messages);
          const reactionHeight = scale(week.reactions);
          const tip = `Week of ${day(week.weekStart)}: ${week.messages} messages, ${week.reactions} reactions, ${week.activeParticipants} people joined in${week.newParticipants ? `, ${week.newParticipants} new` : ""}`;
          return (
            <g
              key={week.weekStart}
              onMouseMove={(e) =>
                onTip({ x: e.clientX, y: e.clientY, text: tip })
              }
              onMouseLeave={() => onTip(null)}
            >
              <rect
                x={x - gap / 2}
                y={0}
                width={barWidth + gap}
                height={height}
                className="hit"
              />
              {week.messages > 0 && (
                <rect
                  x={x}
                  y={height - messageHeight}
                  width={barWidth}
                  height={messageHeight}
                  rx={3}
                  className="series-1"
                />
              )}
              {week.reactions > 0 && (
                <rect
                  x={x}
                  y={height - messageHeight - reactionHeight}
                  width={barWidth}
                  height={Math.max(0, reactionHeight - 2)}
                  rx={3}
                  className="series-2"
                />
              )}
              {i % labelEvery === 0 && (
                <text x={x + barWidth / 2} y={height + 15} className="tick">
                  {day(week.weekStart)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function HowBusy({
  weeks,
  setTip,
}: {
  weeks: Week[];
  setTip: (tip: Tip) => void;
}) {
  return (
    <section>
      <h2>📈 How busy has the group been?</h2>
      <div className="legend">
        <span>
          <i className="swatch series-1" /> Messages
        </span>
        <span>
          <i className="swatch series-2" /> Reactions
        </span>
      </div>
      <WeeklyChart weeks={weeks} onTip={setTip} />
      <details>
        <summary>Show as a table</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Week of</th>
                <th className="num">Messages</th>
                <th className="num">Replies</th>
                <th className="num">Reactions</th>
                <th className="num">Links</th>
                <th className="num">People</th>
                <th className="num">New</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.weekStart}>
                  <td>{day(w.weekStart)}</td>
                  <td className="num">{w.messages}</td>
                  <td className="num">{w.replies}</td>
                  <td className="num">{w.reactions}</td>
                  <td className="num">{w.links}</td>
                  <td className="num">{w.activeParticipants}</td>
                  <td className="num">{w.newParticipants}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
