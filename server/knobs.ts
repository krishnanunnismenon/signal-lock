import { parseArgs } from "node:util";
import { SerialPort } from "serialport";
import { WebSocket } from "ws";
import type { Snapshot } from "../shared/game.js";
import { TEAM_NAMES } from "../shared/room.js";
import type { RoomState } from "../shared/room.js";
import {
  KnobGate,
  KnobLines,
  parseKnobLine,
  mapKnob,
  KNOB_CATEGORIES,
  type KnobMode,
} from "./knob-protocol.js";

const { values } = parseArgs({
  options: {
    list: { type: "boolean" },
    monitor: { type: "boolean" },
    inspect: { type: "boolean" },
    solo: { type: "boolean" },
    port: { type: "string" },
    server: { type: "string", default: "http://127.0.0.1:3107" },
    help: { type: "boolean" },
  },
});
if (values.help) {
  console.log(
    "pnpm knobs --list\npnpm knobs --port /dev/cu.YOUR_DEVICE --monitor\npnpm knobs --port /dev/cu.YOUR_DEVICE --inspect\npnpm knobs --port /dev/cu.YOUR_DEVICE\npnpm knobs --port /dev/cu.YOUR_DEVICE --solo\nOptional: --server http://127.0.0.1:3107",
  );
} else if (values.list) {
  const ports = await SerialPort.list();
  for (const port of ports) {
    const path =
      process.platform === "darwin"
        ? port.path.replace(/^\/dev\/tty\./, "/dev/cu.")
        : port.path;
    console.log(`${path}  ${port.manufacturer ?? ""}`);
  }
  if (!ports.length)
    console.log(
      "No serial ports found. Connect the ESP32 with a USB data cable.",
    );
} else if (!values.port) {
  console.error("Choose the ESP32 port explicitly. Run: pnpm knobs --list");
  process.exitCode = 1;
} else {
  await run(
    values.port,
    values.server!,
    Boolean(values.monitor || values.inspect),
    Boolean(values.inspect),
    values.solo ? "solo" : "workshop",
  );
}

async function connectionKey(base: URL, mode: KnobMode): Promise<string> {
  const response = await fetch(new URL("/api/host", base), {
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw Error("Cannot read the local host session.");
  const { token } = (await response.json()) as { token: string };
  if (mode === "solo") return token;
  return new Promise((resolve, reject) => {
    const url = new URL("/socket", base);
    url.protocol = "ws:";
    url.searchParams.set("role", "host");
    url.searchParams.set("token", token);
    const ws = new WebSocket(url);
    const timer = setTimeout(() => finish(), 3000);
    const finish = (key?: string) => {
      clearTimeout(timer);
      ws.removeAllListeners("message");
      ws.close();
      if (key) resolve(key);
      else
        reject(
          Error("Cannot read the operator session. Start the game first."),
        );
    };
    ws.on("error", () => finish());
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (
          message.type === "state" &&
          typeof message.state.operatorKey === "string"
        )
          finish(message.state.operatorKey);
        else if (message.type === "auth-error") finish();
      } catch {
        finish();
      }
    });
  });
}

