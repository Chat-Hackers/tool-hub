import { useSearchParams, Link } from "react-router";
import { useEffect, useState, useRef } from "react";
import { Wrench, ChartColumnBig, MessagesSquare } from "lucide-react";
import { type Room, Tool, MatrixEvent } from "../types";
import {
  getTools,
  getRoom,
  postToolActivation,
  getToolUseSetting,
  postNewAdminCode,
} from "./requests";
import Toggle from "./common/Toggle";
import Message, { AudioMessage } from "./common/Message";
import Validation from "./Validation";

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const roomId = searchParams.get("roomId");
  const [adminOnly, setAdminOnly] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [tools, setTools] = useState<Tool[]>([]);
  const [room, setRoom] = useState<Room>();
  const [nav, setNav] = useState<"tools" | "chat" | "stats">("tools");
  const chatRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 1200);

  async function loadToolUseSetting(roomId: string) {
    const toolUseSetting = await getToolUseSetting(roomId);
    setAdminOnly(toolUseSetting.admin_only);
  }

  async function loadTools(roomId: string) {
    const tools = await getTools(roomId);
    console.log(tools);
    setTools(tools);
  }

  async function loadRoom(roomId: string) {
    const room = await getRoom(roomId);
    console.log(room);
    setRoom(room);
  }

  async function setToolActivation(
    roomId: string,
    toolId: string,
    activation: boolean,
  ) {
    await postToolActivation(roomId, toolId, activation);
    loadTools(roomId);
  }

  useEffect(() => {
    if (roomId) {
      loadToolUseSetting(roomId);
      loadTools(roomId);
      loadRoom(roomId);
    }
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [room, nav]);

  const messageCount =
    room &&
    room.timeline.filter((event) => event.type === "m.room.message").length;
  const participants: { [key: string]: "join" } = {};
  room &&
    room.timeline
      .filter(
        (event) =>
          event.type === "m.room.member" && event.content.membership === "join",
      )
      .map((event) => event.state_key)
      .forEach((userId) => (participants[userId as string] = "join"));

  const toolsPanel = (
    <div id="tools-container">
      {roomId &&
        tools.map((tool) => (
          <div className="tool-container">
            <div className="tool-title-container">
              <h3 className="tool-title">
                {tool.emoji} {tool.title}
              </h3>
              <Toggle
                checked={tool.active}
                onChange={(value) => setToolActivation(roomId, tool.id, value)}
              />
            </div>
            <p>
              {tool.description}
              {tool.active && (
                <a
                  href={`/${tool.id}?roomId=${roomId}`}
                  className="tool-page-link"
                >
                  {tool.title} →
                </a>
              )}
            </p>
          </div>
        ))}
    </div>
  );

  const chatPanel = (
    <div id="phone" style={{ minHeight: "auto" }}>
      <h2 id="chat-title">Last 1000 messages</h2>
      <div id="chat-container" ref={chatRef}>
        {room &&
          room.timeline
            .filter((event) => event.type === "m.room.message")
            .slice(0, 1000)
            .reverse()
            .map((event) =>
              event.content.msgtype === "m.text" ? (
                <Message
                  text={event.content.body}
                  side={event.sender === room.botId ? "left" : "right"}
                />
              ) : (
                <AudioMessage
                  url={event.content.url}
                  side={event.sender === room.botId ? "left" : "right"}
                />
              ),
            )}
      </div>
    </div>
  );

  const firstMessage = room?.timeline[room.timeline.length - 1];
  const firstMessageDate = new Date(firstMessage?.origin_server_ts || 0);
  const lastMessage = room?.timeline[0];
  const lastMessageDate = new Date(lastMessage?.origin_server_ts || 0);

  const statsPanel = (
    <div id="stats-container">
      <h1>{room ? room.title : "Room"}</h1>
      <p>{messageCount} messages</p>
      <p>{Object.keys(participants).length} members</p>
      <p>
        First message:{" "}
        {firstMessageDate.toLocaleString("en-GB", {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </p>
      <p>
        Last message:{" "}
        {lastMessageDate.toLocaleString("en-GB", {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </p>
    </div>
  );

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 1200);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize); // cleanup
  }, []);

  const navSelectedStyle = {
    color: "white",
    backgroundColor: "grey",
  };

  console.log("adminonly", adminOnly, "admin", admin);

  return adminOnly && !admin ? (
    <>
      <Validation
        roomId={roomId as string}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
        setAdmin={setAdmin}
      />
    </>
  ) : isDesktop ? (
    <div id="tools-chat-container">
      {toolsPanel}
      {chatPanel}
      {statsPanel}
    </div>
  ) : (
    <>
      {nav === "tools" && toolsPanel}
      {nav === "chat" && chatPanel}
      {nav === "stats" && statsPanel}
      <div id="navbar">
        <button
          onClick={() => setNav("tools")}
          className="nav-button"
          style={nav === "tools" ? navSelectedStyle : {}}
        >
          <Wrench />
        </button>
        <button
          onClick={() => setNav("chat")}
          className="nav-button"
          style={nav === "chat" ? navSelectedStyle : {}}
        >
          <MessagesSquare />
        </button>
        <button
          onClick={() => setNav("stats")}
          className="nav-button"
          style={nav === "stats" ? navSelectedStyle : {}}
        >
          <ChartColumnBig />
        </button>
      </div>
    </>
  );
}
