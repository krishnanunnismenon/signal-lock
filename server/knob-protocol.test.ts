import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KnobGate,
  KnobLines,
  parseKnobLine,
  type KnobStep,
} from "./knob-protocol.js";
import { GameEngine } from "./engine.js";
import { Workshop } from "./room.js";

function playing() {
  const room = new Workshop();
  room.command(
    { role: "host" },
    { type: "add-pair", operator: "Knob test", caller: "Caller" },
    0,
  );
  room.command(
    { role: "host" },
    { type: "start-pair", id: room.pairs[0].id },
    0,
  );
  const gate = new KnobGate();
  gate.update(room.snapshot({ role: "operator" }, 0), 0);
  return { room, gate };
}
function step(gate: KnobGate, seq = 1, knob = 0, delta: -1 | 1 = 1): KnobStep {
  return { v: 1, type: "turn", epoch: gate.epoch!, seq, knob, delta };
}

test("G15 diagnostics accept both logic levels and reject corrupt readings", () => {
  const pins = {
    v: 1,
    type: "pins",
    knob: 2,
    pinA: 15,
    pinB: 21,
    a: 1,
    b: 0,
    changesA: 0,
    changesB: 18,
  };
  assert.deepEqual(parseKnobLine(JSON.stringify(pins)), pins);
  for (const change of [
    { a: 2 },
    { b: "0" },
    { changesA: -1 },
    { changesB: 1.5 },
    { pinA: 40 },
    { knob: 3 },
  ])
    assert.equal(parseKnobLine(JSON.stringify({ ...pins, ...change })), null);
});

test("USB framing handles partial reads and discards boot noise, malformed and oversized lines", () => {
  const lines = new KnobLines();
  assert.deepEqual(lines.push('{"v":1,'), []);
  assert.deepEqual(lines.push('"type":"ready"}\r\n'), [
    '{"v":1,"type":"ready"}',
  ]);
  assert.deepEqual(
    lines.push("x".repeat(10000) + '\n{"v":1,"type":"ready"}\n'),
    ['{"v":1,"type":"ready"}'],
  );
  assert.equal(parseKnobLine("rst:0x1 boot:0x13"), null);
  assert.equal(parseKnobLine('{"v":1,"type":"ready"}'), "ready");
  const { gate } = playing();
  const valid = step(gate);
  assert.deepEqual(parseKnobLine(JSON.stringify(valid)), valid);
  for (const change of [
    { v: 2 },
    { knob: 3 },
    { knob: -1 },
    { delta: 2 },
    { seq: 0 },
    { seq: 1.5 },
    { epoch: "" },
  ])
    assert.equal(parseKnobLine(JSON.stringify({ ...valid, ...change })), null);
});

test("physical inputs use operator rules, map all knobs, wrap both directions and reject duplicates", () => {
  const { room, gate } = playing();
  for (let knob = 0; knob < 3; knob++) {
    const event = step(gate, knob + 1, knob, -1);
    const command = gate.command(event, 1)!;
    assert.equal(room.command({ role: "operator" }, command, 1), null);
    assert.equal(gate.command(event, 2), null);
  }
  assert.deepEqual(room.game.selection, { animal: 1, colour: 1, accessory: 1 });
  assert.equal(
    room.command({ role: "operator" }, gate.command(step(gate, 4), 3), 3),
    null,
  );
  assert.equal(room.game.selection.accessory, 0);
});

test("pause, a new round/pair, lost state and device reset invalidate old USB input", () => {
  const { room, gate } = playing();
  const original = room.snapshot({ role: "operator" }, 0);
  const old = step(gate);
  gate.update({ ...original, game: { ...original.game, paused: true } }, 100);
  assert.equal(gate.command(old, 101), null);
  gate.update(original, 200);
  assert.notEqual(gate.epoch, old.epoch);
  assert.equal(gate.command(old, 201), null);
  const beforeRound = step(gate);
  gate.update({ ...original, game: { ...original.game, round: 2 } }, 300);
  assert.equal(gate.command(beforeRound, 301), null);
  const beforePair = step(gate);
  gate.update({ ...original, activePairId: "another-pair" }, 400);
  assert.equal(gate.command(beforePair, 401), null);
  assert.equal(gate.command(step(gate), 2500), null);
  const beforeGap = gate.epoch;
  gate.update({ ...original, activePairId: "another-pair" }, 2500);
  assert.notEqual(gate.epoch, beforeGap);
  const beforeReset = step(gate);
  gate.reset();
  assert.equal(gate.command(beforeReset, 2501), null);
});

