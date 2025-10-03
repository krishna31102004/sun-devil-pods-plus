# SunDevil Pods+ Prototype

This starter project provides a skeleton for building the SunDevil Pods+ hackathon prototype.

## Project Structure

- `public/data/` — Contains sample data files used by the prototype. You can edit these to test matching and UI.
  - `students.csv` — Seed signup data with 24 students across four campuses. Each record includes name, email, zone, two interests, two available 45‑minute time slots and optional identity tags (e.g. `commuter`, `international`, `first_gen`, `sensory`, `mobility`, `language_ally`).
  - `spaces.json` — List of sticky meeting locations with ADA and sensory-friendly flags and capacities. These correspond to the “Third Places” identified in the spec (e.g. MU lounges, Hayden booths).
  - `quests.json` — Four-week Connection Quests curriculum with point values and badge IDs.
  - `badges.json` — Definitions for badges unlocked by quests.
  - `interests.json` — Canonical list of 17 interest tags that students choose from during sign‑up (e.g. `study sprint`, `soccer`, `art`, `coding`).
- `scripts/` — Custom scripts.
  - `match.ts` — Reads `students.csv` and produces `pods.json` grouping students into pods of 5–8 by zone, time, interests and tags.
- `src/` — Source code for the web app (React + Tailwind skeleton). You can expand these components to implement the full UI.
  - `components/` — Reusable UI components (empty placeholders).
  - `pages/` — Top-level pages (signup, match result, pod dashboard).
  - `lib/` — Utility functions (points engine, quest helpers, etc.).
- `docs/` — Documentation and assets.
  - `captain-toolkit.md` — Outline of weekly run‑of‑show for peer captains.
  - `space-map.md` — List of sticky campus spaces.
  - `slides-outline.md` — Suggested slide order mapped to hackathon rubrics.

## Getting Started

1. **Install dependencies (optional)** — If you plan to run the UI or TypeScript scripts, install dependencies:

   ```sh
   npm install
   ```

2. **Generate pods** — Run the matching script to create `pods.json` from your signup data:

   ```sh
   npx ts-node scripts/match.ts
   ```

   This will output a new `pods.json` in `public/data/`.

3. **Run the app (optional)** — If you’ve built the React app, start a dev server:

   ```sh
   npm run dev
   ```

   Open `http://localhost:3000` in your browser to view the prototype.

## Notes

**UI Features.** In this iteration the starter kit has grown beyond data models and matching. After signing up with your interests, time slots, campus zone and optional identity tags, the app matches you to a pod. On the dashboard you can:

  * View **Pod Details** (zone, meeting time, captain, members and a private vibe score).
  * See the current **Connection Quest** and record **Check‑in** and **Quest completion** points.
  * Track **Points & Badges** earned during the four‑week cycle.
  * Choose a **Meeting Space** via the space picker modal; spaces are filtered by your campus zone and display ADA and sensory labels.
  * Record your **Belonging Pulse** by answering three short survey questions. The app stores your pulse scores in localStorage and shows the change from your previous entry.

These components provide a taste of the full SunDevil Pods+ experience. Future iterations could include confetti animations, a rewards store for redeeming points, and a peer‑captain console.
- The matching script uses a greedy, **barrier-aware** clustering algorithm. It groups users by campus zone, prioritises midday time slots for commuters, matches students with overlapping 45‑minute windows and at least one shared interest, and attempts to pair international students with at least one language ally. Pods are sized between 5 and 8, with +1 over‑assignment to handle no‑shows.
- Badges and quests reflect the Connection Quests curriculum described in the hackathon spec.

Have fun building the SunDevil Pods+ prototype!
