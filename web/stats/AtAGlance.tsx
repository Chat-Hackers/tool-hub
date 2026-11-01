import { type Total } from "./Stats";

export default function AtAGlance({
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
