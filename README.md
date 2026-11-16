# Worknao — workout generator

A tiny personal web app for building a gym workout on the spot. Pick what to train
(for example "Pull" or "Legs + Triceps"), how long you have and how hard you want to go,
and get a ready-to-follow workout: sets, reps, rest, a time estimate with its working
shown, and a picture plus instructions for each exercise.

Exercises are grouped by equipment ("keep your kit"), so once you have a barbell or a
pair of dumbbells you stay on them rather than walking back and forth.

No accounts, no backend, no tracking. Plain HTML, CSS and JavaScript, with no build step.

## Settings (⚙️ on the main screen)

- **My gym:** untick kit your gym doesn't have; the quick kit buttons only use what's ticked.
- **Intensity and Timing:** every number used by the generator, with a live preview of the maths.
- **My presets:** delete presets you saved with "Save as preset" on the main screen.
- **Backup:** Export downloads one `.json` file with everything; Import loads it back (it shows what will be replaced first).

Everything is stored in your browser's localStorage on that device. Only the numbers you change are stored;
the rest follows `js/config.js`. Your last options (time, intensity, kit, toggles) are remembered; muscles always start empty.

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
| `js/storage.js` | Saving to the phone (localStorage), applying your settings, export/import |
| `js/settings.js` | The Settings screen |
| `manifest.json` + `icons/` | Makes it installable as an app (name "Worknao", icon, no browser bars) |
| `js/random.js` | Seeded random, so a workout can be re-created and "Shuffle" = new seed |
| `js/app.js` | The screens and buttons |
| `data/exercises.json` / `.js` | Trimmed exercise data. **Generated, so don't edit it by hand** |
| `tools/build_exercises.py` | Script that builds the data files |
| `tools/core_list.txt` | Hand-picked list of "core" exercises (edit this to add or remove exercises) |
| `tools/make_icons.py` | Draws the app icons (needs Pillow; only to change the icon) |
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

## Install on your phone

Open the site, then **Android (Chrome):** menu ⋮ → **Install app**; **iPhone (Safari):** Share → **Add to Home Screen**.
If you added an older shortcut before the manifest existed, delete it first and re-add it.

## Credits

Exercise data and images come from [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
by yuhonas, released into the public domain under the Unlicense.
