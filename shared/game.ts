export const CATEGORIES = ["animal", "colour", "accessory"] as const;
export type Category = (typeof CATEGORIES)[number];
export const OPTIONS: Record<Category, string[]> = {
  animal: ["Fox", "Frog", "Owl", "Panda"],
  colour: ["Red", "Blue", "Green", "Yellow"],
  accessory: ["Crown", "Sunglasses", "Headphones", "Bow tie"],
};
export const COLOURS = ["#ed6148", "#57bcea", "#83c35b", "#f2cd42"];
export type Combination = Record<Category, number>;
export type Phase = "idle" | "open" | "restricted" | "frozen" | "result";
export interface Voter {
  id: number;
  choice: number;
  selected: boolean;
}
export interface Team {
  voters: Voter[];
  tallies: number[];
  swingPossible: boolean | null;
}
export interface GameEvent {
  id: number;
  at: number;
  round: number;
  type: string;
  data: Record<string, unknown>;
}
export interface RoundResult {
  round: number;
  score: number;
  matched: Record<Category, boolean>;
  target: Combination;
  selection: Combination;
}
export interface Settings {
  openSeconds: number;
  resultSeconds: number;
  autoLoop: boolean;
  bots: boolean;
}
export interface Snapshot {
  phase: Phase;
  round: number;
  paused: boolean;
  serverNow: number;
  deadline: number | null;
  remaining: number;
  phaseDuration: number;
  target: Combination;
  selection: Combination;
  teams: Record<Category, Team>;
  result: RoundResult | null;
  history: RoundResult[];
  total: number;
  settings: Settings;
  events: GameEvent[];
}
export type Command =
  | { type: "start" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "reset" }
  | { type: "turn"; category: Category; delta: number; round: number }
  | {
      type: "vote";
      category: Category;
      voter: number;
      choice: number;
      round: number;
    }
  | { type: "configure"; settings: Partial<Settings> };
