# Solo rehearsal surface

Mode: operate. First delivery is a complete playable laptop prototype with phone-responsive layout; one participant controls all three knobs against simulated audience votes. Public phone joining and physical hardware remain deferred.

## Approved direction

The user explicitly picked Impeccable's pick, Character press, after being shown its actual preview. `.impeccable/mocks/decision/press.png` is the approved visual reference; its JSON records approval. The server for the older chooser disappeared, so the user's explicit text selection is the authority. Do not ask them to choose it again.

Seed ee0edab4, grounded candidate 1. Broad cobalt character field (~70%), acid-yellow timing/votes field (~30%), warm cream three-control deck. Two equally visible assembled toy figures; big tabular timer; fixed phase rail; distinct detented knobs.

## Composition and asset inventory

| Ingredient | Medium | Commitment |
| --- | --- | --- |
| Two assembled mascots and their changing accessories | Interactive Three.js meshes | Real geometry, shadows, interchangeable head/accessory, common body scale; short part-seating animation |
| Flat blue/yellow/cream fields | Semantic HTML/CSS | Continuous planes, no card scaffold |
| Headings and labels | Self-hosted Barlow Condensed / Archivo Black / Archivo Variable | Tall condensed display, bold wordmark, readable body labels; preserve visual contrast and tight hierarchy |
| Three controls | CSS geometry plus semantic buttons/slider | Tactile ridged rim, cream face, vermilion index; keyboard and touch drag parity |
| Phase / vote / countdown | HTML and GSAP | Real state, restrained transitions, never a fabricated timer |
| Message stream | HTML | Optional inspector; distinguish simulated voters and controls from real server messages |

No raster from the preview ships in the game. Interactive mascots are deliberately GPU geometry, not flattened mockup crops. All preview rasters have exact prompt provenance in their adjacent JSON and embedded PNG text.

Sampled preview colours: blue patch RGB(38,86,226), yellow RGB(245,232,78), cream RGB(244,238,223). Values vary slightly across generated lighting. Final continuous fields should retain these hue relationships; no woven/paper/photo texture exists in the product UI.

Generated numeric examples and cosmetic copy are not authoritative: percentage ticks must come from actual 20-voter tallies; 0/3 when all attributes differ; frozen phase allows knob input; rounds loop without a ten-round cap. The lower control deck must stay reachable in a short laptop viewport; on phones content flows with no horizontal scrolling.

Implementation decisions: 12 seconds open, 4 restricted, 4 frozen, 3 result; open/result durations editable when paused. Incumbent survives ties, otherwise first tied index wins. Five-voter eligibility uses uniform reservoir sampling across every eligible subset. Fallback random five when the majority is unassailable.

Signature motion: one character assembly bounce, synchronized with authoritative choice changes. Render on demand, cap pixel density, dispose meshes/materials, reduced-motion no-travel fallback. Body colour names remain visible independent of WebGL.
