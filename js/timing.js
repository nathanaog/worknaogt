/* timing.js — the time estimate, with all its working shown.
 *
 * The formulas (all numbers come from config.js):
 *   time per set       = reps × seconds-per-rep           (or the hold time for planks etc.)
 *   time per exercise  = sets × time per set + (sets − 1) × rest + setup
 *   station changes    = free-weight kit changes × 120 s + machine → machine moves × 45 s
 *   total              = warm-up + sum of exercises + station changes
 *
 * "reps" for the estimate = middle of the range, e.g. 8–12 → 10.
 */
window.Gym = window.Gym || {};

Gym.timing = (function () {
  const C = () => Gym.config;

  // Prescription + time for ONE exercise at a given intensity.
  function exercisePlan(ex, intensityKey) {
    const p = C().intensities[intensityKey];
    const sets = p.sets;
    let perSet, label, repsUsed = null;
    if (ex.timed) {
      perSet = p.holdSec;
      label = `${sets} × ${p.holdSec} s hold`;
    } else {
      repsUsed = Math.round((p.reps[0] + p.reps[1]) / 2);
      perSet = repsUsed * C().secondsPerRep;
      label = `${sets} × ${p.reps[0]}–${p.reps[1]}`;
    }
    const work = sets * perSet;
    const rest = (sets - 1) * p.restSec;
    const setup = C().setupSec;
    return { sets, perSet, repsUsed, label, restSec: p.restSec,
             work, rest, setup, total: work + rest + setup };
  }

  // What does moving from exercise a to exercise b cost?
  //   same free-weight kit (barbell → barbell)   : 0 s, you keep your kit
  //   machine → a different machine              : 45 s walk
  //   anything else (barbell → dumbbells, ...)   : 120 s kit change
  function changeCost(a, b) {
    if (a.equipment === "machine" && b.equipment === "machine") {
      return { kind: "machine", sec: C().machineMoveSec };
    }
    if (a.equipment === b.equipment) return { kind: "none", sec: 0 };
    return { kind: "free", sec: C().freeWeightChangeSec };
  }

  // Full estimate for an ordered list of exercises.
  function estimate(exercises, intensityKey, warmupOn) {
    const warmupSec = warmupOn ? C().warmupMin * 60 : 0;
    let freeChanges = 0, machineMoves = 0, changeSec = 0, exerciseSec = 0;
    const lines = exercises.map((ex, i) => {
      const plan = exercisePlan(ex, intensityKey);
      const change = i === 0 ? { kind: "none", sec: 0 } : changeCost(exercises[i - 1], ex);
      if (change.kind === "free") freeChanges++;
      if (change.kind === "machine") machineMoves++;
      changeSec += change.sec;
      exerciseSec += plan.total;
      return { ex, plan, changeBefore: change };
    });
    return {
      warmupSec, exerciseSec, changeSec, freeChanges, machineMoves,
      totalSec: warmupSec + exerciseSec + changeSec,
      lines,
    };
  }

  // 125 -> "2:05"
  function mmss(sec) {
    const m = Math.floor(sec / 60), s = Math.round(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  return { exercisePlan, changeCost, estimate, mmss };
})();
