import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import { GameEngine } from "./engine.js";
import type { Command } from "../shared/game.js";

const game = new GameEngine();
const production = process.argv.includes("--production");
const mime: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
};
const root = resolve("dist");
const server = createServer(async (req, res) => {
  if (!production) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ game: "Signal Lock", status: "ready" }));
    return;
  }
  try {
    const pathname = decodeURIComponent(
      new URL(req.url ?? "/", "http://localhost").pathname,
    );
    const file = resolve(
      root,
      "." + (pathname === "/" ? "/index.html" : pathname),
    );
    if (!file.startsWith(root + "/")) {
      res.writeHead(403);
      res.end();
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
server.on("upgrade", (req, socket, head) => {
  try {
    const origin = req.headers.origin;
    if (
      origin &&
      !["127.0.0.1", "localhost", "[::1]"].includes(new URL(origin).hostname)
    )
      throw new Error("Non-local origin");
    if (req.url !== "/socket") throw new Error("Unknown endpoint");
    wss.handleUpgrade(req, socket, head, (ws) =>
      wss.emit("connection", ws, req),
    );
  } catch {
    socket.destroy();
  }
});
const sendState = (ws: WebSocket) => {
  if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 200_000)
    ws.send(
      JSON.stringify({ type: "state", state: game.snapshot(Date.now()) }),
    );
};
wss.on("connection", (ws) => {
  sendState(ws);
  let windowAt = Date.now(),
    count = 0;
  ws.on("message", (buffer) => {
    if (Date.now() - windowAt > 1000) {
      windowAt = Date.now();
      count = 0;
    }
    if (++count > 80) return;
    try {
      const command = JSON.parse(buffer.toString());
      if (
        !command ||
        typeof command !== "object" ||
        ![
          "start",
          "pause",
          "resume",
          "reset",
          "turn",
          "vote",
          "configure",
        ].includes(command.type)
      )
        throw new Error("Unknown message.");
      if (
        command.type === "configure" &&
        (!command.settings || typeof command.settings !== "object")
      )
        throw new Error("Invalid settings.");
      const error = game.command(command as Command, Date.now());
      if (error) ws.send(JSON.stringify({ type: "error", message: error }));
      wss.clients.forEach(sendState);
    } catch (error) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: error instanceof Error ? error.message : "Invalid message.",
        }),
      );
    }
  });
});
const timer = setInterval(() => {
  game.tick(Date.now());
  wss.clients.forEach(sendState);
}, 100);
server.listen(3107, "127.0.0.1", () =>
  console.log(
    `Signal Lock game server ready at http://127.0.0.1:3107${production ? "" : " — open Vite on port 5173"}`,
  ),
);
const close = () => {
  clearInterval(timer);
  wss.clients.forEach((client) => client.close());
  wss.close();
  server.close(() => process.exit(0));
};
process.on("SIGTERM", close);
process.on("SIGINT", close);
