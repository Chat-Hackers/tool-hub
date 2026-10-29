import { useState, useEffect } from "react";
import { postNewAdminCode, checkCode } from "./requests";
import { SetURLSearchParams } from "react-router";

function generateToken(length = 16) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}

export default function Validation({
  roomId,
  searchParams,
  setSearchParams,
  setAdmin,
}: {
  roomId: string;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  setAdmin: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [stage, setStage] = useState<"ready" | "inProgress" | "complete">(
    "ready",
  );
  const adminCode = searchParams.get("adminCode");

  async function startValidation() {
    if (roomId) {
      const newAdminCode = generateToken();
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("adminCode", newAdminCode);
        return next;
      });
      postNewAdminCode(roomId, newAdminCode);
      setStage("inProgress");
    }
  }

  async function checkApproval() {
    if (roomId && adminCode) {
      const approval = await checkCode(roomId, adminCode);
      console.log(approval);
      if (approval) {
        setAdmin(true);
      }
    }
  }

  useEffect(() => {
    checkApproval();
  }, [adminCode]);

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
