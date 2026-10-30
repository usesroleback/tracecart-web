# Tracecart design system

The source of truth is the shared Roleback design system:
https://claude.ai/artifact/7FBB9gfizRehvbLFSqr2KF (themes `tracecart-light` / `tracecart-dark`).

- [tracecart-brand-guidelines.md](tracecart-brand-guidelines.md) is a copy of its Tracecart section (`project/06-tracecart.md`).
- [README.md](README.md) is a copy of its logo notes (`project/assets/Logos/README.md`). The Tracecart logo files are in `tracecart-web/public/images/logo/`.
- `tracecart-web/src/app/globals.css` mirrors `project/tokens.json` (Tracecart themes) and the `rb-*` type classes from `project/components/bundle.css`.
- `tracecart-web/src/components/ui/` mirrors the bundle's components (Button, Card, Badge, Status, Table, ExceptionCard). Each file names the bundle.css rules it follows.

- Breakpoints are the system's `bp-sm/md/lg/xl` (600 / 900 / 1200 / 1600) in `globals.css`. Layouts that depend on the room a component has rather than the window — the console's side columns and the KPI strip — use container queries on the console's `<main>` (`@container/main`, `AdminShell.tsx`).
- Charts (`components/charts/`): the system has no data palette, and its hues are taken (green = moving, yellow = held, red = exception, cobalt = info). Ordinary series differ by lightness and line style instead — ink vs grey lines, ink bars — set in `ChartTheme.ts`, contrast-checked in both themes.

When the design system changes, update those copies to match.
