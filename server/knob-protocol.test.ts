import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KnobGate,
  KnobLines,
  parseKnobLine,
  type KnobStep,
} from "./knob-protocol.js";
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
  assert.deepEqual(room.game.selection, { animal: 3, colour: 3, accessory: 3 });
  assert.equal(
    room.command({ role: "operator" }, gate.command(step(gate, 4), 3), 3),
    null,
  );
  assert.equal(room.game.selection.animal, 0);
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
