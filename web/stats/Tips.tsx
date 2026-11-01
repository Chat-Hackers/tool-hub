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

export default function Tips({ tipsExpanded, setTipsExpanded }) {
  return (
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
  );
}
