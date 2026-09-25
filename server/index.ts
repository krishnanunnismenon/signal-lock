import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { networkInterfaces } from "node:os";
import { WebSocketServer, WebSocket } from "ws";
import { GameEngine } from "./engine.js";
import { Workshop, type Actor } from "./room.js";
import type { Command } from "../shared/game.js";

const room = new Workshop(),
  solo = new GameEngine();
const production = process.argv.includes("--production");
const port = Number(process.env.PORT || 3107);
const addresses = Object.values(networkInterfaces())
  .flat()
  .filter((a) => a?.family === "IPv4" && !a.internal)
  .map((a) => a!.address);
const allowedHosts = new Set(["127.0.0.1", "localhost", "[::1]", ...addresses]);
const loopback = (ip?: string) =>
  ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip ?? "");
const mime: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".png": "image/png",
};
const root = resolve("dist");
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const json = (status: number, data: unknown) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  };
  if (req.headers.origin) {
    try {
      const origin = new URL(req.headers.origin);
      if (!allowedHosts.has(origin.hostname)) {
        json(403, { error: "This room accepts local network origins only." });
        return;
      }
    } catch {
      json(403, { error: "Invalid origin." });
      return;
    }
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    if (url.pathname === "/api/host") {
      if (!loopback(req.socket.remoteAddress)) {
        json(403, {
          error: "Open the host screen on the laptop at localhost.",
        });
        return;
      }
      json(200, {
        token: room.hostKey,
        code: room.code,
        addresses,
        port,
        production,
      });
      return;
    }
    if (url.pathname === "/api/join" && req.method === "POST") {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 2048) {
          json(413, { error: "Join request too large." });
          return;
        }
      }
      const data = JSON.parse(body);
      json(200, room.join(data.code, data.category, data.nickname));
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      json(404, { error: "Not found." });
      return;
    }
    if (!production) {
      json(200, { game: "Signal Lock", status: "ready" });
      return;
    }
    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(
      root,
      "." + (extname(pathname) ? pathname : "/index.html"),
    );
    if (!file.startsWith(root + "/")) {
      json(403, { error: "Not found." });
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(data);
  } catch (error) {
    json(400, {
      error:
        error instanceof Error && !("code" in error)
          ? error.message
          : "Unable to open that page.",
    });
  }
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
const actors = new WeakMap<WebSocket, Actor | "solo">();
server.on("upgrade", (req, socket, head) => {
  try {
    if (
      req.headers.origin &&
      !allowedHosts.has(new URL(req.headers.origin).hostname)
    )
      throw Error();
    const url = new URL(req.url ?? "", "http://localhost");
    if (url.pathname !== "/socket") throw Error();
    const role = url.searchParams.get("role"),
      token = url.searchParams.get("token");
    const actor =
      role === "solo" && token === room.hostKey
        ? "solo"
        : room.authenticate(role, token);
    wss.handleUpgrade(req, socket, head, (ws) => {
      if (!actor) {
        ws.send(
          JSON.stringify({
            type: "auth-error",
            message:
              "This session has expired. Join again or refresh the host screen.",
          }),
        );
        ws.close(1008);
        return;
      }
      actors.set(ws, actor);
      wss.emit("connection", ws);
    });
  } catch {
    socket.destroy();
  }
});
const sendState = (ws: WebSocket) => {
  if (ws.readyState !== WebSocket.OPEN || ws.bufferedAmount > 200000) return;
  const actor = actors.get(ws);
  if (!actor) return;
  if (
    actor !== "solo" &&
    actor.role === "participant" &&
    !room.members.has(actor.token ?? "")
  ) {
    ws.send(
      JSON.stringify({
        type: "auth-error",
        message: "The host released your place. You can join again.",
      }),
    );
    ws.close(1008);
    return;
  }
  ws.send(
    JSON.stringify({
      type: "state",
      state:
        actor === "solo"
          ? solo.snapshot(Date.now())
          : room.snapshot(actor, Date.now()),
    }),
  );
};
wss.on("connection", (ws) => {
  const actor = actors.get(ws)!;
  if (actor !== "solo") room.connection(actor, 1);
  sendState(ws);
  let windowAt = Date.now(),
    count = 0;
  ws.on("close", () => {
    if (actor !== "solo") room.connection(actor, -1);
  });
  ws.on("message", (buffer) => {
    if (Date.now() - windowAt > 1000) {
      windowAt = Date.now();
      count = 0;
    }
    if (++count > 60) return;
    try {
      const command = JSON.parse(buffer.toString());
      let error: string | null;
      if (actor === "solo") {
        if (
          !command ||
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
          throw Error("Unknown command.");
        if (
          command.type === "configure" &&
          (!command.settings || typeof command.settings !== "object")
        )
          throw Error("Invalid settings.");
        error = solo.command(command as Command, Date.now());
      } else error = room.command(actor, command, Date.now());
      ws.send(
        JSON.stringify(
          error
            ? { type: "error", message: error, requestId: command.requestId }
            : {
                type: "ack",
                requestId: command.requestId,
                command: command.type,
              },
        ),
      );
      wss.clients.forEach(sendState);
    } catch {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message. Please try again.",
        }),
      );
    }
  });
});
const timer = setInterval(() => {
  room.tick(Date.now());
  solo.tick(Date.now());
  wss.clients.forEach(sendState);
}, 100);
server.listen(port, "0.0.0.0", () =>
  console.log(
    `Signal Lock host: http://127.0.0.1:${production ? port : 5173} — phone addresses: ${addresses.join(", ")}`,
  ),
);
function close() {
  clearInterval(timer);
  wss.clients.forEach((ws) => ws.close());
  wss.close();
  server.close(() => process.exit(0));
}
process.on("SIGTERM", close);
process.on("SIGINT", close);
