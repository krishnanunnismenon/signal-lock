---
name: Signal Lock
description: Character press — a vivid, tactile workshop game instrument.
colors:
  blue: "#244ee8"
  yellow: "#f5e84a"
  cream: "#f5f0df"
  ink: "#16211e"
  orange: "#f26940"
  stage-note: "#1b42d0"
  inspector: "#e5e3d4"
  red-choice: "#ed6148"
  blue-choice: "#57bcea"
  green-choice: "#83c35b"
  yellow-choice: "#f2cd42"
typography:
  display:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "clamp(46px, 5.8vw, 84px)"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "-0.025em"
  timer:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "clamp(120px, 12vw, 200px)"
    fontWeight: 900
    lineHeight: 0.8
    letterSpacing: "-0.04em"
  title:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0"
  wordmark:
    fontFamily: '"Archivo Black", sans-serif'
    fontSize: "26px"
    letterSpacing: "-0.04em"
  body:
    fontFamily: '"Archivo Variable", sans-serif'
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.65
  label:
    fontFamily: '"Archivo Variable", sans-serif'
    fontSize: "12px"
    fontWeight: 850
rounded:
  field: "3px"
  button: "4px"
  toast: "5px"
  circle: "50%"
spacing:
  compact: "8px"
  control: "12px"
  section: "20px"
  broad: "24px"
components:
  button-play:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    rounded: "{rounded.button}"
    padding: "0 15px"
    height: "46px"
  button-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    rounded: "{rounded.field}"
    padding: "12px 24px"
  button-step:
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    width: "45px"
    height: "45px"
    padding: "0"
  button-icon:
    textColor: "{colors.ink}"
    rounded: "{rounded.circle}"
    width: "44px"
    height: "44px"
  button-text:
    textColor: "{colors.ink}"
    padding: "10px 0"
  field:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  phase-rail:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    height: "35px"
  voter-tile:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
  voter-tile-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
---

# Design System: Signal Lock

## Overview

**Creative North Star: "Character press"**

Character press makes collective choice a toy you can operate. Broad cobalt, acid-yellow, and warm cream planes frame chunky assembled characters, tall condensed lettering, and physical rotary controls. The composition is direct, playful, and legible at a distance.

Flat printed surfaces carry information; depth belongs to the toy figures and knobs. Strong ink rules divide regions without a card scaffold. Motion seats a changed part or settles a control, then stops. This captures the approved Character press world and its implemented solo rehearsal surface, not future workshop screens.

**Key Characteristics:**
- Continuous colour planes with strong ink boundaries.
- Tall Barlow Condensed display type, Archivo Black wordmark, and Archivo Variable supporting text.
- Procedural toy characters paired with tactile detented controls.
- Short state-driven motion and a reduced-motion no-travel path.

## Colors

The palette behaves like bold printed ink around warm moulded objects. Frontmatter values are normative and come from the built source, not the slightly varying generated preview.

### Primary

- **Cobalt Assembly Blue** (`blue`): the open character comparison field.

### Secondary

- **Acid Timing Yellow** (`yellow`): the timing, score, and audience plane; also a small matching accent on blue.
- **Vermilion Action** (`orange`): active phase, dial index, and keyboard focus for most controls.

### Tertiary

- **Choice Red, Blue, Green, and Yellow** (`red-choice`, `blue-choice`, `green-choice`, `yellow-choice`): shared character paint and vote-segment identities. These are data colours, not alternate page backgrounds.

### Neutral

- **Warm Control Cream** (`cream`): control deck, masthead, fields, and light lettering.
- **Workshop Ink** (`ink`): typography, rules, and solid actions.
- **Deep Cobalt Note** (`stage-note`): subordinate explanatory strip within the blue field.
- **Muted Inspector Paper** (`inspector`): the optional messages/settings region.

**The Continuous Plane Rule.** Keep the main fields flat and edge-to-edge; shading is local to physical objects.

## Typography

