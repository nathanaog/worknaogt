/* examples.js — prints example workouts in the terminal (optional dev tool).
 *
 * Needs Node.js (not required for the app itself). Run from the repo folder:
 *   node tools/examples.js
 * It loads the exact same files the app uses, so what you see here is what
 * the phone would generate for the same seed.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
global.window = global;
for (const f of ["data/exercises.js", "js/config.js", "js/random.js", "js/timing.js", "js/generator.js"]) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), "utf8"), { filename: f });
}
const { config: C, generator, timing } = Gym;
const T = timing.mmss;

function show(title, o) {
  const opts = Object.assign({}, C.defaults, o);
  const w = generator.generate(window.EXERCISE_DATA, opts);
  const e = w.estimate;
  console.log(`\n=== ${title}  (seed ${opts.seed}) ===`);
  for (const b of generator.blocks(w.exercises)) {
    console.log(`  ${C.stations[b.station].label.toUpperCase()}`);
    for (const i of b.indexes) {
      const l = e.lines[i];
      const ch = l.changeBefore.sec ? ` [+${T(l.changeBefore.sec)} ${l.changeBefore.kind === "machine" ? "machine move" : "kit change"}]` : "";
      console.log(`    ${i + 1}. ${l.ex.name.padEnd(44)} ${l.plan.label.padEnd(16)} rest ${l.plan.restSec}s  ${T(l.plan.total)}  (${l.ex.group}, ${l.ex.mechanic})${ch}`);
    }
  }
  console.log(`  Stations: ${generator.blocks(w.exercises).map((b) => C.stations[b.station].label).join(" → ")}`);
  console.log(`  Changes: ${e.freeChanges} kit change(s) × 120 s + ${e.machineMoves} machine move(s) × 45 s = ${T(e.changeSec)}`);
  console.log(`  Total: warm-up ${T(e.warmupSec)} + exercises ${T(e.exerciseSec)} + changes ${T(e.changeSec)} = ${T(e.totalSec)}  (target ${opts.durationMin}:00, limit ${T(w.limitSec)})`);
  w.notes.forEach((n) => console.log("  NOTE: " + n));
}

show("Back + Biceps, 30 min, Medium", { groups: ["back", "biceps"], seed: 11 });
show("Legs + Triceps, 45 min, Heavy", { groups: ["quads", "hamstrings", "glutes", "calves", "triceps"], durationMin: 45, intensity: "heavy", seed: 2 });
show("Full body, 20 min, Light, dumbbells only", { groups: C.presets.full.groups, durationMin: 20, intensity: "light", equipmentMode: "dumbbells", seed: 3 });
show("Chest + Shoulders, 30 min, Medium, machines only", { groups: ["chest", "shoulders"], equipmentMode: "machines", seed: 4 });
