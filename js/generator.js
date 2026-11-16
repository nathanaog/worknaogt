/* generator.js — picks and orders the exercises. No UI code in here.
 *
 * The rules, each explainable in one sentence:
 *  1. POOL     Only core exercises that match your chosen muscles and allowed kit.
 *  2. FAIR     Each new exercise goes to the chosen group that is furthest below
 *              its fair share (share = group weight, e.g. Back 2.5 vs Biceps 1).
 *  3. COMPOUND A group's first exercise is a compound lift (if "compound first" is on).
 *  4. KIT      If you're already using some kit, exercises on that kit score higher
 *              (if "minimise equipment changes" is on).
 *  5. VARIETY  Exercises hitting the exact same muscle as one already picked score lower;
 *              no duplicates ever.
 *  6. TIME     Keep adding until the next exercise would push the total over target + 10%.
 *  7. ORDER    Group exercises into blocks by kit. Blocks with a compound lift go first,
 *              heaviest kit first (barbell → Smith → EZ → dumbbell → kettlebell → cable →
 *              machines → bands → bodyweight); inside a block compounds come before isolation,
 *              big muscles before small. Never come back to a block once you've left it.
 *
 * "Score" = a random number from 0 to 1 + small bonuses/penalties (see config.scoring).
 * So the bonuses nudge the choice; the random part keeps workouts varied.
 */
window.Gym = window.Gym || {};

