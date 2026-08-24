# FLINT — Design System

Single source of truth for Flint's interface. Every rule here is concrete and enforced in code (`app/globals.css` tokens + `components/ui/*`).

Flint is **developer infrastructure**. The interface must communicate precision, control, trust, engineering, speed. It should feel like a tool engineers choose, not a template.

---

## 1. Visual identity

- **Foundation**: near-black layered surfaces with structure conveyed by borders first, shadows second.
- **Accent**: a single amber (`#f59e0b` family) — the "spark" of flint stone. Used for brand, primary actions, focus, and active states. Never decorative.
- **Status colors are semantic only**: green = serving, red = destructive/disabled-by-rule, amber = attention (protected envs, unsaved), blue = informational.
- **Depth is earned**: one elevation step max inside a view; overlays may float.
- **Density**: compact-but-readable. Table rows 40–44px; form controls 36–38px; generous section spacing (48px+) between concerns.

## 2. Typography

| Token | Value | Usage |
| --- | --- | --- |
| Font stack | Geist Sans (`--font-sans`) | All UI text |
| Mono stack | Geist Mono (`--font-mono`) | Flag keys, code, tokens, buckets, IPs, JSON |
| Display | 32/600/-0.02em | Landing hero |
| Title | 20/600/tracking-tight | Page titles |
| Section | 14/500 `text-secondary→primary` | Card/section headers |
| Body | 13–14/400 | Default content |
| Caption | 12/400 `text-muted` | Meta, timestamps, hints |

Rules:
- Flag keys, API tokens, environment keys, and any machine value render in mono, always.
- Numerals in tables use tabular alignment via mono or `tabular-nums`.
- No font below 12px. Line length for prose ≤ 72ch.

## 3. Spacing scale

Base 4px. Allowed steps: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`.

- Inside components: 8/12/16.
- Between related blocks: 16/24.
- Between sections: 32/48.
- Page gutter: 16px mobile → 24px ≥640 → centered container `max-w-6xl` desktop.

## 4. Layout grid

- **App shell**: topbar (56px) full-width; content container `max-w-6xl`; project workspaces add a persistent left nav ≥1024px that collapses to horizontal tabs below.
- **Auth**: 50/50 split ≥1024px; stacked (visual hidden ≤768px) below.
- **Landing**: single column, `max-w-5xl` prose sections; media sections break to `max-w-6xl`.
- Tables: full-bleed inside their card; horizontal scroll allowed on small screens but column priority ordered so nothing critical hides.

## 5. Color system

### Surfaces
| Token | Hex | Role |
| --- | --- | --- |
| `canvas` | `#09090b` | App background |
| `surface` | `#101012` | Cards, panels |
| `surface-raised` | `#16161a` | Nested elements, table headers |
| `overlay` | `#1d1d22` | Hover elevation, dropdown panels |

### Borders
| Token | Hex | Role |
| --- | --- | --- |
| `border-subtle` | `#1f1f24` | Dividers, card edges |
| `border` | `#2a2a31` | Interactive control borders |
| `border-strong` | `#3a3a44` | Hover/focus-adjacent emphasis |

### Text
| Token | Hex | Role |
| --- | --- | --- |
| `text-primary` | `#fafafa` | Headings, values |
| `text-secondary` | `#a1a1aa` | Labels, descriptions |
| `text-muted` | `#62626d` | Meta, disabled |

### Semantic
| Token | Usage | Pairing |
| --- | --- | --- |
| `accent` `#f59e0b` / hover `#d97706` / muted bg `#451a03` | Brand + primary CTA + focus ring | dark text on accent |
| `success #34d399` | Enabled/serving states | 10% tint backgrounds |
| `danger #f87171` | Destructive actions, OFF-with-rules | 10% tints |
| `warning #fbbf24` | Protected-env caution, unsaved changes | text-only or subtle tint |
| `info #60a5fa` | Neutral info | rarely used |

Contrast floor: body text ≥ 4.5:1, large text/UI chrome ≥ 3:1. `text-muted` never carries actionable information.

## 6. Radius & shadows

| Element | Radius |
| --- | --- |
| Controls (buttons, inputs) | 6px (`rounded-md`) |
| Cards, panels, tables | 10px (`var(--radius-card)`) |
| Badges, pills | full |
| Overlays/dialogs | 12px |

Shadows: borders do the work. Only two shadows exist:
- `shadow-pop`: `0 8px 24px rgb(0 0 0 / 0.45)` — dropdowns/popovers.
- `shadow-modal`: `0 16px 48px rgb(0 0 0 / 0.6)` — dialogs.

## 7. Buttons

Variants: `primary` (accent bg, canvas text), `secondary` (raised surface + border), `ghost` (transparent, secondary text), `danger` (transparent + danger border/text; fills tint on hover). Sizes: `sm` 32px, `md` 38px.

States: hover shifts border/bg one step; active compresses nothing (no scale); disabled 50% opacity + no pointer; loading replaces label with 14px spinner + "Working…" style text; focus-visible uses the global focus ring.

One primary button per view region. Danger buttons require either type-to-confirm or dialog confirmation when irreversible (delete flag/project, revoke key).

## 8. Inputs & forms

