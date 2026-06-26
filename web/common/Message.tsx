import { Link } from "react-router";

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
