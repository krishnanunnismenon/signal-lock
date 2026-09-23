import {
  CATEGORIES,
  type Category,
  type Combination,
  type Command,
  type GameEvent,
  type Phase,
  type RoundResult,
  type Settings,
  type Snapshot,
  type Team,
} from "../shared/game.js";

export function winner(tally: number[], incumbent: number): number {
  const max = Math.max(...tally);
  return tally[incumbent] === max ? incumbent : tally.indexOf(max);
}

/** Reservoir-sample uniformly over eligible five-person subsets, not just leaders. */
export function selectSwingVoters(
  choices: number[],
  incumbent: number,
  random = Math.random,
): { ids: number[]; possible: boolean } {
  const tally = [0, 0, 0, 0];
  choices.forEach((c) => tally[c]++);
  let eligible = 0;
  let chosen: number[] = [];
  const group: number[] = [];
  const visit = (start: number) => {
    if (group.length === 5) {
      const remaining = [...tally];
      group.forEach((id) => remaining[choices[id]]--);
      // If a reassignment can overthrow, concentrating all five on that challenger can too.
      const canSwing = remaining.some((_, candidate) => {
        if (candidate === incumbent) return false;
        const next = [...remaining];
        next[candidate] += 5;
        return winner(next, incumbent) !== incumbent;
      });
      if (canSwing && random() < 1 / ++eligible) chosen = [...group];
      return;
    }
    for (let i = start; i <= choices.length - (5 - group.length); i++) {
      group.push(i);
      visit(i + 1);
      group.pop();
    }
  };
  visit(0);
  if (eligible) return { ids: chosen, possible: true };
  const pool = choices.map((_, i) => i);
  for (let i = 0; i < 5; i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return { ids: pool.slice(0, 5), possible: false };
}

const blank = (): Combination => ({ animal: 0, colour: 0, accessory: 0 });
export class GameEngine {
  phase: Phase = "idle";
  round = 0;
  paused = false;
  deadline: number | null = null;
  phaseDuration = 0;
  pauseAt = 0;
  nextBotAt = 0;
  target = blank();
  selection = blank();
  total = 0;
  teams = {} as Record<Category, Team>;
  result: RoundResult | null = null;
  history: RoundResult[] = [];
  events: GameEvent[] = [];
  settings: Settings = {
    openSeconds: 12,
    resultSeconds: 3,
    autoLoop: true,
    bots: true,
  };
  private eventId = 0;
  constructor(private random = Math.random) {
    this.seedTeams();
  }
  private emit(type: string, data: Record<string, unknown>, now: number) {
    this.events.push({
      id: ++this.eventId,
      at: now,
      round: this.round,
      type,
      data,
    });
    if (this.events.length > 100) this.events.shift();
  }
  private seedTeams() {
    for (const category of CATEGORIES) {
      const favourite = Math.floor(this.random() * 4);
      const voters = Array.from({ length: 20 }, (_, id) => ({
        id,
        choice:
          this.random() < 0.38 ? favourite : Math.floor(this.random() * 4),
        selected: false,
      }));
      this.teams[category] = {
        voters,
        tallies: [0, 0, 0, 0],
        swingPossible: null,
      };
      this.recount(category);
    }
  }
  private recount(category: Category) {
    const team = this.teams[category];
    team.tallies = [0, 0, 0, 0];
    team.voters.forEach((voter) => team.tallies[voter.choice]++);
    this.target[category] = winner(team.tallies, this.target[category]);
  }
  private begin(now: number) {
    this.round++;
    this.result = null;
    this.seedTeams();
    this.setPhase("open", this.settings.openSeconds * 1000, now);
    this.emit("round.started", { simulated: true, voters: 60 }, now);
  }
  private setPhase(phase: Phase, duration: number, now: number) {
    this.phase = phase;
    this.phaseDuration = duration;
    this.deadline = now + duration;
    this.nextBotAt = now + 450;
    this.emit("phase.changed", { phase, deadline: this.deadline }, now);
  }
  tick(now: number) {
    if (this.paused || this.phase === "idle") return;
    while (this.deadline !== null && now >= this.deadline) {
      const boundary = this.deadline;
      if (this.phase === "open") {
        for (const category of CATEGORIES) {
          const team = this.teams[category];
          const selection = selectSwingVoters(
            team.voters.map((v) => v.choice),
            this.target[category],
            this.random,
          );
          team.voters.forEach(
            (v) => (v.selected = selection.ids.includes(v.id)),
          );
          team.swingPossible = selection.possible;
          this.emit(
            "voters.selected",
            {
              category,
              voterIds: selection.ids,
              swingPossible: selection.possible,
              simulated: true,
            },
            boundary,
          );
        }
        this.setPhase("restricted", 4000, boundary);
      } else if (this.phase === "restricted") {
        this.setPhase("frozen", 4000, boundary);
        this.emit("target.frozen", { ...this.target }, boundary);
      } else if (this.phase === "frozen") {
        const matched = Object.fromEntries(
          CATEGORIES.map((c) => [c, this.target[c] === this.selection[c]]),
        ) as Record<Category, boolean>;
        const score = Object.values(matched).filter(Boolean).length;
        this.result = {
          round: this.round,
          score,
          matched,
          target: { ...this.target },
          selection: { ...this.selection },
        };
        this.total += score;
        this.history = [...this.history.slice(-19), this.result];
        this.setPhase("result", this.settings.resultSeconds * 1000, boundary);
        this.emit(
          "round.scored",
          {
            score,
            target: { ...this.target },
            selection: { ...this.selection },
          },
          boundary,
        );
      } else if (this.phase === "result") {
        if (this.settings.autoLoop) this.begin(boundary);
        else {
          this.phase = "idle";
          this.deadline = null;
        }
      }
    }
    if (
      this.settings.bots &&
      now >= this.nextBotAt &&
      (this.phase === "open" || this.phase === "restricted")
    ) {
      this.nextBotAt = now + 450 + this.random() * 350;
      for (const category of CATEGORIES) {
        const team = this.teams[category];
        const candidates = team.voters.filter(
          (v) => this.phase === "open" || v.selected,
        );
        // Small bursts model independent audience revisions. Never synthesize a vote weight.
        const count = this.phase === "open" ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const voter =
            candidates[Math.floor(this.random() * candidates.length)];
          const next = (voter.choice + 1 + Math.floor(this.random() * 3)) % 4;
          this.castVote(category, voter.id, next, now);
        }
      }
    }
  }
  private castVote(
    category: Category,
    id: number,
    choice: number,
    now: number,
  ) {
    const voter = this.teams[category].voters[id];
    const previous = voter.choice;
    voter.choice = choice;
    this.recount(category);
    this.emit(
      "vote.replaced",
      { category, voterId: id, previous, choice, simulated: true },
      now,
    );
  }
  command(command: Command, now: number): string | null {
    this.tick(now);
    if (command.type === "reset") {
      this.phase = "idle";
      this.round = 0;
      this.paused = false;
      this.deadline = null;
      this.result = null;
      this.history = [];
      this.total = 0;
      this.events = [];
      this.selection = blank();
      this.target = blank();
      this.seedTeams();
      this.emit("game.reset", {}, now);
      return null;
    }
    if (command.type === "configure") {
      if (this.phase !== "idle" && !this.paused)
        return "Pause the game before changing settings.";
      const settings = command.settings;
      if (settings.openSeconds !== undefined) {
        if (
          !Number.isFinite(settings.openSeconds) ||
          settings.openSeconds < 4 ||
          settings.openSeconds > 60
        )
          return "Open voting must be 4–60 seconds.";
        this.settings.openSeconds = Math.round(settings.openSeconds);
      }
      if (settings.resultSeconds !== undefined) {
        if (
          !Number.isFinite(settings.resultSeconds) ||
          settings.resultSeconds < 2 ||
          settings.resultSeconds > 15
        )
          return "Results must be 2–15 seconds.";
        this.settings.resultSeconds = Math.round(settings.resultSeconds);
      }
      if (typeof settings.autoLoop === "boolean")
        this.settings.autoLoop = settings.autoLoop;
      if (typeof settings.bots === "boolean")
        this.settings.bots = settings.bots;
      this.emit(
        "settings.changed",
        { ...this.settings, appliesTo: "next phase of this type" },
        now,
      );
      return null;
    }
    if (command.type === "start") {
      if (this.phase !== "idle") return "A round is already in progress.";
      this.paused = false;
      this.begin(now);
      return null;
    }
    if (command.type === "pause") {
      if (this.phase === "idle" || this.paused) return null;
      this.paused = true;
      this.pauseAt = now;
      this.emit("game.paused", {}, now);
      return null;
    }
    if (command.type === "resume") {
      if (!this.paused) return null;
      const delay = now - this.pauseAt;
      if (this.deadline !== null) this.deadline += delay;
      this.nextBotAt += delay;
      this.paused = false;
      this.emit("game.resumed", {}, now);
      return null;
    }
    if (command.round !== this.round)
      return "That message belongs to an old round.";
    if (!CATEGORIES.includes(command.category)) return "Unknown category.";
    if (command.type === "turn") {
      if (this.phase === "result" || this.paused)
        return "Controls are paused until play resumes.";
      if (command.delta !== -1 && command.delta !== 1)
        return "Turn one step at a time.";
      this.selection[command.category] =
        (this.selection[command.category] + command.delta + 4) % 4;
      this.emit(
        "controller.step",
        {
          category: command.category,
          delta: command.delta,
          index: this.selection[command.category],
          simulated: true,
        },
        now,
      );
      return null;
    }
    if (command.type === "vote") {
      if (this.paused || !["open", "restricted"].includes(this.phase))
        return "Voting is closed.";
      if (
        !Number.isInteger(command.voter) ||
        command.voter < 0 ||
        command.voter >= 20 ||
        !Number.isInteger(command.choice) ||
        command.choice < 0 ||
        command.choice > 3
      )
        return "Invalid voter or choice.";
      const voter = this.teams[command.category].voters[command.voter];
      if (this.phase === "restricted" && !voter.selected)
        return "Only the selected five can change their votes.";
      this.castVote(command.category, command.voter, command.choice, now);
      return null;
    }
    return "Unknown command.";
  }
  snapshot(now: number): Snapshot {
    return {
      phase: this.phase,
      round: this.round,
      paused: this.paused,
      serverNow: now,
      deadline: this.deadline,
      remaining:
        this.deadline === null
          ? 0
          : Math.max(0, this.deadline - (this.paused ? this.pauseAt : now)),
      phaseDuration: this.phaseDuration,
      target: { ...this.target },
      selection: { ...this.selection },
      teams: this.teams,
      result: this.result,
      history: this.history,
      total: this.total,
      settings: this.settings,
      events: this.events,
    };
  }
}
