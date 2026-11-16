#!/usr/bin/env python3
"""
build_exercises.py — turns the raw free-exercise-db file into our trimmed data.

WHAT IT DOES (in plain words)
  1. Reads the big raw exercises.json from free-exercise-db (876 exercises).
  2. Throws away things we never want in a normal gym session
     (stretching, plyometrics, Olympic lifts, strongman, cardio, odd equipment).
  3. Translates the dataset's labels into the app's own words:
       - muscle   -> one of our groups (chest, back, quads, ...)
       - equipment -> one of our stations (barbell, dumbbell, machine, smith, ...)
  4. Marks the exercises listed in tools/core_list.txt with  core: true.
  5. Writes two files:
       data/exercises.json  - the clean data (easy to read / inspect)
       data/exercises.js    - the SAME data wrapped in one line of JavaScript, so
                              index.html also works when you double-click it
                              (browsers refuse to load .json files from your disk).
  6. Prints a summary: how many core exercises per muscle group and per equipment.

HOW TO RUN IT (from the repo folder, in Terminal)
  python3 tools/build_exercises.py path/to/raw/exercises.json

Only uses Python's built-in libraries — nothing to install.
"""

import json
import sys
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent  # the folder above tools/
CORE_LIST = REPO / "tools" / "core_list.txt"
OUT_JSON = REPO / "data" / "exercises.json"
OUT_JS = REPO / "data" / "exercises.js"

# --- Rule 1: categories we never generate from --------------------------------
SKIP_CATEGORIES = {"stretching", "plyometrics", "olympic weightlifting", "strongman", "cardio"}

# --- Rule 2: dataset equipment -> our station name ----------------------------
# Anything not in this map (medicine ball, exercise ball, foam roll, "other",
# missing) is dropped.
EQUIPMENT_MAP = {
    "barbell": "barbell",
    "e-z curl bar": "ezbar",
    "dumbbell": "dumbbell",
    "kettlebells": "kettlebell",
    "cable": "cable",
    "machine": "machine",
    "body only": "bodyweight",
    "bands": "bands",
}

# --- Rule 3: dataset muscle -> our muscle group -------------------------------
MUSCLE_TO_GROUP = {
    "chest": "chest",
    "lats": "back", "middle back": "back", "lower back": "back", "traps": "back",
    "shoulders": "shoulders",
    "biceps": "biceps",
    "triceps": "triceps",
    "quadriceps": "quads",
    "hamstrings": "hamstrings",
    "glutes": "glutes", "adductors": "glutes", "abductors": "glutes",
    "calves": "calves",
    "abdominals": "core",
    # forearms / neck: no group -> exercise is dropped
}


def station_for(raw):
    """Smith machine exercises are labelled 'machine' (or even 'barbell') in the
    dataset, so we spot them by name and give them their own station."""
    if "smith" in raw["name"].lower():
        return "smith"
    return EQUIPMENT_MAP.get(raw.get("equipment"))


def read_core_ids():
    ids = []
    for line in CORE_LIST.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            ids.append(line)
    return ids


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 tools/build_exercises.py path/to/raw/exercises.json")
        sys.exit(1)

    raw_list = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    core_ids = read_core_ids()
    core_set = set(core_ids)

    # Warn about typos in the allow-list
    raw_ids = {r["id"] for r in raw_list}
    for cid in core_ids:
        if cid not in raw_ids:
            print(f"⚠️  core_list.txt: '{cid}' is not in the raw dataset (typo?)")

    out = []
    for r in raw_list:
        is_core = r["id"] in core_set
        if r.get("category") in SKIP_CATEGORIES:
            continue
        station = station_for(r)
        if station is None:
            continue
        group = MUSCLE_TO_GROUP.get((r.get("primaryMuscles") or [None])[0])
        if group is None:
            continue
        # Expert moves are only kept if we hand-picked them as core
        if r.get("level") == "expert" and not is_core:
            continue

        out.append({
            "id": r["id"],
            "name": r["name"],
            "group": group,                      # our muscle group
            "primary": r.get("primaryMuscles", []),
            "secondary": r.get("secondaryMuscles", []),
            "equipment": station,                # our station / equipment key
            "mechanic": r.get("mechanic") or "isolation",
            "level": r.get("level"),
            "timed": r.get("force") == "static",  # holds like Plank: seconds, not reps
            "instructions": r.get("instructions", []),
            "images": r.get("images", []),
            "core": is_core,
        })

    for cid in core_ids:
        if cid in raw_ids and not any(e["id"] == cid for e in out):
            print(f"⚠️  core_list.txt: '{cid}' exists but was removed by the filter rules")

    out.sort(key=lambda e: e["name"])
    OUT_JSON.parent.mkdir(exist_ok=True)
    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    OUT_JS.write_text(
        "// GENERATED by tools/build_exercises.py — do not edit by hand.\n"
        "window.EXERCISE_DATA = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )

    # ---- Summary for sanity-checking ----
    core = [e for e in out if e["core"]]
    print(f"\nKept {len(out)} of {len(raw_list)} exercises; {len(core)} are core.\n")
    groups = ["chest", "back", "shoulders", "biceps", "triceps",
              "quads", "hamstrings", "glutes", "calves", "core"]
    stations = ["barbell", "smith", "ezbar", "dumbbell", "kettlebell",
                "cable", "machine", "bodyweight", "bands"]
    table = Counter((e["group"], e["equipment"]) for e in core)
    print(f"{'core':<11}" + "".join(f"{s[:6]:>7}" for s in stations) + f"{'TOTAL':>7}")
    for g in groups:
        row = [table[(g, s)] for s in stations]
        print(f"{g:<11}" + "".join(f"{n:>7}" for n in row) + f"{sum(row):>7}")
    tot = [sum(table[(g, s)] for g in groups) for s in stations]
    print(f"{'TOTAL':<11}" + "".join(f"{n:>7}" for n in tot) + f"{sum(tot):>7}")
    print(f"\nWrote {OUT_JSON.relative_to(REPO)} ({OUT_JSON.stat().st_size // 1024} KB) "
          f"and {OUT_JS.relative_to(REPO)} ({OUT_JS.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
