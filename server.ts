import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const port = Number(process.env.PORT ?? 3000);
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  // Groundwork for live Session updates (Presentation view, Lecturer control
  // view, Student devices). Session-specific rooms/events land in later
  // tickets; this just establishes that the socket server is wired up.
  const io = new SocketIOServer(httpServer);

  io.on("connection", (socket) => {
    socket.on("disconnect", () => {});
  });

  httpServer.listen(port, () => {
    const address = httpServer.address();
    const boundPort = typeof address === "object" && address ? address.port : port;
    console.log(`> Ready on http://localhost:${boundPort}`);
  });
});
