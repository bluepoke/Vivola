import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { sessionRoom, setSessionSocketServer } from "@/lib/realtime/session-socket-server";

const port = Number(process.env.PORT ?? 3000);
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  // Groundwork for live Session updates (Presentation view, Lecturer control
  // view, Student devices). A client joins a Session's room to receive
  // updates scoped to that Session; API route handlers emit into the room
  // via getSessionSocketServer() (see src/lib/realtime/session-socket-server.ts).
  const io = new SocketIOServer(httpServer);
  setSessionSocketServer(io);

  io.on("connection", (socket) => {
    socket.on("session:join-room", (sessionId: string) => {
      socket.join(sessionRoom(sessionId));
    });
    socket.on("disconnect", () => {});
  });

  httpServer.listen(port, () => {
    const address = httpServer.address();
    const boundPort = typeof address === "object" && address ? address.port : port;
    console.log(`> Ready on http://localhost:${boundPort}`);
  });
});
