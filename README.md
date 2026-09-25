# Signal Lock

A classroom matching game with participant phones, operator/caller turns, a pair leaderboard, and a full laptop rehearsal. React, Vite, TypeScript, Three.js, GSAP, and a local Node.js WebSocket server.

## Run

Requires Node.js 22.12+ (developed with Node 26) and pnpm 11.3.0. The package manager version is pinned in `package.json`.

Install pnpm using the [official setup instructions](https://pnpm.io/installation) if it is not already available.

```sh
pnpm install
pnpm dev
```

Use `pnpm install --frozen-lockfile` for a reproducible install. Commit `pnpm-lock.yaml` when dependencies change.

Open **http://127.0.0.1:5173/** on the laptop. Keep the terminal running. The host screen is available only from the laptop's loopback address; participants and the operator use the links it creates.

```sh
pnpm test
pnpm build
pnpm start
```

The built version runs at **http://127.0.0.1:3107/**. Development uses ports 5173 (page) and 3107 (game); production uses 3107 for both. Both development and production support local-network phones. Public internet hosting is not configured.

## Rehearse without an audience

1. Open **Bring the crowd → Preview on laptop** for any team.
2. Enter a nickname. This participant claims one of that team's 20 places; the other 19 remain simulated.
3. Close the preview and set the session rules before starting: five rounds by default, or a custom 1–20, and 4–60 seconds of open voting. The four-second restricted and four-second frozen phases stay fixed.
4. Add an operator and a caller under **Run the game**. Start their turn.
5. Reopen the participant preview to vote. Use **Open operator screen** in another tab to turn the knobs. The host/caller view shows the target; the operator view hides it.
6. In rehearsal mode, **Put in the five** reserves one tester per category for the next restricted phases. **Remove reservation** restores normal random selection. This override is labelled on the participant screen and unavailable in workshop mode.
7. After all rounds, the pair enters the leaderboard and the game waits for the next pair. Add names and start another turn to continue.

**Solo sandbox** (`/solo`) keeps the original independent, target-visible playground, with its own endless loop and message inspector. It does not affect the workshop leaderboard.

## Join from a real phone

Keep the laptop and phone on the same Wi-Fi. In **Bring the crowd**, select the laptop's Wi-Fi address and show each physical group its QR code: Animal, Colour, or Accessory. Scanning assigns the category; the participant enters a nickname without an account. A generic `/join` page also accepts the displayed room code and a team choice.

The optional operator QR/link opens only the operator's controls. The caller/projector link shows the target and has a leaderboard switch. Keep the operator looking at their own screen.

If scanning opens an unreachable page, check that the selected address belongs to the Wi-Fi network rather than a VPN, and that the network permits devices to connect to one another. Guest/campus network isolation or an OS firewall can prevent LAN access. The laptop preview works independently of those restrictions. Changing network addresses requires restarting the server and using the newly generated room codes.

## Rules and scoring

- Each category has 20 equally weighted votes. A human claims a simulated slot; joining never adds extra voting weight. Changing a vote replaces the previous choice.
- Default round: **12 seconds open → 4 seconds for five selected voters → 4 seconds frozen → 3 seconds result**. Operator controls remain active during the frozen phase.
- The server randomly selects among five-person subsets capable of overturning the current leader. Selection creates an opportunity, not a guaranteed swing. If no five-person subset can overturn it, the server selects any five randomly. All other votes remain counted.
- Ties retain the incumbent leader; otherwise the first tied option wins.
- At the deadline, each matching animal, colour, or accessory earns one point: 0–3 per round. Late messages cannot change a scored result.
- **Only operator/caller pairs are ranked.** The round count applies to every pair and locks when the first turn starts. Totals across completed turns determine rank; equal totals share a competition rank (for example, 1, 1, 3). In-progress pairs appear separately.
- Existing human votes carry into the next round and are labelled as carried votes until confirmed or changed. Bots never alter a claimed human slot.
- Pausing freezes the clock and all controls. If a phone disconnects, its vote and place remain; the rest of the round continues. Reopening the same team link in the same browser restores the identity. The host may release stale places.

## Controls and screens

- `/`: laptop host, session rules, pairs, audience, previews, QR codes, standings.
- `/join?room=…&team=…`: participant joining, live vote split, full target, voting and standings.
- `/operator?key=…`: operator's own character and three controls; no target in its network payload.
- `/display?room=…`: caller/projector target and standings.
- `/solo`: independent original rehearsal and teaching messages.

On operator and solo screens, use A/D for Animal, J/L for Colour, and Left/Right for Accessory when focus is outside a control. You can also drag knobs, use their step buttons, or use arrow keys on a focused knob. Space starts/pauses the solo sandbox; workshop pause belongs to the host.

## Scope and limits

Session data is **in memory**. Restarting the game server clears participants, pair scores, keys, and the room code. A browser refresh does not clear the running session. Export/storage across server restarts, public hosting, physical encoders, and failure exercises are not implemented.

The phone flow is real multiplayer transport with simulated fill, not a collection of static mockups. Host controls require a server-issued host credential obtainable only from the laptop; participants can change only their own vote. Operator payloads omit the target, tallies, vote events, and result combinations. Pair names and scores are shared room content. The local join and operator links are intended for the workshop, not public distribution.

Three.js renders on demand, caps pixel density, and uses short GSAP transitions. HTML labels survive WebGL failure; reduced-motion preference removes travel. Browser checks at phone widths are not a physical-device or classroom Wi-Fi load benchmark.

## Verification and structure

The test suite covers selection, frozen deadlines, pause, stale rounds and pairs, fixed turn length, custom rules, tied rankings, participant slots, role restrictions, target redaction, and released identities. Live transport checks additionally exercised joining, authentication, LAN host denial, and revocation. Browser checks covered voting receipts, the selected-five phase, frozen controls, full pair turns, rankings, refresh/rejoin, and operator controls.

- `server/engine.ts`: authoritative round and vote rules.
- `server/room.ts`: participant identities, pair turns, leaderboard and role projections.
- `server/index.ts`: HTTP join, role-authenticated WebSockets and built-page serving.
- `shared/game.ts`, `shared/room.ts`: shared contracts.
- `src/Workshop.tsx`, `src/useRoom.ts`: participant, host, operator and projector flows.
- `src/MascotScene.tsx`: procedural characters; `src/App.tsx`: original solo sandbox.

The approved visual system is **Character press**. `DESIGN.md` and `.impeccable/design.json` record that identity; `.impeccable/briefs/mobile.md` records this extension. Reference PNGs under `.impeccable/mocks/decision/` do not ship in the application. QR graphics are generated locally from the actual join URLs.
