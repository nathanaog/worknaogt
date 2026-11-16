/* config.js — every default number and label in one place.
 *
 * If you want to tweak how the app behaves (rest times, seconds per rep,
 * how "big" a muscle group is), this is the only file you need to touch.
 * In Phase 2 these become editable in a Settings screen.
 *
 * Note for the curious: we use plain <script> files (not "modules") so the app
 * still works when you just double-click index.html on your laptop.
 * Everything is attached to one global object called Gym.
 */
window.Gym = window.Gym || {};

Gym.config = {
  // ---- Intensity presets -------------------------------------------------
  // reps: [min, max]. For the time estimate we use the middle of the range.
  // holdSec: used instead of reps for timed holds like Plank.
  intensities: {
    heavy:  { label: "Heavy",  sub: "strength",   reps: [4, 6],   sets: 4, restSec: 150, holdSec: 30 },
    medium: { label: "Medium", sub: "hypertrophy", reps: [8, 12], sets: 3, restSec: 90,  holdSec: 40 },
    light:  { label: "Light",  sub: "endurance",  reps: [12, 20], sets: 3, restSec: 45,  holdSec: 45 },
  },

  // ---- Time estimate ---------------------------------------------------
  secondsPerRep: 4,          // how long one rep takes
  setupSec: 60,              // per exercise: find the kit, set the weight
  warmupMin: 5,              // added at the start (can be switched off)
  freeWeightChangeSec: 120,  // giving up one piece of kit and getting another
  machineMoveSec: 45,        // walking from one machine to the next
  tolerance: 0.10,           // may go up to 10% over the target time

  // ---- Muscle groups ----------------------------------------------------
  // weight = how big a share of the workout this group gets.
  // Bigger muscles (legs, back, chest) get more exercises than biceps/calves.
  groups: {
    chest:      { label: "Chest",      weight: 2.0 },
    back:       { label: "Back",       weight: 2.5 },
    shoulders:  { label: "Shoulders",  weight: 1.5 },
    biceps:     { label: "Biceps",     weight: 1.0 },
    triceps:    { label: "Triceps",    weight: 1.0 },
    quads:      { label: "Quads",      weight: 1.0, leg: true },
    hamstrings: { label: "Hamstrings", weight: 0.9, leg: true },
    glutes:     { label: "Glutes",     weight: 0.7, leg: true },
    calves:     { label: "Calves",     weight: 0.4, leg: true },
    core:       { label: "Core",       weight: 1.0 },
  },
  // Rough "size" order — used to put big muscles before small ones in a block.
  groupOrder: ["quads", "back", "chest", "hamstrings", "glutes", "shoulders",
               "triceps", "biceps", "calves", "core"],

  // ---- Quick presets (one tap) -------------------------------------------
  presets: {
    push:  { label: "Push",      groups: ["chest", "shoulders", "triceps"] },
    pull:  { label: "Pull",      groups: ["back", "biceps"] },
    legs:  { label: "Legs",      groups: ["quads", "hamstrings", "glutes", "calves"] },
    upper: { label: "Upper",     groups: ["chest", "back", "shoulders", "biceps", "triceps"] },
    lower: { label: "Lower",     groups: ["quads", "hamstrings", "glutes", "calves", "core"] },
    full:  { label: "Full body", groups: ["chest", "back", "shoulders", "quads", "hamstrings", "glutes", "core"] },
  },

  // ---- Equipment / stations --------------------------------------------
  // order = which block comes first when grouping (heaviest kit first).
  stations: {
    barbell:    { label: "Barbell",       icon: "🏋️", order: 1 },
    smith:      { label: "Smith machine", icon: "🛤️", order: 2 },
    ezbar:      { label: "EZ bar",        icon: "〰️", order: 3 },
    dumbbell:   { label: "Dumbbells",     icon: "💪", order: 4 },
    kettlebell: { label: "Kettlebell",    icon: "🔔", order: 5 },
    cable:      { label: "Cable",         icon: "🪢", order: 6 },
    machine:    { label: "Machines",      icon: "⚙️", order: 7 },
    bands:      { label: "Bands",         icon: "🎗️", order: 8 },
    bodyweight: { label: "Bodyweight",    icon: "🤸", order: 9 },
  },

  // Quick equipment modes on the main screen.
  // Bodyweight is allowed in the dumbbell / free-weight modes because
  // floor work needs no extra kit.
  equipmentModes: {
    any:   { label: "Any",           allow: ["barbell", "smith", "ezbar", "dumbbell", "kettlebell", "cable", "machine", "bands", "bodyweight"] },
    machines: { label: "Machines only", allow: ["machine", "cable"] },
    free:  { label: "Free weights",  allow: ["barbell", "ezbar", "dumbbell", "kettlebell", "bodyweight"] },
    dumbbells: { label: "Dumbbells", allow: ["dumbbell", "bodyweight"] },
    bodyweight: { label: "Bodyweight", allow: ["bodyweight"] },
  },

  // ---- Generator scoring (see generator.js) --------------------------------
  scoring: {
    sameStationBonus: 0.6,   // already using this kit -> easier to stay on it
    heavyCompoundBonus: 0.3, // heavy days favour compound lifts
    lateIsolationBonus: 0.2, // 3rd+ exercise for a group leans to isolation
    samePrimaryPenalty: 0.5, // per earlier exercise hitting the same exact muscle
  },

  // ---- Defaults on the main screen -------------------------------------
  defaults: {
    durationMin: 30,
    intensity: "medium",
    equipmentMode: "any",
    compoundFirst: true,
    minimiseChanges: true,
    warmup: true,
    maxStations: 0,           // 0 = no limit
  },

  imageBase: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/",
};
