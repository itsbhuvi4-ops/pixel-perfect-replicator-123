# Antigravity-Inspired BidX Theme and Homepage

## What will change

- Rework the shared visual theme toward the reference site’s bright neutral canvas, oversized clean typography, fine separators, and restrained accent color.
- Rewrite only the homepage hero content and layout for the live esports player auction, keeping its existing navigation destinations and calls to action.
- Apply the theme to the existing shared navigation and homepage sections without changing auction behavior, authentication, routes, or backend data.

## Verification

- Inspect the homepage at desktop and mobile sizes and confirm links still target the existing auction, login, and player registration pages.
- Run available tests and the preview’s type/build checks; do not mutate the live auction.

## Technical details

- Keep the existing TanStack Start and Lovable Cloud architecture.
- Limit implementation to the global stylesheet, shared site header, and homepage route.
- Use existing assets and typography; no paid or generated media is needed.