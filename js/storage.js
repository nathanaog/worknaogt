/* storage.js — saving your settings on this phone, plus export/import.
 *
 * WHAT IS localStorage?
 *   A small private notebook that every browser keeps per website. We can write
 *   text into it and read it back next time, even after the phone restarts.
 *   It never leaves your phone. (Clearing the browser's site data wipes it,
 *   which is why Export exists.)
 *
 * WHAT WE STORE (one entry called "worknao", as JSON text):
 *   {
 *     version: 1,              // so future versions can upgrade old saves
 *     overrides: { ... },      // ONLY the numbers you changed in Settings
 *     gymStations: [ ... ],    // what your gym has (missing = "everything")
 *     presets: [ {id, label, groups} ],   // your own presets
 *     last: { ... }            // last-used options (time, intensity, kit, toggles)
 *   }
 * Anything you never changed is not stored, so it keeps following config.js.
 */
window.Gym = window.Gym || {};

Gym.storage = (function () {
  const KEY = "worknao";
  const VERSION = 1;

  // A frozen copy of the original config.js values, taken before any overrides.
  const BASE = JSON.parse(JSON.stringify(Gym.config));

  // The numbers Settings may change, with sensible limits (min, max).
  const NUMBER_FIELDS = {
    secondsPerRep:       { label: "Seconds per rep",        unit: "s",   min: 1, max: 15 },
    setupSec:            { label: "Setup per exercise",     unit: "s",   min: 0, max: 600 },
    warmupMin:           { label: "Warm-up",                unit: "min", min: 0, max: 30 },
    freeWeightChangeSec: { label: "Kit change",             unit: "s",   min: 0, max: 600 },
    machineMoveSec:      { label: "Machine → machine",      unit: "s",   min: 0, max: 600 },
    tolerancePct:        { label: "Allowed over target",    unit: "%",   min: 0, max: 50 },
  };
  const INTENSITY_FIELDS = {
    repsMin: { label: "Reps from", min: 1, max: 50 },
    repsMax: { label: "Reps to",   min: 1, max: 50 },
    sets:    { label: "Sets",      min: 1, max: 10 },
    restSec: { label: "Rest (s)",  min: 0, max: 600 },
    holdSec: { label: "Hold (s)",  min: 5, max: 300 },
  };

  function empty() {
    return { version: VERSION, overrides: {}, gymStations: null, presets: [], last: {} };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return empty();
      return normalise(JSON.parse(raw));
    } catch (e) {
      return empty(); // storage blocked or corrupted -> start fresh
    }
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) { return false; }
  }

  // Make sure a loaded/imported object has the right shape; drop anything odd.
  function normalise(obj) {
    if (!obj || typeof obj !== "object") throw new Error("Not a Worknao backup.");
    if (obj.version !== VERSION) throw new Error(`Unknown backup version: ${obj.version}`);
    const out = empty();
    const o = obj.overrides || {};
    for (const k of Object.keys(NUMBER_FIELDS)) if (isNum(o[k])) out.overrides[k] = o[k];
    if (o.intensities && typeof o.intensities === "object") {
      out.overrides.intensities = {};
      for (const lvl of Object.keys(BASE.intensities)) {
        const src = o.intensities[lvl];
        if (!src) continue;
        const clean = {};
        for (const f of Object.keys(INTENSITY_FIELDS)) if (isNum(src[f])) clean[f] = src[f];
        if (Object.keys(clean).length) out.overrides.intensities[lvl] = clean;
      }
    }
    if (Array.isArray(obj.gymStations)) {
      out.gymStations = obj.gymStations.filter((s) => s in BASE.stations);
    }
    if (Array.isArray(obj.presets)) {
      out.presets = obj.presets
        .filter((p) => p && typeof p.label === "string" && Array.isArray(p.groups))
        .map((p) => ({
          id: String(p.id || "p" + Math.random().toString(36).slice(2, 8)),
          label: p.label.slice(0, 20),
          groups: p.groups.filter((g) => g in BASE.groups),
        }))
        .filter((p) => p.groups.length);
    }
    if (obj.last && typeof obj.last === "object") {
      const l = obj.last;
      if (isNum(l.durationMin)) out.last.durationMin = l.durationMin;
      if (l.intensity in BASE.intensities) out.last.intensity = l.intensity;
      if (l.equipmentMode in BASE.equipmentModes) out.last.equipmentMode = l.equipmentMode;
      for (const k of ["compoundFirst", "minimiseChanges", "warmup"]) {
        if (typeof l[k] === "boolean") out.last[k] = l[k];
      }
      if (isNum(l.maxStations)) out.last.maxStations = l.maxStations;
    }
    return out;
  }
  const isNum = (v) => typeof v === "number" && isFinite(v);

  // Rebuild Gym.config = config.js values + your overrides.
  // (We change the existing object in place so every file sees the update.)
  function applyToConfig(data) {
    const C = Gym.config, o = data.overrides || {};
    C.secondsPerRep = o.secondsPerRep ?? BASE.secondsPerRep;
    C.setupSec = o.setupSec ?? BASE.setupSec;
    C.warmupMin = o.warmupMin ?? BASE.warmupMin;
    C.freeWeightChangeSec = o.freeWeightChangeSec ?? BASE.freeWeightChangeSec;
    C.machineMoveSec = o.machineMoveSec ?? BASE.machineMoveSec;
    C.tolerance = (o.tolerancePct ?? BASE.tolerance * 100) / 100;
    for (const [lvl, base] of Object.entries(BASE.intensities)) {
      const ov = (o.intensities || {})[lvl] || {};
      const min = ov.repsMin ?? base.reps[0];
      const max = Math.max(min, ov.repsMax ?? base.reps[1]);
      Object.assign(C.intensities[lvl], {
        reps: [min, max],
        sets: ov.sets ?? base.sets,
        restSec: ov.restSec ?? base.restSec,
        holdSec: ov.holdSec ?? base.holdSec,
      });
    }
    C.gymStations = data.gymStations && data.gymStations.length
      ? data.gymStations.slice() : Object.keys(BASE.stations);
  }

  // Current value of a setting (override if set, else config.js) — for the form.
  function currentValue(data, key) {
    const o = data.overrides || {};
    if (key === "tolerancePct") return o.tolerancePct ?? Math.round(BASE.tolerance * 100);
    return o[key] ?? BASE[key];
  }
  function currentIntensity(data, lvl, field) {
    const ov = ((data.overrides || {}).intensities || {})[lvl] || {};
    const b = BASE.intensities[lvl];
    const baseVals = { repsMin: b.reps[0], repsMax: b.reps[1], sets: b.sets, restSec: b.restSec, holdSec: b.holdSec };
    return ov[field] ?? baseVals[field];
  }

  // ---- Export / import ----
  function exportFile(data) {
    const copy = Object.assign({ exportedAt: new Date().toISOString(), app: "Worknao" }, data);
    const blob = new Blob([JSON.stringify(copy, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `worknao-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  // Returns a clean object or throws an Error with a readable message.
  function parseImport(text) {
    let obj;
    try { obj = JSON.parse(text); } catch (e) { throw new Error("This file isn't valid JSON."); }
    return normalise(obj);
  }

  return { KEY, BASE, NUMBER_FIELDS, INTENSITY_FIELDS, empty, load, save, applyToConfig,
           currentValue, currentIntensity, exportFile, parseImport };
})();
