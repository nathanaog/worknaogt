# Roadmap

## ✅ Phase 1 – MVP generator
- Curated data: 505 exercises kept, 173 flagged core (`tools/build_exercises.py`, `tools/core_list.txt`)
- Pick muscles or presets, duration (10–90 min), intensity, one-tap kit mode (Any / Machines only / Free weights / Dumbbells / Bodyweight)
- Generator: fair share by group size, compound-first, "keep your kit" station grouping, max stations, time-limited (+10%)
- Time estimate with a "How is this calculated?" breakdown, including station-change costs
- Shuffle (new workout) and Swap (one exercise, same muscle group, prefers the same kit)
- Exercise detail: images, instructions, muscles, with a fallback when images are missing
- Deployed to GitHub Pages: https://nathanaog.github.io/worknaogt/

## ⏭ Phase 2 – My gym
- Settings screen: edit every number in `config.js` (presets, seconds per rep, change costs)
- "What my gym has" equipment list, plus per-workout override
- Remember last selections; save my own presets
- Everything in localStorage, with JSON export/import

## Later – Phase 3: gym mode & offline
- PWA: manifest + service worker (install to home screen, works with no signal)
- Cache exercise images as they're viewed
- Follow-along view: current exercise, tick off sets, rest timer

## Later – Phase 4: nice-to-haves
- Short workout history; prefer variety vs. the last 1–2 workouts
- Log weights used; simple progress view
- Copy images for the core exercises into the repo for full offline use

## Ideas parked
- If a workout ends well under target, fill the gap with a short exercise (for example a plank)
- Option to treat cable ↔ machine moves as a cheap 45 s walk instead of a 120 s kit change
