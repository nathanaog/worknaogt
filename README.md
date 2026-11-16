# Workout generator

A tiny personal web app for building a gym workout on the spot. Pick what to train
(for example "Pull" or "Legs + Triceps"), how long you have and how hard you want to go,
and get a ready-to-follow workout: sets, reps, rest, a time estimate with its working
shown, and a picture plus instructions for each exercise.

Exercises are grouped by equipment ("keep your kit"), so once you have a barbell or a
pair of dumbbells you stay on them rather than walking back and forth.

No accounts, no backend, no tracking. Plain HTML, CSS and JavaScript, with no build step.

## Run it on your laptop

Double-click `index.html`. It opens in your browser and works.

(Exercise pictures load from GitHub, so you need internet for them. Without it you'll
see grey "No image" boxes, but everything else works.)

## How it's organised

| File | What it does |
|---|---|
| `index.html` | The page, with all 3 screens |
| `styles.css` | Looks: phone-first, dark/light mode, a plate colour per piece of kit |
| `js/config.js` | **All default numbers**: intensity presets, 4 s per rep, 120 s kit change, muscle-group weights |
| `js/generator.js` | Picks and orders the exercises. The rules are listed at the top of the file |
| `js/timing.js` | The time estimate formulas |
| `js/random.js` | Seeded random, so a workout can be re-created and "Shuffle" = new seed |
| `js/app.js` | The screens and buttons |
| `data/exercises.json` / `.js` | Trimmed exercise data. **Generated, so don't edit it by hand** |
| `tools/build_exercises.py` | Script that builds the data files |
| `tools/core_list.txt` | Hand-picked list of "core" exercises (edit this to add or remove exercises) |
| `tools/examples.js` | Optional: prints example workouts in the terminal (needs Node.js) |

## Rebuilding the exercise data

You only need this if you change `tools/core_list.txt` or want a fresh copy of the dataset.

1. Download the raw file: open
   <https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json>
   and save it, for example to your Downloads folder.
2. In Terminal, go to this folder and run:
   ```
   python3 tools/build_exercises.py ~/Downloads/exercises.json
   ```
3. It prints a table of core exercises per muscle group × equipment, and warns about
   any typo in `core_list.txt`. Then reload the app.

## Deploy (GitHub Pages)

The app is served by GitHub Pages from the `main` branch, at
`https://nathanaog.github.io/worknaogt/`.
Every push to `main` redeploys automatically within a minute or two.

## Credits

Exercise data and images come from [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
by yuhonas, released into the public domain under the Unlicense.
