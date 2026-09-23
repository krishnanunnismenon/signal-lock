# Signal Lock

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed: React, Vite, Three.js, and GSAP. Animation must work efficiently on mobile phones. TypeScript and a local Node.js game authority are proposed implementation defaults, not separately confirmed requirements.

## Users

Krishnanunni is preparing a hands-on IoT workshop for approximately 60 college students, split into Animal, Colour, and Accessory teams of about 20. A caller sees the audience target and guides an operator who cannot see it.

## Product Purpose

A physical-control matching game that teaches messages, shared state, timing, server authority, and debugging through play.

## Positioning

The audience changes a composite animal target while the stage operator reproduces its animal, colour, and accessory using three rotary controls. A restricted voting phase preserves uncertainty before a guaranteed frozen finish.

## Operating Context

First delivery is a single-laptop gameplay prototype with simulated audience voters and simulated knobs; no other users or hardware are required. The eventual workshop uses a projector, an operator phone, ESP32 encoders, and participant phones. Three category-specific QR codes are confirmed for the later multiplayer version. Public hosting and hardware integration are later work.

## Capabilities and Constraints

- Repeating loop: open voting with live matching; four seconds of restricted voting; four seconds of completely frozen target with matching still enabled; deadline scoring; a result interval; repeat.
- Five voters per category may revise their existing vote in the restricted phase. Other votes remain counted and frozen.
- Select the five randomly among combinations capable of changing the winner, based on the current votes. Selection permits a swing; it does not force one. When a swing is impossible, preserve vote strength and use a random selection (stated fallback, not separately confirmed).
- One current vote per voter; a revision replaces it. No additional vote weight.
- Score at the deadline, one point per matching category, zero to three.
- Operator sees their current selections, never the target in the eventual dedicated operator view. A solo prototype must make any target-visible rehearsal explicit.
- Simple optional message view for teaching; no technical logs on participant screens. Injected failures are deferred.
- No database, public deployment, QR join service, or real device integration is implied by the prototype.
- Initial category examples are fox/frog/owl/panda, red/blue/green/yellow, and crown/sunglasses/headphones/bow tie. They are starting content, not immutable requirements.
- Open-voting duration, result interval, tie handling, simulator behavior, and visual direction remain implementation decisions to document clearly.

## Brand Commitments

Name: Signal Lock. The user requests a highly creative, distinctive interface that avoids generic AI-generated appearance. No existing visual identity or assets are present.

## Evidence on Hand

The user supplied a detailed context transfer and clarified gameplay in this conversation. The project directory was empty. No physical integration, deployment, participant testing, or performance benchmark has been verified.

## Product Principles

- Fun and learning arise from the same actions.
- Hardware reports control state; game software assigns meaning.
- Keep deterministic rules in code and distinguish real events from simulated ones.
- Develop incrementally, first proving playability on one laptop.
- Preserve visibility and interaction speed while using animation to explain state changes.

## Accessibility & Inclusion

Large projector-readable targets, mobile-friendly controls, text labels alongside colour, keyboard operation for simulated knobs, and reduced-motion behavior. Keep stage participation voluntary in the eventual workshop.
