import { useState } from "react";
import { postNewAdminCode, checkCode } from "./requests";

function generateToken(length = 16) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}

export default function Validation({
  roomId,
  searchParams,
  setAdmin,
}: {
  roomId: string;
  searchParams: URLSearchParams;
  setAdmin: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [stage, setStage] = useState<"ready" | "inProgress" | "complete">(
    "ready",
  );
  const adminCode = searchParams.get("adminCode");

  async function startValidation() {
    if (roomId) {
      const newAdminCode = generateToken();
      searchParams.set("adminCode", newAdminCode);
      postNewAdminCode(roomId, newAdminCode);
      setStage("inProgress");
    }
  }

  async function checkApproval() {
    if (roomId && adminCode) {
      const approval = await checkCode(roomId, adminCode);
      if (approval) {
        setAdmin(true);
      }
    }
  }

  return (
    <>
      <h2>This Chat Hackers Group is admin only</h2>
      {stage === "ready" && (
        <>
          <p>Press below to start admin validation</p>
          <button onClick={startValidation}>Validate</button>
        </>
      )}
      {stage === "inProgress" && (
        <>
          <p>
            Waiting for an admin to approve the validation from the group chat
          </p>
          <button onClick={checkApproval}>Check approval</button>
        </>
      )}
    </>
  );
}
