import type { Category, Combination, Phase, Command } from "./game";
export type Role = "host" | "participant" | "operator" | "display";
export interface Pair {
  id: string;
  operator: string;
  caller: string;
  scores: number[];
  status: "waiting" | "playing" | "complete";
  rank: number | null;
}
export interface Member {
  id: string;
  nickname: string;
  category: Category;
  slot: number;
  online: boolean;
  forced?: boolean;
}
export interface RoomState {
  code: string;
  role: Role;
  roundsPerPair: number;
  rehearsal: boolean;
  activePairId: string | null;
  pairs: Pair[];
  counts: Record<
    Category,
    { human: number; online: number; simulated: number }
  >;
  members?: Member[];
  operatorKey?: string;
  me?: Member & {
    choice: number;
    selected: boolean;
    forced: boolean;
    votedRound: number;
  };
  game: {
    phase: Phase;
    paused: boolean;
    round: number;
    remaining: number;
    phaseDuration: number;
    selection: Combination;
    target?: Combination;
    tallies?: Record<Category, number[]>;
    result: { score: number } | null;
    openSeconds: number;
  };
}
export type RoomCommand =
  | { type: "add-pair"; operator: string; caller: string }
  | { type: "remove-pair"; id: string }
  | { type: "start-pair"; id: string }
  | {
      type: "configure-room";
      rounds: number;
      rehearsal: boolean;
      openSeconds: number;
    }
  | { type: "pause" | "resume" }
  | { type: "vote"; choice: number; round: number; pairId: string | null }
  | (Extract<Command, { type: "turn" }> & { pairId: string | null })
  | { type: "force-voter"; id: string; enabled: boolean }
  | { type: "remove-member"; id: string };
export const TEAM_NAMES: Record<Category, string> = {
  animal: "Animal",
  colour: "Colour",
  accessory: "Accessory",
};
