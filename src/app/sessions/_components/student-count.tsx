"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export function StudentCount({ sessionId, initialCount }: { sessionId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const socket = io();
    socket.emit("session:join-room", sessionId);
    socket.on("session:student-count", (payload: { count: number }) => setCount(payload.count));

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  return (
    <p className="text-muted" style={{ margin: 0, fontWeight: 700 }}>
      {count === 1 ? "1 Student has joined" : `${count} Students have joined`}
    </p>
  );
}