async function run(
  path: string,
  address: string,
  monitor: boolean,
  inspect: boolean,
  mode: KnobMode,
) {
  const base = new URL(address);
  if (
    base.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)
  )
    throw Error("The USB bridge connects only to the game on this laptop.");
  const serial = new SerialPort({ path, baudRate: 115200, autoOpen: false });
  const gate = new KnobGate(mode);
  const lines = new KnobLines();
  let socket: WebSocket | null = null;
  let stopped = false;
  let connecting = false;
  let previousArm = "";
  let diagnosticSeq = 0;
  let lastStateAt = 0;
  let receivedPins = false;
  let inspectStarted = 0;
  let warnedFirmware = false;
  const arm = (force = false) => {
    const command = monitor
      ? `ARM monitor\n${inspect ? "WATCH" : "QUIET"}\n`
      : gate.epoch
        ? `ARM ${gate.epoch}\n`
        : "STOP\n";
    if (serial.isOpen && (force || command !== previousArm)) {
      previousArm = command;
      serial.write(command, (error) => {
        if (error) stop("USB write failed. Reconnect and restart the bridge.");
      });
    }
  };
  const stop = (reason?: string) => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    gate.reset();
    socket?.close();
    if (serial.isOpen) serial.close();
    if (reason) {
      console.error(reason);
      process.exitCode = 1;
    }
  };
  const connect = async () => {
    if (monitor || stopped || connecting || socket) return;
    connecting = true;
    try {
      const key = await connectionKey(base, mode);
      if (stopped) return;
      const url = new URL("/socket", base);
      url.protocol = "ws:";
      url.searchParams.set("role", mode === "solo" ? "solo" : "operator");
      url.searchParams.set("token", key);
      const ws = new WebSocket(url, { handshakeTimeout: 3000 });
      socket = ws;
      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === "state") {
            gate.update(message.state as RoomState | Snapshot, Date.now());
            lastStateAt = Date.now();
            arm();
          } else if (message.type === "error")
            console.log(`Game: ${message.message}`);
          else if (message.type === "auth-error") ws.close();
        } catch {
          ws.close();
        }
      });
      ws.on("open", () =>
        console.log(
          mode === "solo"
            ? "Solo connected. Open /solo; knobs work before starting and during play."
            : "Workshop connected. Open the operator screen and start a pair on the host to enable the knobs.",
        ),
      );
      ws.on("error", () => ws.close());
      ws.on("close", () => {
        socket = null;
        gate.reset();
        arm();
        if (!stopped)
          console.log("Game disconnected. Knobs disabled; retrying…");
      });
    } catch {
      if (!stopped)
        console.log("Waiting for the game. Run pnpm dev in another terminal.");
    } finally {
      connecting = false;
    }
  };
  serial.on("data", (chunk: Buffer) => {
    for (const line of lines.push(chunk.toString("utf8"))) {
      const step = parseKnobLine(line);
      if (step === "ready") {
        diagnosticSeq = 0;
        gate.reset();
        console.log("ESP32 firmware ready.");
        arm(true);
      } else if (step?.type === "pins") {
        // Diagnostic readings are never sent as game commands.
        if (inspect) {
          receivedPins = true;
          console.log(
            `${TEAM_NAMES[KNOB_CATEGORIES[step.knob]]}: yellow G${step.pinA}=${step.a ? "HIGH" : "LOW"} (changes ${step.changesA}), orange G${step.pinB}=${step.b ? "HIGH" : "LOW"} (changes ${step.changesB})`,
          );
        }
      } else if (step) {
        if (monitor && step.epoch === "monitor" && step.seq > diagnosticSeq) {
          diagnosticSeq = step.seq;
          console.log(
            `${TEAM_NAMES[KNOB_CATEGORIES[step.knob]]} ${mapKnob(step).delta > 0 ? "+1" : "−1"}`,
          );
        } else if (!monitor) {
          const command = gate.command(step, Date.now());
          if (
            command &&
            socket?.readyState === WebSocket.OPEN &&
            socket.bufferedAmount === 0
          )
            socket.send(JSON.stringify(command));
        }
      }
    }
  });
  serial.on("error", () =>
    stop(
      "Cannot use that USB port. Check the cable and close Arduino Serial Monitor.",
    ),
  );
  serial.on("close", () =>
    stop("USB disconnected. Reconnect, then run the bridge again."),
  );
  const timer = setInterval(() => {
    if (
      inspect &&
      inspectStarted &&
      !receivedPins &&
      !warnedFirmware &&
      Date.now() - inspectStarted > 8000
    ) {
      warnedFirmware = true;
      console.log(
        "No pin diagnostics received. Upload the updated firmware, then run this task again.",
      );
    }
    if (!monitor && socket && lastStateAt && Date.now() - lastStateAt > 2000) {
      gate.reset();
      socket.terminate();
    }
    arm(true);
    void connect();
  }, 1000);
  process.once("SIGINT", () => stop());
  process.once("SIGTERM", () => stop());
  serial.open((error) => {
    if (error) {
      stop(
        "Could not open the ESP32. Check the port and close Arduino Serial Monitor.",
      );
      return;
    }
    console.log(
      inspect
        ? "G15/G21 diagnostic ready (now Animal). Turn that knob slowly for a full revolution. Both change counters should increase; they are electrical transitions, not click counts."
        : monitor
          ? "USB monitor ready. Turn one knob; each click should print one step."
          : "USB open. Waiting for the game and ESP32 firmware…",
    );
    inspectStarted = Date.now();
    arm(true);
    void connect();
  });
}
