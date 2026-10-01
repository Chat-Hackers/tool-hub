import { Link } from "react-router";
import { useState } from "react";
import { Play, Volume2 } from "lucide-react";

import { getContentUrl } from "../requests";

export function AudioMessage({ url, side }: { url: string; side: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`message ${side}`}>
      {side === "left" && <span className="triangle left"></span>}

      <div className={`message-text audio-message ${side}`}>
        {loaded ? (
          <audio src={getContentUrl(url)} controls autoPlay />
        ) : (
          <button
            type="button"
            className="audio-load"
            onClick={() => setLoaded(true)}
            aria-label="Load audio"
          >
            <Play size={18} />
            <Volume2 size={18} />
          </button>
        )}
      </div>

      {side === "right" && <span className="triangle right"></span>}
    </div>
  );
}

export default function Message({
  text,
  side,
  link,
  linkText,
}: {
  text: string;
  side: string;
  link?: string;
  linkText?: string;
}) {
  return (
    <div className={`message ${side}`}>
      {side === "left" && <span className="triangle left"></span>}
      <p className={`message-text ${side}`}>
        {text}
        {link && (
          <Link to={`${link}`}>
            <span>{linkText}</span>
          </Link>
        )}
      </p>
      {side === "right" && <span className="triangle right"></span>}
    </div>
  );
}
