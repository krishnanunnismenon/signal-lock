import { test } from "node:test";
import assert from "node:assert/strict";
import { Workshop, type Actor } from "./room.js";
import { CATEGORIES } from "../shared/game.js";
const host: Actor = { role: "host" };
function addPair(
  room: Workshop,
  operator = "Test operator",
  caller = "Test caller",
) {
  assert.equal(
    room.command(host, { type: "add-pair", operator, caller }, 0),
    null,
  );
  return room.pairs.at(-1)!;
}
function player(room: Workshop, category = "animal") {
  const joined = room.join(room.code, category, "Tester");
  const actor: Actor = { role: "participant", token: joined.token };
  return { joined, actor };
}
test("joining claims one of 20 slots, bots never overwrite humans, connection survives snapshots and rounds", () => {
  const room = new Workshop();
  const { actor } = player(room);
  const member = room.snapshot(actor, 0).me!;
  assert.equal(room.snapshot(host, 0).counts.animal.simulated, 19);
  const pair = addPair(room);
  room.command(host, { type: "start-pair", id: pair.id }, 0);
  assert.equal(
    room.command(
      actor,
      { type: "vote", choice: 3, round: 1, pairId: pair.id },
      1,
    ),
    null,
  );
  for (let now = 500; now < 12000; now += 500) room.tick(now);
  assert.equal(room.game.teams.animal.voters[member.slot].choice, 3);
  room.tick(23000);
  assert.equal(room.game.teams.animal.voters[member.slot].choice, 3);
  room.connection(actor, 1);
  room.connection(actor, 1);
  room.connection(actor, -1);
  assert.equal(room.snapshot(actor, 23000).me?.online, true);
  for (let i = 1; i < 20; i++) player(room);
  assert.throws(() => player(room), /20 people/);
  for (const c of CATEGORIES)
    assert.equal(
      room.game.teams[c].tallies.reduce((a, b) => a + b),
      20,
    );
});
test("participant is bound to their own team and slot and cannot act as host or operator", () => {
  const room = new Workshop();
  const { actor } = player(room, "colour");
  const pair = addPair(room);
  room.command(host, { type: "start-pair", id: pair.id }, 0);
  const animal = room.game.teams.animal.voters.map((v) => v.choice);
  assert.equal(
    room.command(
      actor,
      {
        type: "vote",
        category: "animal",
        voter: 19,
        choice: 2,
        round: 1,
        pairId: pair.id,
      },
      1,
    ),
    null,
  );
  assert.deepEqual(
    room.game.teams.animal.voters.map((v) => v.choice),
    animal,
  );
  assert.equal(room.snapshot(actor, 1).me?.choice, 2);
  for (const type of [
    "start-pair",
    "configure-room",
    "turn",
    "pause",
    "force-voter",
  ])
    assert.ok(room.command(actor, { type, pairId: pair.id }, 2));
  assert.ok(room.command({ role: "display" }, { type: "pause" }, 2));
  assert.ok(room.command({ role: "operator" }, { type: "pause" }, 2));
});
test("operator receives no target, tallies, history, or event leak in any phase, even after scoring", () => {
  const room = new Workshop();
  room.game.settings.bots = false;
  const pair = addPair(room);
  room.command(host, { type: "start-pair", id: pair.id }, 0);
  for (const at of [0, 12000, 16000, 20000]) {
    room.tick(at);
    const s = room.snapshot({ role: "operator" }, at);
    assert.equal("target" in s.game, false);
    assert.equal("tallies" in s.game, false);
    assert.equal("events" in s.game, false);
    assert.equal("history" in s.game, false);
    assert.equal(s.members, undefined);
    assert.equal(s.operatorKey, undefined);
    assert.equal(JSON.stringify(s).includes('"target"'), false);
  }
});
test("five rounds score exactly once then stop; custom rules lock; equal totals share rank", () => {
  const room = new Workshop();
  room.game.settings.bots = false;
  for (let i = 0; i < 2; i++) {
    const start = i * 120000;
    const p = addPair(room, "Operator " + i, "Caller " + i);
    assert.equal(
      room.command(host, { type: "start-pair", id: p.id }, start),
      null,
    );
    assert.ok(
      room.command(
        host,
        { type: "configure-room", rounds: 2, rehearsal: true, openSeconds: 12 },
        start + 1,
      ),
    );
    for (let r = 0; r < 5; r++) {
      room.tick(start + r * 23000 + 16000);
      room.game.selection = { ...room.game.target };
      room.tick(start + r * 23000 + 20000);
    }
    room.tick(start + 115000);
    assert.equal(room.game.phase, "idle");
    assert.equal(room.game.round, 5);
    assert.deepEqual(p.scores, [3, 3, 3, 3, 3]);
    assert.equal(p.status, "complete");
    assert.equal(p.rank, 1);
    assert.ok(
      room.command(host, { type: "start-pair", id: p.id }, start + 116000),
    );
  }
  assert.deepEqual(
    room.pairs.map((p) => p.rank),
    [1, 1],
  );
});
test("custom turn, frozen deadline, old pair input, and rehearsal override are enforced", () => {
  const room = new Workshop();
  room.game.settings.bots = false;
  const { actor, joined } = player(room);
  assert.equal(
    room.command(
      host,
      { type: "configure-room", rounds: 1, rehearsal: true, openSeconds: 4 },
      0,
    ),
    null,
  );
  assert.equal(
    room.command(
      host,
      { type: "force-voter", id: joined.id, enabled: true },
      0,
    ),
    null,
  );
  const p = addPair(room);
  room.command(host, { type: "start-pair", id: p.id }, 0);
  room.tick(4000);
  assert.equal(room.snapshot(actor, 4000).me?.selected, true);
  assert.equal(
    room.command(
      actor,
      { type: "vote", choice: 2, round: 1, pairId: p.id },
      4500,
    ),
    null,
  );
  assert.ok(
    room.command(
      actor,
      { type: "vote", choice: 1, round: 1, pairId: p.id },
      8000,
    ),
  );
  room.tick(15000);
  assert.equal(p.scores.length, 1);
  assert.equal(p.status, "complete");
  const next = addPair(room);
  room.command(host, { type: "start-pair", id: next.id }, 16000);
  assert.ok(
    room.command(
      actor,
      { type: "vote", choice: 1, round: 1, pairId: p.id },
      16001,
    ),
  );
  const real = new Workshop();
  const member = player(real);
  real.command(
    host,
    { type: "configure-room", rounds: 5, rehearsal: false, openSeconds: 12 },
    0,
  );
  assert.ok(
    real.command(
      host,
      { type: "force-voter", id: member.joined.id, enabled: true },
      0,
    ),
  );
});
test("released participants cannot reclaim authority and slot becomes simulated again", () => {
  const room = new Workshop();
  const { joined, actor } = player(room);
  assert.ok(room.authenticate("participant", joined.token));
  assert.equal(
    room.command(host, { type: "remove-member", id: joined.id }, 0),
    null,
  );
  assert.equal(room.authenticate("participant", joined.token), null);
  assert.equal(room.snapshot(host, 0).counts.animal.simulated, 20);
  assert.ok(
    room.command(actor, { type: "vote", choice: 1, round: 0, pairId: null }, 0),
  );
  assert.equal(room.authenticate("host", "wrong"), null);
});
