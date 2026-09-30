# BidX Auction

Real-time esports player auction platform built from the existing BidX auction prototype.

## Roles
- Player — one-time registration and auction profile
- Admin — player/staff/auction management and monitoring
- Ambassador — live bidding, points and roster
- Caster — auction control plus live camera/microphone broadcast
- Audience — public read-only live auction
- Broadcast View — fullscreen OBS/YouTube-friendly output

## Core flow
Player registration → Caster auction start → player reveal → bidding → SOLD/UNSOLD → atomic points deduction and roster assignment → next player.

## Stack
React + TypeScript + TanStack Start/Router + Supabase + Tailwind CSS + WebRTC.

## Environment
Keep `.env` local. Never commit Supabase service-role keys or other secrets.
