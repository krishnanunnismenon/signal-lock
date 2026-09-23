# Character press asset manifest

Audited 2026-09-23 against the approved `mocks/decision/press.png`, `briefs/game.md`, `src/MascotScene.tsx`, `src/styles.css`, and the consuming UI. No app source changed during this audit.

| Approved ingredient | Shipping implementation | Asset requirement |
| --- | --- | --- |
| Target and operator toy figures | Three.js procedural meshes: fox, frog, owl, panda; shared body; four selectable colours; crown, sunglasses, headphones, bow tie. MeshStandardMaterial, scene lights and real shadow geometry produce depth. | No bitmap, model download or texture map needed. |
| Assembly movement | GSAP scale, rotation and head seating animation when the authoritative combination changes; reduced-motion path and on-demand rendering. | Code only. |
| Cobalt scene, yellow clock region, cream control deck | Continuous CSS fields and responsive HTML layout. | No background raster or paper texture. |
| Three tactile rotary controls | CSS conic ridges, radial face shading and shadow; semantic slider, step buttons and keyboard hints; GSAP face rotation. | No knob sprites or rendered control images. |
| Timer, phase rail, score and voting strips | State-driven HTML/CSS, with restrained GSAP phase transitions. | No image labels or pre-rendered data graphics. |
| Headings and interface text | Locally bundled Archivo Variable and Archivo Black through installed Fontsource packages. | Font assets, not rasters. |
| Utility symbols and favicon | Inline SVG paths in `src/App.tsx`; `public/favicon.svg`. | Vector source, no raster conversion needed. |
| Messages and settings | Semantic HTML form controls and live text. | No illustrative material needed. |

## Raster outputs and provenance

**Shipping raster outputs: none.** The current source and public asset inventory contains no runtime raster dependency. The mascots must remain dynamic Three.js geometry as requested; cropping the approved comp into the game would remove the live animal/colour/accessory behavior.

`mocks/decision/press.png` is a built-in ImageGen direction preview, explicitly approved by the user, retained only as a visual reference. Its exact generation prompt is in adjacent `press.json` and embedded under the PNG `impeccable:prompt` key; this audit verified the two prompts match. The prompt's original “unapproved” wording records generation-time status; the JSON approval records the later selection. Other chooser previews remain exploration artifacts, not production dependencies.

## Missing material

No substantive raster material is missing from this direction. Toy surface depth comes from geometry and lighting; knob depth comes from CSS. Further visual fidelity work, if needed after browser review, belongs in those implementations. This inventory does not claim pixel-identical reconstruction, runtime performance validation, or completion of browser QA.
