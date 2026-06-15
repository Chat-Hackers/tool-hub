import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import Header from "./Header";

function TypingIndicator() {
  return (
    <div className="message left">
      <span className="triangle left"></span>
      <p className="message-text left">
        <span className="dancing-dot" style={{ animationDelay: "0s" }}>
          .
        </span>
        <span className="dancing-dot" style={{ animationDelay: "0.15s" }}>
          .
        </span>
        <span className="dancing-dot" style={{ animationDelay: "0.3s" }}>
          .
        </span>
      </p>
    </div>
  );
}

export function Message({
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

function Option({ text }: { text: string }) {
  return <p className="option">{text}</p>;
}

type Option = {
  question: string;
  reply: {
    text: string;
    link?: string;
    linkText?: string;
  }[];
};

const options: Option[] = [
  {
    question: "What is chat hackers?",
    reply: [
      {
        text: "chat hackers is a set of tools you can add to your group chat to make it easier to take political action",
      },
    ],
  },
  {
    question: "who makes chat hackers?",
    reply: [
      {
        text: "chat hackers is a collaboration between:",
      },
      {
        text: "- ",
        link: "https://campaignlab.uk",
        linkText: "Campaign Lab",
      },
      {
        text: "- ",
        link: "https://john.spacetu.be",
        linkText: "John Evans",
      },
      {
        text: "- our ",
        link: "/volunteer",
        linkText: "hackday volunteers",
      },
    ],
  },
  {
    question: "I have some FAQs",
    reply: [
      {
        text: "cool, here's a link to our ",
        link: "faq",
        linkText: "FAQ page",
      },
    ],
  },
  {
    question: "Do you have a privacy policy?",
    reply: [
      {
        text: "yes, here's a link to our ",
        link: "privacy",
        linkText: "privacy policy",
      },
    ],
  },
  {
    question: "Why have you made this?",
    reply: [
      {
        text: "The group chat has become the first tool that people pick up when it's time to organise for political action. We want to make it easy to customise your chat to meet the needs of democratic groups. For more you can read ",
        link: "motivations",
        linkText: "our motivations",
      },
    ],
  },
  {
    question: "Sounds great, let's go!",
    reply: [
      {
        text: "Ok, great. Just add <number available on request> to your whatsapp group and then interact with the tool from there!",
      },
    ],
  },
];

const firstMessage = {
  text: "hello, nice to meet you, this is chat hackers HQ",
  side: "left",
};

type Message = {
  text: string;
  side: string;
  link?: string;
  linkText?: string;
};

export default function Home() {
  const [usedOptions, setUsedOptions] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([firstMessage]);
  const [typing, setTyping] = useState(false);
  const [timeoutId, setTimeoutId] = useState<number>();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [messages]);

  function addToMessages(newMessages: Message[], delay = false) {
    if (delay) {
      setTimeout(() => {
        setMessages((prev) => prev.concat(newMessages));
      }, 1000);

      setTimeoutId((prev) => {
        if (prev) clearTimeout(prev);

        const typingTimeout = setTimeout(() => {
          setTyping(false);
          setTimeoutId(undefined);
        }, 1000);

        return typingTimeout;
      });
    } else {
      setMessages((prev) => prev.concat(newMessages));
    }
  }

  return (
    <>
      <Header name="Chat Hackers HQ" colour="red" />
      <div id="message-container">
        {messages.map((message) => (
          <Message
            text={message.text}
            side={message.side}
            link={message.link}
            linkText={message.linkText}
          />
        ))}
        {typing && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
      <div id="message-options">
        {options
          .filter((option) => !usedOptions.includes(option.question))
          .map((option) => (
            <button
              className="option-container"
              onClick={() => {
                setUsedOptions(usedOptions.concat(option.question));
                addToMessages([{ text: option.question, side: "right" }]);
                setTyping(true);
                addToMessages(
                  option.reply.map((reply) => ({
                    text: reply.text,
                    side: "left",
                    link: reply.link,
                    linkText: reply.linkText,
                  })),
                  true,
                );
              }}
            >
              {" "}
              <Option text={option.question} />
            </button>
          ))}
        {options.length === usedOptions.length && (
          <button
            className="option-container reset"
            onClick={() => {
              setMessages([firstMessage]);
              setUsedOptions([]);
            }}
          >
            <Option text={"Reset"} />
          </button>
        )}
      </div>
    </>
  );
}
