# Signal Lock

<!-- impeccable:product-schema 1 -->

## Platform and Stack

Web. Confirmed React, Vite, Three.js, GSAP. Implemented with TypeScript and a local Node.js WebSocket authority. Mobile interactions must remain efficient and accessible.

## Users and Purpose

A hands-on IoT workshop for approximately 60 college students, in Animal, Colour, and Accessory voting groups of 20. A caller sees the audience target and guides an operator who cannot see it. Play teaches messages, shared state, timing, server authority, and debugging.

## Current Milestone

The initial solo game is complete. On 2026-09-24 the user confirmed participant mobile UI, three category-specific QR codes, an operator/caller pair leaderboard, host management, and a rehearsal that works with one laptop and optionally one phone. No bulk audience is available for testing.

- A participant scans their physical group's QR, enters a nickname without an account, and claims one of 20 slots. Simulated voters fill unclaimed slots.
- Phones display the full target and their own team's live vote split, their vote, countdown, and selected-five/locked states.
- The laptop host manages pair names, starts and pauses turns, provides a participant preview, QR codes, and standings.
- The dedicated operator screen displays only their selections and timing; its network payload excludes the target and vote information. The caller/projector view sees the target.
- Only operator/caller pairs appear on the leaderboard. Default five rounds per pair, with a session-wide custom option. Equal scores share a rank. Implementation: 1–20 rounds; rules lock when the first turn starts; completed pairs enter standings and in-progress pairs remain separate.
- An explicitly labelled rehearsal override lets the host place a tester among the five. It is disabled in workshop mode.

## Gameplay Constraints

- Open voting and live matching, four seconds of restricted voting, four seconds of fully frozen target while operator controls remain active, deadline scoring, results, next round.
- Five voters per category are selected randomly among subsets capable of changing the current winner. Other votes stay counted. Their revisions replace existing votes with no added weight. If overturning is impossible, preserve weight and select five randomly.
- One point for each matching category at the deadline, zero to three per round. A workshop pair stops after its configured round count; the host starts the next pair. The independent solo sandbox keeps the original endless loop.
- Current defaults: 12 seconds open, 3 seconds result. The host can set open voting to 4–60 seconds before the first pair starts. Ties retain the incumbent where possible; otherwise the first tied option wins.
- Human votes carry between rounds, are labelled as carried, and are never changed by simulated voters. Disconnect preserves the vote and team slot until reconnect or host release.
- Animal options: fox, frog, owl, panda. Colour: red, blue, green, yellow. Accessory: crown, sunglasses, headphones, bow tie. Initial content, not permanent identity constraints.

## Operating Context and Boundaries

Local-network phone joining is implemented. Public deployment, persistence across server restarts, and controlled failure exercises remain later work. On 2026-09-25 the physical knobs arrived and USB was selected for the first integration. ESP32 firmware and a local operator bridge are prepared; exact encoder terminals, board pin labels, firmware compilation/upload, and physical calibration remain to be confirmed. Sessions live in memory, including pair rankings. The optional message inspector remains in the solo sandbox; technical details stay off participant screens.

The no-audience rehearsal uses real transport and identities with simulated fill. Testing may create clearly named rehearsal pairs; fabricated rankings must not be presented as actual workshop results. Physical mobile performance, campus network access, and a classroom-scale device load are not yet verified.

## Brand and Product Principles

Approved visual identity: **Character press**. Cobalt character fields, yellow game signals, cream controls, condensed display type, and dimensional interchangeable toys. Preserve the creative, distinctive identity; avoid generic dashboard scaffolds.

- Fun and learning come from the same actions.
- Hardware reports state; software assigns meaning.
- Server rules decide timing, permissions, votes and points.
- Preserve simulation labelling and distinguish test overrides from ordinary gameplay.
- Prioritize clear touch interactions, large readable targets, meaningful motion, and a quick voting path.

## Accessibility and Inclusion

Text alongside colour; keyboard, pointer and touch parity; visible focus and vote confirmation; reduced-motion behavior; HTML selection labels when WebGL fails. Keep participation on stage voluntary. Every pair receives the same number of scored rounds.