Gym.generator = (function () {
  const C = () => Gym.config;

  // ---------- helpers ----------
  const isCompound = (ex) => ex.mechanic === "compound";
  const primaryOf = (ex) => (ex.primary && ex.primary[0]) || ex.group;

  // "Heaviness" for sorting: compounds first, then by muscle size.
  function heaviness(ex) {
    return (isCompound(ex) ? 0 : 100) + C().groupOrder.indexOf(ex.group);
  }

  function buildPool(data, opts) {
    const allowed = new Set(C().equipmentModes[opts.equipmentMode].allow);
    const groups = new Set(opts.groups);
    return data.filter((ex) => ex.core && allowed.has(ex.equipment) && groups.has(ex.group));
  }

  // Rule 2: which group is furthest below its fair share right now?
  function nextGroup(counts, groups, exhausted) {
    let best = null;
    for (const g of groups) {
      if (exhausted.has(g)) continue;
      const w = C().groups[g].weight;
      const share = counts[g] / w;
      if (best === null) { best = { g, share, w }; continue; }
      if (share < best.share - 1e-9 || (Math.abs(share - best.share) < 1e-9 && w > best.w)) {
        best = { g, share, w };
      }
    }
    return best && best.g;
  }

  // Rules 3–5: score candidates for one group and return the best one.
  function pickFor(group, chosen, pool, opts, rng, extra) {
    extra = extra || {};
    const S = C().scoring;
    const usedIds = new Set(chosen.map((e) => e.id));
    let cands = pool.filter((ex) => ex.group === group && !usedIds.has(ex.id) && ex.id !== extra.excludeId);
    if (cands.length === 0) return null;

    const inGroup = chosen.filter((e) => e.group === group).length;
    if (opts.compoundFirst && (extra.forceCompound || (inGroup === 0 && !extra.swap))) {
      const comp = cands.filter(isCompound);
      if (comp.length) cands = comp;
    }

    // "Max stations" limit: once we've used N stations, stay on them.
    // (All machines together count as one station for this limit.)
    const blockOf = (ex) => ex.equipment;
    const usedStations = new Set(chosen.map(blockOf));
    if (opts.maxStations > 0 && usedStations.size >= opts.maxStations) {
      const limited = cands.filter((ex) => usedStations.has(blockOf(ex)));
      if (limited.length) cands = limited;
    }

    let best = null;
    for (const ex of cands) {
      let score = rng();
      if (opts.minimiseChanges && usedStations.has(ex.equipment)) score += S.sameStationBonus;
      if (extra.preferStation && ex.equipment === extra.preferStation) score += 1; // swaps: stay on same kit
      if (opts.intensity === "heavy" && isCompound(ex)) score += S.heavyCompoundBonus;
      if (inGroup >= 2 && !isCompound(ex)) score += S.lateIsolationBonus;
      const samePrimary = chosen.filter((e) => primaryOf(e) === primaryOf(ex)).length;
      score -= samePrimary * S.samePrimaryPenalty;
      if (!best || score > best.score) best = { ex, score };
    }
    return best.ex;
  }

  // Rule 7: put the chosen exercises in a sensible order.
  function order(list, opts) {
    const byHeaviness = (a, b) => heaviness(a) - heaviness(b);
    let result;
    if (opts.minimiseChanges) {
      // Group into blocks by station.
      const blocks = {};
      list.forEach((ex) => (blocks[ex.equipment] = blocks[ex.equipment] || []).push(ex));
      const blockList = Object.entries(blocks).map(([station, items]) => {
        if (opts.compoundFirst) items.sort(byHeaviness);
        // Blocks that contain a compound lift go first (if compound-first is on);
        // ties are broken by how heavy the kit is: barbell → Smith → EZ → dumbbell → ...
        return {
          station, items,
          rank: opts.compoundFirst && items.some(isCompound) ? 0 : 1,
          stationOrder: C().stations[station].order,
        };
      });
      blockList.sort((a, b) => a.rank - b.rank || a.stationOrder - b.stationOrder);
      result = blockList.flatMap((b) => b.items);
    } else {
      result = list.slice();
      if (opts.compoundFirst) result.sort(byHeaviness);
    }
    return avoidBackToBack(result);
  }

  // Avoid the same exact muscle twice in a row: pull a later exercise forward
  // if it's on the same kit and the same type (compound/isolation).
  function avoidBackToBack(list) {
    const out = list.slice();
    for (let i = 0; i < out.length - 1; i++) {
      if (primaryOf(out[i]) !== primaryOf(out[i + 1])) continue;
      for (let j = i + 2; j < out.length; j++) {
        const cand = out[j];
        if (cand.equipment === out[i + 1].equipment &&
            isCompound(cand) === isCompound(out[i + 1]) &&
            primaryOf(cand) !== primaryOf(out[i])) {
          out.splice(j, 1);
          out.splice(i + 1, 0, cand);
          break;
        }
      }
    }
    return out;
  }

  // ---------- main entry point ----------
  // opts: { groups[], durationMin, intensity, equipmentMode, compoundFirst,
  //         minimiseChanges, warmup, maxStations, seed }
  function generate(data, opts) {
    const rng = Gym.makeRandom(opts.seed);
    const pool = buildPool(data, opts);
    const targetSec = opts.durationMin * 60;
    const limitSec = targetSec * (1 + C().tolerance);
    const notes = [];

    const counts = {};
    opts.groups.forEach((g) => (counts[g] = 0));
    const exhausted = new Set();
    opts.groups.forEach((g) => {
      if (!pool.some((ex) => ex.group === g)) {
        exhausted.add(g);
        notes.push(`No ${C().groups[g].label} exercises available with "${C().equipmentModes[opts.equipmentMode].label}" — skipped.`);
      }
    });

    let chosen = [];
    for (let safety = 0; safety < 30; safety++) {
      const g = nextGroup(counts, opts.groups, exhausted);
      if (!g) break;
      const ex = pickFor(g, chosen, pool, opts, rng);
      if (!ex) { exhausted.add(g); continue; }
      const trial = order(chosen.concat(ex), opts);
      const est = Gym.timing.estimate(trial, opts.intensity, opts.warmup);
      if (chosen.length > 0 && est.totalSec > limitSec) break; // Rule 6
      chosen = trial;
      counts[g]++;
    }

    const est = Gym.timing.estimate(chosen, opts.intensity, opts.warmup);
    if (est.totalSec > limitSec) {
      notes.push(`Even one exercise takes longer than ${opts.durationMin} min at this intensity.`);
    }
    return { opts, exercises: chosen, estimate: est, notes, targetSec, limitSec };
  }

  // Swap ONE exercise for another in the same muscle group, preferring the same kit.
  function swap(data, workout, index, seed) {
    const opts = workout.opts;
    const rng = Gym.makeRandom(seed);
    const pool = buildPool(data, opts);
    const old = workout.exercises[index];
    const others = workout.exercises.filter((_, i) => i !== index);
    const replacement = pickFor(old.group, others, pool, opts, rng, {
      swap: true,
      excludeId: old.id,
      preferStation: old.equipment,
      forceCompound: opts.compoundFirst && isCompound(old),
    });
    if (!replacement) return null; // nothing else available
    const list = order(others.concat(replacement), opts);
    return Object.assign({}, workout, {
      exercises: list,
      estimate: Gym.timing.estimate(list, opts.intensity, opts.warmup),
      swappedId: replacement.id,
    });
  }

  // Count blocks for display: consecutive runs of the same station
  // (all machines count as one "Machines" block).
  function blocks(exercises) {
    const out = [];
    exercises.forEach((ex, i) => {
      const last = out[out.length - 1];
      if (last && last.station === ex.equipment) last.indexes.push(i);
      else out.push({ station: ex.equipment, indexes: [i] });
    });
    return out;
  }

  return { generate, swap, blocks, order };
})();
