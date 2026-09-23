import { test } from "node:test";
import assert from "node:assert/strict";
import { GameEngine, selectSwingVoters, winner } from "./engine.js";
import { CATEGORIES } from "../shared/game.js";

function rng(seed = 9) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}
function setup() {
  const game = new GameEngine(rng());
  game.command({ type: "configure", settings: { bots: false } }, 0);
  game.command({ type: "start" }, 0);
  return game;
}
test("ties preserve incumbent; otherwise deterministic first tied choice wins", () => {
  assert.equal(winner([7, 7, 3, 3], 1), 1);
  assert.equal(winner([7, 7, 3, 3], 2), 0);
});
test("every selected eligible group can overthrow, with five distinct existing voters", () => {
  const choices = [
    ...Array(11).fill(0),
    ...Array(5).fill(1),
    ...Array(4).fill(2),
  ];
  for (let seed = 1; seed < 25; seed++) {
    const result = selectSwingVoters(choices, 0, rng(seed));
    assert.equal(result.possible, true);
    assert.equal(new Set(result.ids).size, 5);
    const remaining = [11, 5, 4, 0];
    result.ids.forEach((id) => remaining[choices[id]]--);
    assert.ok(
      [1, 2, 3].some((c) => {
        const next = [...remaining];
        next[c] += 5;
        return winner(next, 0) !== 0;
      }),
    );
  }
});
test("unassailable majority preserves votes and falls back to random five", () => {
  const result = selectSwingVoters(Array(20).fill(0), 0, rng());
  assert.equal(result.possible, false);
  assert.equal(new Set(result.ids).size, 5);
});
test("replacement never adds a vote and restricted phase accepts only selected voters", () => {
  const game = setup();
  game.tick(12000);
  assert.equal(game.phase, "restricted");
  for (const category of CATEGORIES) {
    const team = game.teams[category];
    assert.equal(team.voters.filter((v) => v.selected).length, 5);
    const selected = team.voters.find((v) => v.selected)!;
    const other = team.voters.find((v) => !v.selected)!;
    assert.equal(
      game.command(
        {
          type: "vote",
          category,
          voter: selected.id,
          choice: (selected.choice + 1) % 4,
          round: 1,
        },
        12100,
      ),
      null,
    );
    assert.ok(
      game.command(
        { type: "vote", category, voter: other.id, choice: 2, round: 1 },
        12100,
      ),
    );
    assert.equal(
      team.tallies.reduce((a, b) => a + b),
      20,
    );
  }
});
test("freeze rejects votes, allows knobs, deadline scores exactly once and rejects late changes", () => {
  const game = setup();
  game.tick(16000);
  const frozen = { ...game.target };
  assert.equal(game.phase, "frozen");
  assert.ok(
    game.command(
      { type: "vote", category: "animal", voter: 0, choice: 2, round: 1 },
      16100,
    ),
  );
  for (const c of CATEGORIES)
    while (game.selection[c] !== game.target[c])
      assert.equal(
        game.command({ type: "turn", category: c, delta: 1, round: 1 }, 16200),
        null,
      );
  assert.deepEqual(game.target, frozen);
  assert.ok(
    game.command(
      { type: "turn", category: "animal", delta: 1, round: 1 },
      20000,
    ),
  );
  assert.equal(game.result?.score, 3);
  game.tick(20100);
  assert.equal(game.total, 3);
  assert.equal(game.history.length, 1);
  game.tick(23000);
  assert.equal(game.round, 2);
  assert.equal(game.phase, "open");
  assert.ok(
    game.command(
      { type: "turn", category: "animal", delta: 1, round: 1 },
      23100,
    ),
  );
});
test("pause preserves remaining time and no simulation or score progresses", () => {
  const game = setup();
  game.command({ type: "pause" }, 5000);
  game.tick(50000);
  assert.equal(game.snapshot(50000).remaining, 7000);
  assert.equal(game.phase, "open");
  game.command({ type: "resume" }, 50000);
  game.tick(56999);
  assert.equal(game.phase, "open");
  game.tick(57000);
  assert.equal(game.phase, "restricted");
});
test("loop-off waits after result; reset restores a clean rehearsal", () => {
  const game = new GameEngine(rng());
  game.command(
    { type: "configure", settings: { autoLoop: false, bots: false } },
    0,
  );
  game.command({ type: "start" }, 0);
  game.tick(23000);
  assert.equal(game.phase, "idle");
  assert.equal(game.history.length, 1);
  game.command({ type: "reset" }, 24000);
  assert.equal(game.total, 0);
  assert.equal(game.round, 0);
  assert.equal(game.history.length, 0);
});
