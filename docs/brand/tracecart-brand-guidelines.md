# Tracecart

## Positioning
Sourcing and logistics for landlocked and difficult-to-reach markets — West and Central Africa first, then Central Asia, inland South America, landlocked Europe and remote corridors anywhere. The promise is not "choose a shipping option"; it's **"Tell us what needs to move. We'll figure out how to get it there."** Customer journey: **need → source → route → movement → destination.**

Tracecart must read as a global infrastructure company, never as "an African logistics startup": no continent maps, flags or regional patterns as brand devices; corridor examples always span several continents.

## Personality
Reliable, capable, calm, resourceful, precise, global, confident, human. "We'll find a way."

## Visual expression
- **Theme:** `tracecart-light` / `tracecart-dark`. Cool concrete ground (`#f2f3f1`), white panels; near-black in dark.
- **Accent:** Trace Green — it means *moving*. Primary actions, the live leg of a route, the "moving" status. Held = yellow, exception = red, delivered = ink with a check, planned = outline.
- **Corner:** the route corner — one generous round corner top-left, the rest near-square (`.rb-card--route`, the quote bar, hero media). More rectilinear than Roleback: operational, engineered.
- **Motif — the route:** a 4px ink line with a single rounded turn, a round origin and a square destination, often on a faint dot grid. It's abstract geography: no basemaps unless a real map is the job.
- **Mono:** Geist Mono for shipment IDs, coordinates, HS codes, truck plates and timestamps — the "precise" layer.
- **Numbers:** large light numerals for outcomes (shipments delivered, median border dwell time).

## Website (TraceCartSite)
1. **Hero:** "Get it there." + one paragraph + a route drawing from origin to destination.
2. **Quote bar:** From · To · What · When → Get a quote. No account required; a named person replies within 4 working hours.
3. **How it works:** Source → Consolidate → Move → Clear → Deliver, as a ruled five-column strip.
4. **Proof:** documentary photo + three outcome numbers.
5. **Corridors:** origin → destination, coordinates in mono, typical transit time.
6. **Closing band:** "Tell us where it needs to go."

## Operational product
Objects: **Requests → Orders → Shipments** (with Cargo), planned on **Routes** through **Hubs**, executed by **Partners** (carriers, brokers), backed by **Documents**, passing **Customs / border** checkpoints, producing **Tracking** events, **Exceptions**, **Proof of delivery** and **Payments**.

- **TraceCartOps** (1440px console): left nav with counts, KPI strip, status segments, dense sortable table (ID in mono, route + cargo two-line cell, "Now" leg, ETA, status with shape + word), and a "Needs a decision" column of exception cards with the next action on each.
- **TraceCartShipment:** route timeline, missing-document alert, cargo facts, document checklist (5 of 6), customs & partners, payments table, proof-of-delivery slot.
- **TraceCartMobile:** quote, live tracking (vertical route), and an exception decision with options and costs.

**Density rules:** 14px table text with 13px mono; dense rows at 8px padding; two-line cells instead of more columns; muted secondary lines; one accent; exceptions surface first, never buried in a column. Calm, not a cockpit: no gauges, no neon on black, no maps for decoration.

## Marketing examples
- Headline system: two to four words, full stop. "Get it there." "Through the border by Thursday." "Inland, on time."
- Poster: a single ink route turning one corner across a white field, a green square at the destination, coordinates in mono at each end, the lockup bottom-left.
- Case studies lead with the corridor and the number: "Mersin → Almaty. 11 days, door to door."

## Typeface guide — Tracecart

Same families as Roleback — **Bricolage Grotesque** and **Geist Mono** — set calmer and more engineered. Where Roleback is loud, Tracecart is precise: lighter display weights, more mono.

| Role | Setting | Where |
| --- | --- | --- |
| Wordmark | Bricolage 720, opsz 96, wdth 100, tracking −1%, lowercase, outlined | `tracecart-wordmark`, `tracecart-lockup`, `tracecart-endorsed` (endorsement line in Bricolage 560, opsz 24) |
| Hero | `display-xl` 80, 800, −3.5% (mobile 44) | Two to four words, full stop: "Get it there." |
| Section opener | `display-l` 56 / `headline` 40 | "How it works", corridors, closing band |
| Panel title | `title` 20, 640 | Shipment header, exception cards |
| Reading | `body` 16 / `body-s` 14 | Customer updates, document notes |
| Dense tables | `body-s` 14 + `mono` 13 | Ops console — 14px text, 13px mono, 8px row padding |
| Outcome numbers | `numeral-xl` 96, 300, tabular | Shipments delivered, median border dwell time |
| The precise layer | Geist Mono 13 / 11 (`mono`, `mono-s`) | Shipment IDs, HS codes, coordinates, truck plates, timestamps with zones |

**Rules.** Mono for anything a customer might copy or read aloud to a broker; Bricolage for everything else. Never mono for sentences. Headlines stay short and end with a full stop. Tabular numerals in every table, ETA and price. No 112px heroes — Tracecart's biggest type is 80px.

## Colour guide — Tracecart

Theme `tracecart-light` / `tracecart-dark`.

| Colour | Hex | Token | Share of a screen | Job |
| --- | --- | --- | --- | --- |
| Ink | #0d0f0e | `ink` | ~10% | Text, route lines (4px), the logo |
| Concrete | #f2f3f1 | `surface` | ~70% | The ground — a few degrees cooler than Roleback's paper |
| White | #ffffff | `surface-raised` | ~15% | Panels, tables, the quote bar |
| Trace Green | #19d36b | `accent` (`tracecart`) | ≤ 5% | Means **moving**: the primary action, the live leg of a route, the "moving" status |
| Green ink | #077a3a (dark #3fe08a) | `accent-ink` | text only | Green as text or a thin mark |
| Green tint | #d6f7e3 (dark #06301a) | `accent-soft` | rare | The live row, the active leg's ground |
| Held | #8a5a00 on #fff4b8 | `warning` / `warning-soft` | as needed | Held at a border, a document expiring |
| Exception | #c41d14 on #fde4e2 | `critical` / `critical-soft` | as needed | Something stuck that needs a decision |

**Contrast (computed from the tokens):** black on green 9.7:1 · ink on concrete 17.3:1 · `ink-muted` on concrete 6.1:1 · green ink on concrete 4.9:1, on white 5.4:1, on tint 4.7:1. Dark: green ink on near-black 11.2:1.

**Rules.**
- Green means *moving* and nothing else. Delivered is `ink` with a check — *done* is quiet, *moving* is green, *held* is yellow, *stuck* is red.
- Green is a fill with black on it (white on green fails at 2.0:1). As text, `accent-ink`.
- Status is always shape + word + colour: planned ring, moving dot, held minus, exception square ×, done check.
- No neon on black, no blue network meshes, no gradients — calm, not a cockpit.
- Avatar: black Trace on green (`tracecart-avatar`). On Roleback pages a Tracecart card keeps its own green via the `tracecart` token.
