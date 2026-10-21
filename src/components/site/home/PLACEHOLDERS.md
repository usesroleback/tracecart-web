# Homepage placeholders

The redesigned homepage (`/fr/preview/home`, `/en/preview/home`) uses placeholder images, figures, names and links. Replace everything below before it becomes the homepage. In the page, every image slot carries `data-image-slot="<name>"` and every placeholder figure `data-placeholder`, so `document.querySelectorAll("[data-image-slot], [data-placeholder]")` lists what's left.

**Making it the homepage:** render `<HomePage />` from `src/app/[locale]/(site)/page.tsx`, then delete the `preview/home` route and its line in `src/middleware.ts` (`isAnonymousPage`).

## Images

Each slot is an `<ImageSlot>` in the file named below. Swap it for a `next/image` with the same `alt` (taken from `messages/{fr,en}/home.json`) and the same aspect ratio.

| Slot | Ratio | What it should show | File |
| --- | --- | --- | --- |
| `hero-arrival` | 16:9 (fills the row on desktop) | Goods handed over at the door, shot from below against a bright sky; people, not a warehouse | `HomeHero.tsx` |
| `trust-avatar-1…3` | 1:1, round | Three customer portraits | `TrustBar.tsx` |
| `client-logo-1…8` | 3:1 | Customer logos, single colour (shown greyscale) | `TrustBar.tsx` |
| `team-1…4` | 1:1 | TraceCart coordinators, head and shoulders | `PointOfView.tsx` |
| `service-sourcing` | 4:3 | A coordinator checking goods at a supplier | `Services.tsx` |
| `service-freight` | 4:3 | A truck loaded at a consolidation hub | `Services.tsx` |
| `service-customs` | 4:3 | A broker with documents at a land border | `Services.tsx` |
| `service-tracking` | 4:3 | Goods signed for at delivery | `Services.tsx` |
| `result-customer` | 3:4 (16:10 on phones), pill-shaped | A customer portrait for the 31% card | `Results.tsx` |
| `result-customer-logo` | 4:1 | That customer's logo, over the portrait | `Results.tsx` |
| `case-construction` | 2:1 | Pallets of tile adhesive being unloaded | `SelectedWork.tsx` |
| `case-clinic` | 2:1 | Medical devices in a clinic store room | `SelectedWork.tsx` |
| `case-agri` | 2:1 | Irrigation pumps installed in a field | `SelectedWork.tsx` |
| `process-team` | 4:5 | The team planning a route | `Process.tsx` |
| `founder` | 1:1 | The founder's portrait | `Comparison.tsx` |
| `testimonial-hardware/clinic/ngo/agri` | 1:1 | The four customers quoted | `Testimonials.tsx` |
| `testimonial-…-logo` | 3:1 | Their companies' logos | `Testimonials.tsx` |
| `insight-landed` | 4:3 (featured) | A quote laid out next to goods on a pallet | `Insights.tsx` |
| `insight-border` | 16:10 | Trucks queuing at a border before dawn | `Insights.tsx` |
| `insight-consolidation` | 16:10 | Mixed cargo consolidated at a hub | `Insights.tsx` |
| `social-linkedin/instagram/x/youtube` | 1:1, 20px | Social icons | `ClosingAndFooter.tsx` |
| `badge-1…4` | 2:1 | Certifications or memberships (customs broker licence, insurer, trade association…) | `ClosingAndFooter.tsx` |

## Figures

All in `content.ts` (one place). Labels are in `home.json`.

| Where | Figure | Placeholder |
| --- | --- | --- |
| Hero card | On-time arrival | 94% (15 of 21 dots filled) |
| Hero card | Border wait, 90 days | −41% |
| Hero card | Shipments per week, twelve bars | `HERO.bars` |
| Trust bar | Customers, corridors | 120+, 31 |
| Corridor band | Transit days per corridor | `CORRIDORS` (from the current homepage) |
| Results | On time, Lomé → Ouagadougou | 94% |
| Results | Border wait, 71 h → 42 h (the caption is in `home.json`) | −41%, nine bars |
| Results | Landed-cost saving vs. buying locally | 31% |
| Selected work | Construction: days door to door (quoted 21–24) | 19 |
| Selected work | Clinic: units lost or damaged | 0 |
| Selected work | Agri: landed cost vs. local resale | −34% |
| Stats | Shipments delivered, corridors, delivered undamaged | 1,284+, 31, 97.6% (the current homepage's figures, unverified) |
| Process | Years of combined experience | 10+ |
| Insights | Reading times | 6, 8, 5 min |

## Names, stories and contact details

In `messages/{fr,en}/home.json`:

- `work.items.*`: the three case studies: clients `[Client A/B/C]`, summaries, sectors.
- `testimonials.items.*`: four people `[Name A–D]`, roles, companies, quotes. **Invented**: replace them with real customers' words, given with their permission.
- `compare.founder`: `[Name]`, and the founder quote.
- `footer.email`, `footer.phone`: `hello@tracecart.com` and `+000 00 00 00 00` are guesses.
- `insights.items.*`: the three note titles.

## Links that go nowhere yet (`href="#"`)

All case studies, each case study, Read the case study (goes to `#work` for now), View all notes and each note, FAQ, Contact us, Privacy policy, Terms, the social icons. The newsletter form is disabled ("Sign-up opens soon") until there is a service to send it to.
