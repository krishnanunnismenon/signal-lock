# Signal Lock

A playable solo rehearsal of the classroom matching game. Built with React, Vite, TypeScript, Three.js, GSAP, and a local Node.js WebSocket server.

## Run

Requires Node.js 22.12+ (developed with Node 26).

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. Keep the terminal running. The local game server uses port 3107; Vite uses 5173.

```sh
npm test
npm run build
npm start
```

`npm start` serves the built game at http://127.0.0.1:3107. Both servers bind to the laptop loopback interface. This first prototype does not expose a public or LAN join service.

## Play

- Start a round; Space pauses/resumes when focus is outside a button or form.
- Animal: A/D. Colour: J/L. Accessory: Left/Right arrows.
- Click the arrow buttons or drag a knob vertically. A focused knob also supports arrow keys.
- All 60 simulated participants have one current vote in a team of 20. Changing it replaces the prior vote.
- Default loop: 12 seconds open voting, 4 seconds restricted voting, 4 seconds frozen target, score 0–3, 3 seconds result, next round.
- During restricted voting, five voters per team can revise their votes. All other votes remain counted. The server selects uniformly among five-person subsets capable of overturning the current result if those voters coordinate. This creates an opportunity, not a guaranteed swing. If no subset can overturn the majority, any five are selected randomly.
- Ties retain the current leader when tied; otherwise the first tied category option wins.
- Operator choices are sampled at the deadline. A late command cannot alter a scored result. Pausing preserves remaining time.

Messages opens the structured event stream and voter inspector. It can send manual simulated votes, including ineligible votes to observe rejection. Pause and disable automatic simulated voting for controlled experiments. Settings change open/result durations and looping; new durations apply when the corresponding phase next starts.

## Scope and limits

This is an explicitly labelled solo rehearsal: the target and operator selection are both visible on one screen. There is no target-blind operator route yet. No physical device is connected. Browser phones, three category QR codes, instructor permissions, real participant identities, and ESP32 integration are later milestones. Game state is held in memory and resets when the server restarts. Browser refresh reconnects to the running game. If a browser loses its connection, controls disable and reconnect automatically; the server can continue the round.

Three.js renders the interactive toy figures on demand, with capped pixel density and short GSAP assembly transitions. Labels and controls remain semantic HTML. Reduced-motion preference removes travel. If WebGL initialization fails, the attribute labels still communicate the target and selections. Responsive browser checks are not a hardware performance benchmark on physical phones.

## Structure

- `server/engine.ts`: deterministic phase, vote, selection, scoring and message logic.
- `server/index.ts`: local authority and WebSocket transport.
- `shared/game.ts`: categories and message contracts.
- `src/App.tsx`: rehearsal, controls and teaching inspector.
- `src/MascotScene.tsx`: procedural interactive character models.
- `server/engine.test.ts`: rule and deadline tests.

The chosen visual direction is Character press. The approved image preview and its prompt are recorded under `.impeccable/mocks/decision/`; those images are design references and are not downloaded by the application.

`DESIGN.md` records the implemented colours, typography, layout, and component rules. `.impeccable/design.json` supplies the matching component preview definitions.