Self-hosted Barlow Condensed supplies the display hierarchy at weights 800 and 900. Archivo Black belongs to the wordmark; Archivo Variable supplies controls, labels, and prose. The final display custom property resolves to Barlow Condensed, superseding its earlier declaration.

Large condensed text makes the game readable across a room while preserving space for the figures. Stage labels are uppercase; category headings remain mixed case. The frontmatter describes the default desktop roles; responsive overrides are intentional.

- **Display:** paired stage headings, with tight tracking and compact leading.
- **Timer:** extra-bold tabular figures; the ready state uses a smaller mixed-case word inside this role.
- **Title:** category headings; phase headings and character names use the same condensed family at smaller scales.
- **Wordmark:** a compact, wide, heavy identity that contrasts with the tall display.
- **Body:** the documented body role is inspector prose, limited to 75ch. Most in-game supporting copy is denser (9–14px).
- **Label:** bold uppercase category and rail text. Numeric scores and rounds use tabular numerals where assigned in source.

At desktop widths and viewport heights up to 950px, the timer becomes 110px with 28px phase titles. Up to 850px high it becomes 98px with 24px phase titles; stage headings use `clamp(41px, 5vw, 64px)` and category titles are 34px. From 701–1000px wide the timer is 72px. At phone widths the stage heading is `clamp(32px, 8vw, 49px)`, the timer 64px, and category titles 29px. Preserve the final cascade rather than restoring earlier, superseded declarations.

## Layout

The implemented rehearsal uses an edge-to-edge instrument: masthead, four-part phase rail, comparison/timing region, three equal control stations, and utility footer. Its desktop board uses `minmax(0, 1fr) minmax(280px, 29%)`; at widths up to 1000px the timing column is 265px. The character stage always divides into two equal comparison lanes.

At 701px and above, board height is `clamp(370px, calc(100svh - 401px), 780px)`. At desktop heights up to 850px it is `calc(100svh - 332px)` with a 370px minimum, and the control deck compresses from a 260px minimum to 190px. This keeps the controls reachable on short laptops without shrinking the characters into thumbnails.

At 700px and below, the stage stacks above the timing region. The yellow region keeps a two-column internal grid, and all three controls remain side by side. Step buttons move beneath each knob; desktop keyboard hints disappear. The character canvas is 200px high, reducing to 190px at 390px and below. Natural vertical scrolling is allowed; horizontal overflow is not part of the composition.

Spacing is compact around data and generous around physical controls. The extracted spacing entries are recurring values, not a comprehensive imposed scale. Inspector content changes from two columns to one on phones. The optional inspector follows the game in document flow.

The implemented workshop extension carries this same Character press system into a participant phone, host desk, and dedicated operator surface. The phone orders phase/countdown, full target, four voting pads in a two-column grid, receipt, and fixed two-part bottom navigation. Its canvas is 160px high; the shell is at most 500px wide, with bottom padding and safe-area allowance keeping scrolling content above navigation.

The host places the live stage and pair queue alongside the yellow audience/settings region, with separate QR and leaderboard views. Three labelled category codes use the existing flat colour planes; their columns stack on phones. The operator surface shows one selection figure above the three control stations and omits the target; the original paired comparison remains specific to solo rehearsal.

## Elevation & Depth

Main surfaces are flat and separated by ink rules. Knobs use a ridged conic bezel, a softly lit radial face, and structural inset/outset shadows. Characters use real Three.js geometry with lighting and a shadow-receiving floor. The error toast is the only floating message surface. Exact shadow strings and motion values live in the sidecar.

**The Physical Depth Rule.** Let characters and controls carry volume; keep information planes visually printed.

Changed character parts seat through a short squash/rotation/head bounce. Knobs settle into quarter-turn detents. Phase changes use a short scale/vertical settle. Rendering is on demand; device pixel density is capped at 1.5. Reduced motion removes travel, CSS animation, and transitions rather than substituting another loop.

## Shapes

Continuous rectangular fields, thin dividing rules, and tight corners form the interface. Major boundaries use 2px ink rules; quieter separators use 1px strokes. Small action and field corners use the extracted radii. Circles are reserved for rotary controls, icon-button hit areas, status dots, and choice markers. The mascots use chunky rounded volumes with strong animal/accessory silhouettes.

