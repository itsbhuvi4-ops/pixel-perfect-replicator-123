- Discord-inspired BidX workspace redesign

## What will change

- Add a responsive, original desktop-app shell to existing authenticated and public auction pages: compact app rail, role-aware channel/navigation sidebar, top bar, and central content.
- Replace the conflicting light theme overrides with semantic dark tokens based on the requested charcoal surfaces, clear text contrast, and a restrained periwinkle accent.
- Restyle existing dashboard, login, registration, live auction, and broadcast surfaces through shared tokens and focused component adjustments; keep current data, authentication, APIs, permissions, and auction actions intact.
- Preserve the brand landing page and seven-second opening as distinct experiences; keep the broadcast output clean and full-screen.

## Verification

- Check all route heads and current route tree; run the existing tests, TypeScript check, and preview build signals.
- Use the live preview to inspect the main routes and exercise available navigation/forms without creating or deleting real accounts or changing the live auction.
- Check desktop and mobile layouts and report any backend/auth flows that cannot safely be verified without a test account or hardware permission.

## Technical decisions

- Implement the shared shell in the existing TanStack root/header architecture and use existing semantic CSS tokens rather than introducing another framework or data layer.
- Leave server functions, database migrations, authentication rules, and auction business logic unchanged unless testing exposes a concrete UI integration defect.