- Inputs 38px, surface bg, `border` → hover `border-strong` → focus `accent/60` border + ring.
- Labels above fields, 13px medium secondary. Required by markup semantics; optional hints as 12px muted caption below.
- Errors: `FieldError` under the field, danger color, `role="alert"`; input gets danger border. Never color alone — always text.
- Server-side failures render in an inline alert at form top (see Notifications).
- All forms work without JavaScript (Server Action posts).

## 9. Tables

Header: raised surface, 12px secondary text, sentence case. Rows: 44px, separated by `border-subtle`, hover `surface-raised/40`. First column is the identity column (mono where entity has a key). Trailing column right-aligned for row actions. Numeric columns tabular. Responsive: allow horizontal scroll within card; never wrap flag keys or tokens mid-token.

## 10. Badges & status indicators

Badge: pill, 11px medium capitalize, tone border+tint+text (`neutral/accent/success/danger/warning/info`). Status dot: 6px circle + label text, used in flags matrix and env contexts (`● Enabled` success, `● Off` neutral). Production environments always carry an accent-tinted badge plus dot context — production state must be unmistakable at a glance.

## 11. Dialogs

Radix Dialog primitives. Widths: confirm 400px, content 520px. Structure: title (15/600), description (13/secondary), content slot, footer right-aligned buttons [cancel: secondary] [confirm: variant matching severity]. Overlay `canvas/70%` + slight blur. Focus trapped; Escape closes unless a typed confirmation is mid-input; initial focus lands on the safest interactive element. Enter/exit animated (see §17).

## 12. Dropdown menus

Radix DropdownMenu. Trigger: ghost button with icon. Panel: overlay surface, border, shadow-pop, 4px item padding, 13px text; icons 16px muted leading items; destructive items danger-colored with separator above. Keyboard: arrows navigate, Enter selects, Esc closes.

## 13. Tooltips

CSS-only via `[data-tooltip]` + `::after`. 12px text, overlay surface, border, 150ms fade. Max 60 chars; never the only carrier of critical information.

## 14. Navigation & tabs

Topbar: logo left, contextual nav center-left, account menu right. Project workspace: left sidebar ≥1024px (Overview, Flags, API keys, Audit log, Settings) with Lucide icons + labels; identical order as horizontal TabNav below 1024px. Active item: raised surface + primary text + 2px accent left edge (sidebar) or raised pill (tabs). Environment context is always visible while configuring flags (env tabs carry status dots).

## 15. Notifications (inline)

Three slots, no floating toasts:
1. **Form-level alert**: top of forms — danger (failure) / success (saved).
2. **Inline field errors**: under inputs.
3. **Banner strip**: page-level notices (e.g., key created) rendered once with icon, copy button when applicable, dismiss X.

Structure: icon + message + optional action. Danger/success/warning tones mirror semantic palette. Auto-dismissing UI is forbidden — state persists until user acts or navigates.

## 16. States (mandatory per screen)

- **Loading**: route-level `loading.tsx` skeletons mirroring final layout (no spinners-as-page). Button-level spinners for mutations.
- **Empty**: icon + one-line what + one-line why-it-matters + primary action when permitted. Never blank panes.
- **Error**: `error.tsx` boundaries naming the failed operation + retry button; forms keep entered values.
- **Permission denied**: explicit "requires admin/owner" note with role explanation instead of hidden controls where feasible.
- **Invalid configuration**: field-level messages from server validation surfaced verbatim.

## 17. Animation principles

Fast (120–200ms), subtle, purposeful, consistent. Easing: `ease-out` entrances, `ease-in` exits. Nothing loops except skeletons.

| Interaction | Mechanism |
| --- | --- |
| Hover/focus transitions | CSS 120–150ms |
| Toggle switch | CSS 150ms translate |
| Rollout slider/bar fill | Motion width tween 300ms ease-out |
| Dialog enter/exit | Motion + Radix (opacity 150ms, scale .97→1, y 8→0) |
| Landing/auth reveals | Motion stagger 40ms/child, y 12→0 opacity 0→1, `once: true` |
| Route changes | None (server-rendered speed is the feature) |

`prefers-reduced-motion: reduce` → Motion's `useReducedMotion` disables transforms; CSS transitions drop to opacity-only via global media query.

## 18. Iconography

Lucide only. 16px inline with text, 20px standalone. Stroke inherits currentColor. Icons communicate action/state (toggle, copy, external-link, shield, key) — never decoration filling space.

## 19. Accessibility

- Semantic landmarks: `header/nav/main/footer`; one `h1` per view.
- Focus-visible ring everywhere (2px accent, 2px offset); focus returns to trigger after dialogs close.
- Forms: real `<label>`s, `aria-invalid` on errors, `role="alert"` error regions.
- Toggles: `role="switch"` + `aria-checked` + accessible name including environment ("Enable new_checkout in production").
- Tables: proper `<th>` scope; status also conveyed by text, not just dot color.
- Contrast per §5; reduced motion per §17; full keyboard operability including Radix widgets.

## 20. Performance rules

- Server Components by default; `"use client"` only for interaction (forms, dialogs, sliders, filters).
- Marketing animations run on transform/opacity only; `whileInView` with `once` avoids scroll listeners.
- No layout-shifting animations; reserve dimensions for media.
- Fonts self-hosted via `next/font` (zero layout shift, no external requests).

## 21. Copy voice

Terse, concrete, engineer-to-engineer. Verbs over adjectives ("Roll out to 25%", not "Supercharge"). Real values in examples. No exclamation marks, no marketing superlatives inside the product UI.
