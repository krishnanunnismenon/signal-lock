import { randomUUID } from "node:crypto";
import { CATEGORIES } from "../shared/game.js";
import type { RoomCommand, RoomState } from "../shared/room.js";

export interface KnobStep {
  v: 1;
  type: "turn";
  epoch: string;
  seq: number;
  knob: number;
  delta: -1 | 1;
}

export function parseKnobLine(line: string): KnobStep | "ready" | null {
  if (line.length > 256) return null;
  try {
    const value = JSON.parse(line);
    if (!value || value.v !== 1) return null;
    if (value.type === "ready") return "ready";
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
  private state: RoomState | null = null;
  private receivedAt = 0;

  reset() {
    this.epoch = null;
    this.context = "";
    this.seq = 0;
    this.state = null;
  }

  update(state: RoomState, now: number) {
    const active =
      state.role === "operator" &&
      state.activePairId &&
      !state.game.paused &&
      ["open", "restricted", "frozen"].includes(state.game.phase);
    const context = active ? `${state.activePairId}/${state.game.round}` : "";
    if (context !== this.context || now - this.receivedAt > 2000) {
      this.epoch = context ? randomUUID() : null;
      this.seq = 0;
    }
    this.context = context;
    this.state = state;
    this.receivedAt = now;
  }

  command(step: KnobStep, now: number): RoomCommand | null {
    if (
      !this.state ||
      !this.epoch ||
      step.epoch !== this.epoch ||
      step.seq <= this.seq ||
      now - this.receivedAt > 2000
    )
      return null;
    this.seq = step.seq;
    return {
      type: "turn",
      category: CATEGORIES[step.knob],
      delta: step.delta,
      round: this.state.game.round,
      pairId: this.state.activePairId,
    };
  }
}