test("hardware can turn during frozen matching, but never after the scoring deadline", () => {
  const { room, gate } = playing();
  room.tick(16000);
  gate.update(room.snapshot({ role: "operator" }, 16000), 16000);
  assert.equal(
    room.command({ role: "operator" }, gate.command(step(gate), 16001), 16001),
    null,
  );
  const late = gate.command(step(gate, 2), 16002)!;
  assert.ok(room.command({ role: "operator" }, late, 20000));
  gate.update(room.snapshot({ role: "operator" }, 20000), 20000);
  assert.equal(gate.epoch, null);
});

test("physical positions and reversed rotation match in workshop and solo, without crossing games", () => {
  const { room, gate } = playing();
  const solo = new GameEngine();
  const soloGate = new KnobGate("solo");
  soloGate.update(solo.snapshot(0), 0);
  // The original channel 2 (15/21) now controls Animal; channel 0 controls Accessory.
  const expected = ["accessory", "colour", "animal"] as const;
  for (let channel = 0; channel < 3; channel++) {
    const workshopTurn = gate.command(step(gate, channel + 1, channel, -1), 1)!;
    const soloTurn = soloGate.command(
      step(soloGate, channel + 1, channel, -1),
      1,
    )!;
    assert.equal(workshopTurn.category, expected[channel]);
    assert.equal(soloTurn.category, expected[channel]);
    assert.equal(workshopTurn.delta, 1);
    assert.equal(soloTurn.delta, 1);
    assert.equal(solo.command(soloTurn, 1), null);
  }
  assert.deepEqual(solo.selection, { animal: 1, colour: 1, accessory: 1 });
  assert.deepEqual(room.game.selection, { animal: 0, colour: 0, accessory: 0 });
  assert.equal(gate.command(step(soloGate, 9), 2), null);
  assert.equal(soloGate.command(step(gate, 9), 2), null);
  // Reversing raw direction reverses on-screen movement, including wraparound.
  for (let seq = 4; seq <= 5; seq++)
    assert.equal(
      solo.command(soloGate.command(step(soloGate, seq, 2, 1), seq)!, seq),
      null,
    );
  assert.equal(solo.selection.animal, 3);
});

test("solo hardware follows start, pause, reset, results and stale-connection rules", () => {
  const solo = new GameEngine();
  const gate = new KnobGate("solo");
  gate.update(solo.snapshot(0), 0);
  const idle = step(gate);
  assert.ok(gate.command(idle, 1));
  assert.equal(gate.command(idle, 2), null);
  solo.command({ type: "start" }, 10);
  gate.update(solo.snapshot(10), 10);
  assert.equal(gate.command(idle, 11), null);
  const beforePause = step(gate);
  solo.command({ type: "pause" }, 20);
  gate.update(solo.snapshot(20), 20);
  assert.equal(gate.epoch, null);
  solo.command({ type: "resume" }, 30);
  gate.update(solo.snapshot(30), 30);
  assert.equal(gate.command(beforePause, 31), null);
  // Frozen matching still permits turns; the game rejects input at the deadline.
  solo.tick(16020);
  gate.update(solo.snapshot(16020), 16020);
  const frozen = gate.command(step(gate), 16021)!;
  assert.equal(solo.command(frozen, 16021), null);
  assert.ok(solo.command({ ...frozen, delta: -1 }, 20020));
  gate.update(solo.snapshot(20020), 20020);
  assert.equal(gate.epoch, null);
  solo.command({ type: "reset" }, 20030);
  gate.update(solo.snapshot(20030), 20030);
  const beforeReset = step(gate);
  solo.command({ type: "reset" }, 20040);
  gate.update(solo.snapshot(20040), 20040);
  assert.equal(gate.command(beforeReset, 20041), null);
  const current = step(gate);
  assert.equal(gate.command(current, 23000), null);
  gate.update(solo.snapshot(23000), 23000);
  assert.equal(gate.command(current, 23001), null);
  gate.reset();
  assert.equal(gate.epoch, null);
});

test("each USB mode rejects snapshots from the other game", () => {
  const { room, gate } = playing();
  const solo = new GameEngine();
  gate.update(solo.snapshot(1), 1);
  assert.equal(gate.epoch, null);
  const soloGate = new KnobGate("solo");
  soloGate.update(room.snapshot({ role: "operator" }, 1), 1);
  assert.equal(soloGate.epoch, null);
});
