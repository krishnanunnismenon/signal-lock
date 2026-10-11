import { randomUUID } from "node:crypto";
import type { Category, Snapshot } from "../shared/game.js";
import type { RoomCommand, RoomState } from "../shared/room.js";

export interface KnobStep {
  v: 1;
  type: "turn";
  epoch: string;
  seq: number;
  knob: number;
  delta: -1 | 1;
}

// Firmware channels retain their installed pin order: 22/19, 16/5, 15/21.
// Correct physical positions and rotation here, without requiring a reflash.
export const KNOB_CATEGORIES = [
  "accessory",
  "colour",
  "animal",
] as const satisfies readonly Category[];
export function mapKnob(step: KnobStep) {
  return { category: KNOB_CATEGORIES[step.knob], delta: -step.delta as -1 | 1 };
}
export type KnobMode = "workshop" | "solo";
type KnobTurn = Extract<RoomCommand, { type: "turn" }>;

export interface KnobPins {
  v: 1;
  type: "pins";
  knob: number;
  pinA: number;
  pinB: number;
  a: 0 | 1;
  b: 0 | 1;
  changesA: number;
  changesB: number;
}

export function parseKnobLine(
  line: string,
): KnobStep | KnobPins | "ready" | null {
  if (line.length > 256) return null;
  try {
    const value = JSON.parse(line);
    if (!value || value.v !== 1) return null;
    if (value.type === "ready") return "ready";
    if (value.type === "pins") {
      const nonnegative = (n: unknown) =>
        typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
      if (
        !nonnegative(value.knob) ||
        value.knob > 2 ||
        !nonnegative(value.pinA) ||
        value.pinA > 39 ||
        !nonnegative(value.pinB) ||
        value.pinB > 39 ||
        ![0, 1].includes(value.a) ||
        ![0, 1].includes(value.b) ||
        !nonnegative(value.changesA) ||
        !nonnegative(value.changesB)
      )
        return null;
      return value;
    }
    if (
      value.type !== "turn" ||
      typeof value.epoch !== "string" ||
      !/^[a-zA-Z0-9-]{1,40}$/.test(value.epoch) ||
      !Number.isSafeInteger(value.seq) ||
      value.seq < 1 ||
      !Number.isInteger(value.knob) ||
      value.knob < 0 ||
      value.knob > 2 ||
      (value.delta !== -1 && value.delta !== 1)
    )
      return null;
    return value;
  } catch {
    // ESP boot messages and incomplete/non-protocol lines are not game inputs.
    return null;
  }
}

/** Bound memory even for a noisy device that never sends a newline. */
export class KnobLines {
  private pending = "";
  private overflow = false;
  push(chunk: string): string[] {
    const result: string[] = [];
    for (const char of chunk) {
      if (char === "\n") {
        if (!this.overflow) result.push(this.pending.trim());
        this.pending = "";
        this.overflow = false;
      } else if (!this.overflow) {
        this.pending += char;
        if (this.pending.length > 256) {
          this.pending = "";
          this.overflow = true;
        }
      }
    }
    return result;
  }
}

/** A new epoch arms the device for one uninterrupted round of operator play. */
export class KnobGate {
  epoch: string | null = null;
  private context = "";
  private seq = 0;
  private turn: Pick<KnobTurn, "round" | "pairId"> | null = null;

  constructor(private readonly mode: KnobMode = "workshop") {}
  private receivedAt = 0;

  reset() {
    this.epoch = null;
    this.context = "";
    this.seq = 0;
    this.turn = null;
  }

  update(state: RoomState | Snapshot, now: number) {
    let context = "";
    this.turn = null;
    if (this.mode === "workshop" && "game" in state) {
      const active =
        state.role === "operator" &&
        state.activePairId &&
        !state.game.paused &&
        ["open", "restricted", "frozen"].includes(state.game.phase);
      if (active) {
        context = `workshop/${state.activePairId}/${state.game.round}`;
        this.turn = { round: state.game.round, pairId: state.activePairId };
      }
    } else if (this.mode === "solo" && !("game" in state)) {
      // Match solo's on-screen controls, including testing before Start round.
      if (!state.paused && state.phase !== "result") {
        const boundary = [...state.events]
          .reverse()
          .find((event) =>
            [
              "game.reset",
              "game.paused",
              "game.resumed",
              "round.started",
            ].includes(event.type),
          );
        context = `solo/${state.round}/${boundary?.id ?? 0}`;
        this.turn = { round: state.round, pairId: null };
      }
    }
    if (context !== this.context || now - this.receivedAt > 2000) {
      this.epoch = context ? randomUUID() : null;
      this.seq = 0;
    }
    this.context = context;
    this.receivedAt = now;
  }

  command(step: KnobStep, now: number): KnobTurn | null {
    if (
      !this.turn ||
      !this.epoch ||
      step.epoch !== this.epoch ||
      step.seq <= this.seq ||
      now - this.receivedAt > 2000
    )
      return null;
    this.seq = step.seq;
    return {
      type: "turn",
      ...mapKnob(step),
      ...this.turn,
    };
  }
}
