# Homepage placeholders

The homepage (`/fr`, `/en`) shows only what Tracecart does today. Figures, customer logos, testimonials, case studies, team and founder portraits, field notes, corridors, the newsletter, social links, badges and contact details were removed because none of them were real or verified. Add a section back only with real material (and, for customers, their permission). Never with stand-ins.

In the page, every empty image slot carries `data-image-slot="<name>"`, so `document.querySelectorAll("[data-image-slot]")` lists what's left.

## Images

Each slot is an `<ImageSlot>` in the file named below. To fill one, put the photo in `public/images/home/` and add its slot name to `IMAGES` in `content.ts`; the slot then renders it with `next/image`, keeping its aspect ratio. Its `alt` comes from `messages/{fr,en}/home.json`: update it to describe the photo.

| Slot | Ratio | Now | File |
| --- | --- | --- | --- |
| `hero-arrival` | 16:9 (21:9 on desktop) | Stock photo: a woman drilling into a wall | `HomeHero.tsx` |
| `service-sourcing` | 4:3 | Stock photo: a woman reviewing a project at her desk | `Services.tsx` |
| `service-freight` | 4:3 | Stock photo: a container ship at a port | `Services.tsx` |
| `service-customs` | 4:3 | Stock photo: a stack of clipped documents | `Services.tsx` |
| `service-tracking` | 4:3 | Stock photo: a couple looking at a phone | `Services.tsx` |

## Pages that don't exist yet

FAQ, contact, privacy policy and terms aren't linked until they exist.
