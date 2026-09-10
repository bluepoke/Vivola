import type { Server as SocketIOServer } from "socket.io";

// The socket.io server is created once in server.ts (outside the Next.js
// request-handling path) but needs to be reachable from API route handlers
// to emit live updates. Mirrors the `global.__prisma` pattern in
// src/lib/db/client.ts for the same reason: a single instance must survive
// Next.js's module reloading in dev.
declare global {
  var __sessionSocketServer: SocketIOServer | undefined;
}

export function setSessionSocketServer(io: SocketIOServer): void {
  global.__sessionSocketServer = io;
}

export function getSessionSocketServer(): SocketIOServer | undefined {
  return global.__sessionSocketServer;
}

export function sessionRoom(sessionId: string): string {
  return `session:${sessionId}`;
}
