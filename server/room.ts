import { randomUUID, randomBytes } from "node:crypto";
import { GameEngine } from "./engine.js";
import { CATEGORIES, type Category, type Command } from "../shared/game.js";
import type { Member, Pair, Role, RoomState } from "../shared/room.js";
export type Actor = { role: Role; token?: string };
type Participant = Member & {
  token: string;
  votedRound: number;
  connections: number;
};
const name = (v: unknown) =>
  typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, 28) : "";
export class Workshop {
  game = new GameEngine();
  code = randomBytes(3).toString("hex").toUpperCase();
  hostKey = randomUUID();
  operatorKey = randomUUID();
  roundsPerPair = 5;
  rehearsal = true;
  pairs: Pair[] = [];
  members = new Map<string, Participant>();
  activePairId: string | null = null;
  constructor() {
    this.game.roundLimit = this.roundsPerPair;
  }
  join(code: unknown, category: unknown, nickname: unknown) {
    if (code !== this.code)
      throw new Error(
        "Room code not found. Check the code or scan the latest QR.",
      );
    if (!CATEGORIES.includes(category as Category))
      throw new Error("Choose Animal, Colour, or Accessory.");
    const nick = name(nickname);
    if (!nick) throw new Error("Enter a nickname to join.");
    const team = category as Category;
    const occupied = new Set(
      [...this.members.values()]
        .filter((m) => m.category === team)
        .map((m) => m.slot),
    );
    const slot = Array.from({ length: 20 }, (_, i) => i).find(
      (i) => !occupied.has(i),
    );
    if (slot === undefined)
      throw new Error("This team has 20 people. Ask the host for a space.");
    const token = randomUUID();
    const member: Participant = {
      id: randomUUID(),
      token,
      nickname: nick,
      category: team,
      slot,
      online: false,
      connections: 0,
      votedRound: -1,
    };
    this.members.set(token, member);
    this.game.humanSlots.add(`${team}:${slot}`);
    return { token, id: member.id };
  }
  authenticate(role: string | null, token: string | null): Actor | null {
    if (role === "host" && token === this.hostKey) return { role: "host" };
    if (role === "operator" && token === this.operatorKey)
      return { role: "operator" };
    if (role === "display" && token === this.code) return { role: "display" };
    if (role === "participant" && token && this.members.has(token))
      return { role: "participant", token };
    return null;
  }
  connection(actor: Actor, delta: number) {
    const m = actor.token && this.members.get(actor.token);
    if (m) {
      m.connections = Math.max(0, m.connections + delta);
      m.online = m.connections > 0;
    }
  }
  tick(now: number) {
    this.game.tick(now);
    this.collect();
  }
  private collect() {
    const pair = this.pairs.find((p) => p.id === this.activePairId);
    if (!pair || pair.status === "complete") return;
    pair.scores = this.game.history.map((r) => r.score);
    if (pair.scores.length >= this.roundsPerPair) pair.status = "complete";
    const completed = this.pairs.filter((p) => p.status === "complete");
    for (const p of completed)
      p.rank =
        1 + completed.filter((q) => sum(q.scores) > sum(p.scores)).length;
  }
  command(actor: Actor, raw: unknown, now: number): string | null {
    this.tick(now);
    if (!raw || typeof raw !== "object") return "Invalid message.";
    const c = raw as Record<string, any>;
    if (
      (c.type === "vote" || c.type === "turn") &&
      c.pairId !== this.activePairId
    )
      return "That message belongs to a previous pair.";
    if (actor.role === "participant") {
      const m = this.members.get(actor.token ?? "");
      if (!m) return "Your place has been released. Join the room again.";
      if (c.type !== "vote") return "This screen can only cast your vote.";
      const error = this.game.command(
        {
          type: "vote",
          category: m.category,
          voter: m.slot,
          choice: c.choice,
          round: c.round,
        },
        now,
      );
      if (!error) m.votedRound = this.game.round;
      return error;
    }
    if (actor.role === "display") return "The projector is read-only.";
    if (c.type === "turn") {
      if (!this.activePairId || this.game.phase === "idle")
        return "Wait for the host to start a pair.";
      return this.game.command(c as Command, now);
    }
    if (actor.role !== "host") return "Only the host can manage the session.";
    if (c.type === "add-pair") {
      const operator = name(c.operator),
        caller = name(c.caller);
      if (!operator || !caller)
        return "Enter both the operator and caller names.";
      if (this.pairs.length >= 40) return "This session already has 40 pairs.";
      this.pairs.push({
        id: randomUUID(),
        operator,
        caller,
        scores: [],
        status: "waiting",
        rank: null,
      });
      return null;
    }
    if (c.type === "remove-pair") {
      const pair = this.pairs.find((p) => p.id === c.id);
      if (!pair || pair.status !== "waiting")
        return "Only a waiting pair can be removed.";
      this.pairs = this.pairs.filter((p) => p.id !== c.id);
      return null;
    }
    if (c.type === "configure-room") {
      if (this.pairs.some((p) => p.status !== "waiting"))
        return "Session rules are locked once a pair starts.";
      if (!Number.isInteger(c.rounds) || c.rounds < 1 || c.rounds > 20)
        return "Choose 1–20 rounds per pair.";
      if (
        !Number.isInteger(c.openSeconds) ||
        c.openSeconds < 4 ||
        c.openSeconds > 60
      )
        return "Choose 4–60 seconds of open voting.";
      if (typeof c.rehearsal !== "boolean") return "Choose a session mode.";
      this.roundsPerPair = c.rounds;
      this.game.roundLimit = c.rounds;
      this.rehearsal = c.rehearsal;
      if (!this.rehearsal) this.game.forcedVoters.clear();
      this.game.settings.openSeconds = c.openSeconds;
      return null;
    }
    if (c.type === "start-pair") {
      const pair = this.pairs.find((p) => p.id === c.id);
      if (!pair || pair.status !== "waiting") return "Choose a waiting pair.";
      if (this.game.phase !== "idle")
        return "Wait for the current turn to finish.";
      this.activePairId = pair.id;
      pair.status = "playing";
      this.game.command({ type: "reset" }, now);
      this.game.command({ type: "start" }, now);
      return null;
    }
    if (c.type === "force-voter") {
      if (!this.rehearsal)
        return "Selection overrides are available only in rehearsal.";
      if (!["idle", "open"].includes(this.game.phase))
        return "Set this before the five-voter phase.";
      const m = [...this.members.values()].find((m) => m.id === c.id);
      if (!m) return "Participant not found.";
      if (c.enabled === true) this.game.forcedVoters.set(m.category, m.slot);
      else if (this.game.forcedVoters.get(m.category) === m.slot)
        this.game.forcedVoters.delete(m.category);
      return null;
    }
    if (c.type === "remove-member") {
      const m = [...this.members.values()].find((m) => m.id === c.id);
      if (!m) return "Participant not found.";
      this.members.delete(m.token);
      this.game.humanSlots.delete(`${m.category}:${m.slot}`);
      if (this.game.forcedVoters.get(m.category) === m.slot)
        this.game.forcedVoters.delete(m.category);
      return null;
    }
    if (c.type === "pause" || c.type === "resume")
      return this.game.command({ type: c.type }, now);
    return "Unknown command.";
  }
  snapshot(actor: Actor, now: number): RoomState {
    const s = this.game.snapshot(now);
    const members = [...this.members.values()].map(
      ({ token, connections, votedRound, ...member }) => ({
        ...member,
        forced: this.game.forcedVoters.get(member.category) === member.slot,
      }),
    );
    const me = actor.token ? this.members.get(actor.token) : undefined;
    const game: RoomState["game"] = {
      phase: s.phase,
      paused: s.paused,
      round: s.round,
      remaining: s.remaining,
      phaseDuration: s.phaseDuration,
      selection: s.selection,
      result: s.result ? { score: s.result.score } : null,
      openSeconds: s.settings.openSeconds,
    };
    // Never serialize the target, vote tallies, events, or result combinations to an operator.
    if (actor.role !== "operator") {
      game.target = s.target;
      game.tallies = Object.fromEntries(
        CATEGORIES.map((c) => [c, [...s.teams[c].tallies]]),
      ) as Record<Category, number[]>;
    }
    return {
      code: this.code,
      role: actor.role,
      roundsPerPair: this.roundsPerPair,
      rehearsal: this.rehearsal,
      activePairId: this.activePairId,
      pairs: this.pairs.map((p) => ({ ...p, scores: [...p.scores] })),
      counts: Object.fromEntries(
        CATEGORIES.map((c) => {
          const team = members.filter((m) => m.category === c);
          return [
            c,
            {
              human: team.length,
              online: team.filter((m) => m.online).length,
              simulated: 20 - team.length,
            },
          ];
        }),
      ) as RoomState["counts"],
      ...(actor.role === "host"
        ? { members, operatorKey: this.operatorKey }
        : {}),
      ...(me
        ? {
            me: {
              id: me.id,
              nickname: me.nickname,
              category: me.category,
              slot: me.slot,
              online: me.online,
              choice: s.teams[me.category].voters[me.slot].choice,
              selected: s.teams[me.category].voters[me.slot].selected,
              forced: this.game.forcedVoters.get(me.category) === me.slot,
              votedRound: me.votedRound,
            },
          }
        : {}),
      game,
    };
  }
}
export const sum = (scores: number[]) => scores.reduce((a, b) => a + b, 0);
