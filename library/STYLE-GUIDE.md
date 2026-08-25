# Agent Wall Style Guide

## Direction

- Use a dark, gallery-like canvas with one violet accent (`#7c5cff`), warm white text, and cool grey supporting copy.
- Pair oversized editorial headlines with compact, highly legible interface typography. Motion is restrained and honors `prefers-reduced-motion`.
- Avoid nostalgia cosplay. Agent Wall should feel current, useful, evidence-disciplined, and premium.

## Foundations

- Spacing follows an 8px rhythm. Core tokens are exposed as `--space-1` through `--space-7`.
- Surfaces use `--surface`, `--surface-raised`, `--line`, and three radii: 12px, 20px, and 28px.
- Desktop content is capped at 1200px. The flagship changes from two columns to one at 880px and receives tighter mobile spacing below 600px.
- At 390px, every grid track uses `minmax(0, 1fr)`, supporting copy may wrap at any word boundary, and the stats collapse to one column. Do not mask layout defects with horizontal overflow clipping.
- Focus rings must be visible. Information and inventory state must never rely on color alone.

## Components and states

- `.site-nav`, `.hero-section`, and `.inventory-section` are the named page regions.
- `.btn` is the shared control; stack `.primary` for the accent variant and use native `disabled` state.
- `.stat-card`, `.canvas-panel`, and `.selection-panel` are the core surfaces.
- `.value-section` and `.trust-section` use evidence-led cards to explain buyer value, objections, pricing, and privacy without competing calls to action.
- `.status-pill` always discloses prototype/payment state. Never imply live demand, verified ownership, or real reservations.
- `.legend` labels available, illustrative demo-claimed, and selected inventory states.
- `.feedback` provides non-blocking inline success/error messaging; native `alert()`, `confirm()`, and `prompt()` are prohibited.
- `.site-footer` links the complete trust layer from every purchase-facing page. `.policy-page` and `.policy-section` provide the narrow, readable long-form policy layout.
- Empty selection is explicit (`No tile selected`); loading uses `.loading-state`; errors should reuse `.feedback` with clear recovery copy.

## Interaction

- The canvas supports pointer and arrow-key selection, carries a useful accessible label, and has a visible focus ring.
- Selection and feedback announce changes through polite live regions.
- The mobile action is full-width and the detail panel loses sticky positioning once the layout collapses.
