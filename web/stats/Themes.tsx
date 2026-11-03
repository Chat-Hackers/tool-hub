import { useState, useEffect } from "react";
import { MatrixEvent } from "../../types";
import { postThemes } from "../requests";

function monthName(month: string) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

type Theme = {
  title: string;
  summary: string;
  prominence: "major" | "moderate" | "minor";
};

type Themes = {
  themes: Theme[];
  name: string;
  messageCount: number;
};

type Month = { name: string; lines: string[] };

function Theme({ month }) {
  const [entry, setEntry] = useState<Themes>({
    themes: [],
    name: month.name,
    messageCount: month.lines.length,
  });
  const [themesLoaded, setThemesLoaded] = useState(false);

  async function loadEntry() {
    const themes = await postThemes(month.name, month.lines);

    setEntry({ ...themes, name: month.name, messageCount: month.lines.length });
    setThemesLoaded(true);
  }

  useEffect(() => {
    loadEntry();
  }, [month]);

  return (
    entry && (
      <div key={month.name} className="themes-month">
        <h3>
          {monthName(entry.name)} <small>{entry.messageCount} messages</small>
        </h3>
        {themesLoaded ? (
          <ul className="themes">
            {entry.themes.map((theme) => (
              <li key={theme.title}>
                <span className={`prominence ${theme.prominence}`}>
                  {
                    (
                      {
                        major: "Big topic",
                        moderate: "Came up a lot",
                        minor: "Mentioned",
                      } as const
                    )[theme.prominence]
                  }
                </span>
                <strong>{theme.title}</strong>
                <p>{theme.summary}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>Analysing themes...</p>
        )}
      </div>
    )
  );
}

export default function Themes({ timeline }) {
  const [months, setMonths] = useState<Month[]>([]);
  const [analysis, setAnalysis] = useState(false);

  function createMonths() {
    const months: Month[] = [];

    timeline.forEach((event: MatrixEvent) => {
      if (event.type !== "m.room.message") {
        return;
      }

      const line = event.sender.split(":")[0] + " : " + event.content.body;

      const eventTime = new Date(event.origin_server_ts);
      const eventYearMonth = eventTime.toISOString().slice(0, 7);
      const month = months.find((month) => month.name === eventYearMonth);
      if (month) {
        month.lines.push(line);
      } else {
        months.push({
          name: eventYearMonth,
          lines: [line],
        });
      }
    });

    setMonths(months);
  }

  useEffect(() => {
    createMonths();
  }, [timeline]);

  return (
    <section>
      <h2>🧠 What did people talk about?</h2>
      <>
        <p className="note">
          An AI reads the group's messages and pulls out the main topics. It's
          about topics, never people: no names are sent, and it never says who
          said what.
        </p>
        {analysis ? (
          months.map((month) => <Theme key={month.name} month={month} />)
        ) : (
          <button onClick={() => setAnalysis(true)}>Start Analysis</button>
        )}
      </>
    </section>
  );
}