## Components

### Buttons

The main play action is an ink rectangle with cream text, an inline play/pause icon, and a desktop Space hint. Hover lightens ink to `#344033`; active presses down 2px. Its default height is in frontmatter, with 42px short-desktop and 44px phone variants. The focus ring uses ink against the yellow field.

Inspector solid actions share the ink/cream pairing with tighter corners. Step buttons are outlined, square controls; their hover fill is `#e1ddcb`. Icon buttons have circular hit areas with `#dedbcb` hover fill. Text actions remain underlined. Disabled buttons use opacity 0.38. Most controls retain a 44px minimum height, with the explicit short-desktop play exception above.

### Inputs / Fields

Inspector inputs and selects have cream fill, a quiet `#767d6a` border, tight corners, and labels above. Focus uses a 3px cobalt outline with a 3px offset. Disabled inspector fieldsets fade to opacity 0.45. No field-error treatment is established; transport errors appear in the ink toast.

### Navigation

The masthead keeps identity, rehearsal mode, round, and settings in a single compact row. The phase rail is a four-part progress display, not a set of navigation links. Active phase uses vermilion, with textual phase names always present. Inspector tab buttons use a 3px underline with 9px offset for the selected view.

### Voter Tiles

The inspector's compact rectangular tiles sit in five columns, with a small colour dot and voter number. Eligible selected tiles invert to ink with cream text. They are explanatory status tiles, not standalone action buttons.

### Rotary Controls

Each category has a name, current choice, knob, and previous/next buttons. The knob is a semantic slider with its value supplied as text. Desktop touch area/bezel sizes are 155/143px, short-desktop 111/103px, and phone 80/77px. The orange index rotates in 90-degree steps; dragging, focused arrow keys, and labelled step buttons reach the same selections. The sidecar preview is a static visual specimen; application event handling remains in React.

### Characters and Vote Strips

Procedural characters show the target and selection at equal scale. Animal, colour, and accessory labels remain in HTML, with a text fallback when WebGL is unavailable. No shipping raster is used. The central arrow makes the comparison explicit.

Vote strips are narrow, flat segmented bars whose widths derive from actual tallies. Category, leading choice, and count sit outside the strip. Data colours are shared with the character choices; separators keep adjacent segments readable. They are not decorative progress meters.

### Workshop Voting and Navigation

The four vote pads have thin ink borders, tight corners, condensed choice labels, live counts, and a bottom tally strip. Phone pads are at least 96px high. A chosen pad inverts to ink/cream and names “Your vote”; its strip turns yellow. Locked pads remain fully legible, while plain-language status and the receipt explain voting permission and acknowledgement. The bottom Vote/Leaderboard switch uses a yellow active plane and `aria-current`.

### Host Queue and Pair Ranks

The host queue presents operator/caller names, progress, and direct turn actions in ruled rows. Settings expose the equal round count, human/simulation totals, and the labelled rehearsal override. Completed pairs alone enter the leaderboard; active progress is separate. Circular rank badges carry condensed numerals, and every row with `data-rank="1"` receives the same yellow badge, including tied leaders. The default five rounds or session-wide custom count applies equally to every pair.

## Do's and Don'ts

### Do:

- Do keep the two comparison figures equally visible and preserve their text labels.
- Do reserve dimensional shading for characters and rotary controls.
- Do read the final CSS cascade when extending responsive typography.
- Do preserve keyboard, pointer, and visible-focus access to the controls.
- Do keep timing, scores, vote strips, and phase emphasis tied to actual state.

### Don't:

- Don't replace the continuous colour planes with a grid of floating cards.
- Don't use the approved preview raster as a shipping character or interface asset.
- Don't introduce glass, neon glow, photographic texture, or gradients across the main surfaces.
- Don't use colour alone to identify selections or communicate matching.
- Don't add perpetual animation or remove the reduced-motion path.
