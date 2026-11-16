/* app.js — the user interface: draws the screens and reacts to taps.
 *
 * The thinking is all in generator.js and timing.js; this file only
 *  1. keeps track of what you've selected ("state"),
 *  2. draws the three screens from that state,
 *  3. switches screens using the bit after # in the address bar
 *     (#workout, #exercise) — that way your phone's back button works.
 */
(function () {
  const C = Gym.config;
  const DATA = window.EXERCISE_DATA || [];
  const BY_ID = Object.fromEntries(DATA.map((e) => [e.id, e]));
  const $ = (sel) => document.querySelector(sel);
  const LEGS = ["quads", "hamstrings", "glutes", "calves"];

  // ---------------- State: everything the user has chosen ----------------
  const state = Object.assign({
    groups: new Set(),
    workout: null,   // the generated workout
    seed: 0,
    swaps: 0,
    detailId: null,  // which exercise the detail screen shows
    flashId: null,   // highlight the exercise you just swapped in
  }, C.defaults);

  // ---------------- Small helpers ----------------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const mmss = Gym.timing.mmss;
  const imgUrl = (path) => C.imageBase + path;
  const stationVar = (st) => `--st: var(--st-${st})`;

  function imgTag(ex, i, cls) {
    if (!ex.images || !ex.images[i]) return `<div class="img-missing ${cls || ""}">No image</div>`;
    // loading="lazy": the phone only downloads the picture when it's about to be on screen
    return `<img class="${cls || ""}" loading="lazy" alt="" src="${esc(imgUrl(ex.images[i]))}">`;
  }
  // If an image fails to load (offline, missing file), swap in a grey "No image" box.
  document.addEventListener("error", (e) => {
    const el = e.target;
    if (el.tagName === "IMG") {
      const box = document.createElement("div");
      box.className = "img-missing " + el.className;
      box.textContent = "No image";
      el.replaceWith(box);
    }
  }, true);

  function groupsLabel(groups) {
    const list = [...groups];
    for (const p of Object.values(C.presets)) {
      if (p.groups.length === list.length && p.groups.every((g) => groups.has(g))) return p.label;
    }
    const parts = [];
    if (LEGS.every((g) => groups.has(g))) parts.push("Legs");
    for (const g of Object.keys(C.groups)) {
      if (groups.has(g) && !(parts.includes("Legs") && LEGS.includes(g))) parts.push(C.groups[g].label);
    }
    return parts.join(" + ");
  }

  // ================= SCREEN 1: build =================
  function buildControls() {
    // Presets
    $("#presets").innerHTML = Object.entries(C.presets).map(([k, p]) =>
      `<button class="chip" data-preset="${k}" aria-pressed="false">${p.label}</button>`).join("");
    // Muscle chips (Legs is one chip that controls the 4 leg sub-groups)
    const main = ["chest", "back", "shoulders", "biceps", "triceps", "legs", "core"];
    $("#muscles").innerHTML = main.map((g) =>
      `<button class="chip" data-group="${g}" aria-pressed="false">${g === "legs" ? "Legs" : C.groups[g].label}</button>`).join("");
    $("#leg-subs").innerHTML = LEGS.map((g) =>
      `<button class="chip" data-group="${g}" aria-pressed="false">${C.groups[g].label}</button>`).join("");
    // Intensity
    $("#intensity").innerHTML = Object.entries(C.intensities).map(([k, p]) =>
      `<button class="seg" role="radio" data-intensity="${k}">${p.label}<small>${p.reps[0]}–${p.reps[1]} reps</small></button>`).join("");
    // Equipment modes
    $("#equipment").innerHTML = Object.entries(C.equipmentModes).map(([k, m]) =>
      `<button class="seg ${k === "machines" ? "seg-machines" : ""}" role="radio" data-mode="${k}">${m.label}</button>`).join("");

    $("#duration").value = state.durationMin;
    $("#compoundFirst").checked = state.compoundFirst;
    $("#minimiseChanges").checked = state.minimiseChanges;
    $("#warmup").checked = state.warmup;
    $("#maxStations").value = String(state.maxStations);
  }

  function refreshBuild() {
    document.querySelectorAll("[data-preset]").forEach((b) => {
      const p = C.presets[b.dataset.preset].groups;
      const on = p.length === state.groups.size && p.every((g) => state.groups.has(g));
      b.setAttribute("aria-pressed", on);
    });
    document.querySelectorAll("[data-group]").forEach((b) => {
      const g = b.dataset.group;
      const on = g === "legs" ? LEGS.some((x) => state.groups.has(x)) : state.groups.has(g);
      b.setAttribute("aria-pressed", on);
    });
    $("#leg-subs").hidden = !LEGS.some((x) => state.groups.has(x));
    document.querySelectorAll("[data-intensity]").forEach((b) =>
      b.setAttribute("aria-checked", b.dataset.intensity === state.intensity));
    document.querySelectorAll("[data-mode]").forEach((b) =>
      b.setAttribute("aria-checked", b.dataset.mode === state.equipmentMode));
    $("#duration-out").textContent = `${state.durationMin} min`;
    const ready = state.groups.size > 0;
    $("#generate").disabled = !ready;
    $("#build-hint").textContent = ready ? groupsLabel(state.groups) : "Pick a preset or at least one muscle.";
  }

  function wireBuild() {
    $("#screen-build").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.preset) {
        state.groups = new Set(C.presets[b.dataset.preset].groups);
      } else if (b.dataset.group === "legs") {
        const anyOn = LEGS.some((g) => state.groups.has(g));
        LEGS.forEach((g) => (anyOn ? state.groups.delete(g) : state.groups.add(g)));
      } else if (b.dataset.group) {
        const g = b.dataset.group;
        state.groups.has(g) ? state.groups.delete(g) : state.groups.add(g);
      } else if (b.dataset.intensity) {
        state.intensity = b.dataset.intensity;
      } else if (b.dataset.mode) {
        state.equipmentMode = b.dataset.mode;
      }
      refreshBuild();
    });
    $("#duration").addEventListener("input", (e) => { state.durationMin = +e.target.value; refreshBuild(); });
    $("#compoundFirst").addEventListener("change", (e) => (state.compoundFirst = e.target.checked));
    $("#minimiseChanges").addEventListener("change", (e) => (state.minimiseChanges = e.target.checked));
    $("#warmup").addEventListener("change", (e) => (state.warmup = e.target.checked));
    $("#maxStations").addEventListener("change", (e) => (state.maxStations = +e.target.value));
    $("#generate").addEventListener("click", () => generate());
  }

  // ================= SCREEN 2: workout =================
  function currentOpts() {
    return {
      groups: [...state.groups], durationMin: state.durationMin, intensity: state.intensity,
      equipmentMode: state.equipmentMode, compoundFirst: state.compoundFirst,
      minimiseChanges: state.minimiseChanges, warmup: state.warmup,
      maxStations: state.maxStations, seed: state.seed,
    };
  }

  function generate() {
    state.seed = Gym.newSeed();
    state.swaps = 0;
    state.flashId = null;
    state.workout = Gym.generator.generate(DATA, currentOpts());
    go("workout");
  }

  function swapAt(index) {
    state.swaps++;
    // Each swap uses a new seed derived from the workout seed, so it's repeatable.
    const res = Gym.generator.swap(DATA, state.workout, index, state.seed + state.swaps * 7919);
    if (!res) {
      const ex = state.workout.exercises[index];
      alertNote(`No other ${C.groups[ex.group].label.toLowerCase()} exercise fits your kit settings.`);
      return null;
    }
    state.workout = res;
    state.flashId = res.swappedId;
    return res.swappedId;
  }

  function alertNote(text) {
    state.workout.notes = (state.workout.notes || []).concat(text);
    renderWorkout();
  }

  function renderWorkout() {
    const w = state.workout;
    const est = w.estimate;
    const o = w.opts;
    $("#workout-summary").textContent =
      `${groupsLabel(new Set(o.groups))}, ${o.durationMin} min, ${C.intensities[o.intensity].label.toLowerCase()}, kit: ${C.equipmentModes[o.equipmentMode].label.toLowerCase()}`;
    $("#total-time").textContent = Math.round(est.totalSec / 60);
    $("#notes").innerHTML = w.notes.map((n) => `<li>${esc(n)}</li>`).join("");
    $("#breakdown-body").innerHTML = breakdownHtml(w);

    // Draw the list block by block
    const blocks = Gym.generator.blocks(w.exercises);
    $("#workout-list").innerHTML = blocks.map((b, bi) => {
      const st = C.stations[b.station];
      const first = est.lines[b.indexes[0]];
      const changeHtml = bi > 0 && first.changeBefore.kind === "free"
        ? `<p class="change">Change kit (+${mmss(first.changeBefore.sec)})</p>` : "";
      const blockSec = b.indexes.reduce((s, i) => s + est.lines[i].plan.total, 0);
      const items = b.indexes.map((i) => {
        const l = est.lines[i];
        const walk = l.changeBefore.kind === "machine" && i !== b.indexes[0]
          ? `<p class="walk">Walk to next machine (+${mmss(l.changeBefore.sec)})</p>` : "";
        return `${walk}
          <div class="ex ${l.ex.id === state.flashId ? "just-swapped" : ""}">
            <button class="ex-main" data-open="${esc(l.ex.id)}">
              ${imgTag(l.ex, 0, "ex-img")}
              <span>
                <span class="ex-name"><span class="ex-num">${i + 1}</span>${esc(l.ex.name)}</span>
                <span class="ex-rx">${l.plan.label}, rest ${l.plan.restSec} s, ${mmss(l.plan.total)}</span>
              </span>
            </button>
            <button class="btn-swap" data-swap="${i}" aria-label="Swap ${esc(l.ex.name)}">Swap</button>
          </div>`;
      }).join("");
      return `${changeHtml}
        <section class="block" style="${stationVar(b.station)}">
          <h2 class="block-head"><span class="block-dot"></span>${st.label}<span class="block-meta">${mmss(blockSec)}</span></h2>
          ${items}
        </section>`;
    }).join("");
  }

  // The "How is this calculated?" panel, with the real numbers
  function breakdownHtml(w) {
    const e = w.estimate;
    const spr = C.secondsPerRep;
    const lines = e.lines.map((l, i) => {
      const p = l.plan;
      const perSet = l.ex.timed
        ? `${p.perSet} s hold`
        : `(${p.repsUsed} reps × ${spr} s = ${p.perSet} s)`;
      return `<div class="calc-line"><b>${i + 1}. ${esc(l.ex.name)}</b>
        <span class="calc-math">${p.sets} sets × ${perSet} = ${p.work} s
        + ${p.sets - 1} rests × ${p.restSec} s = ${p.rest} s
        + setup ${p.setup} s
        = <strong>${p.total} s (${mmss(p.total)})</strong></span></div>`;
    }).join("");
    const repNote = `Reps used for timing = middle of the range (e.g. 8–12 → 10).`;
    return `
      <p class="calc-math">${repNote}</p>
      ${lines}
      <div class="calc-line"><b>Station changes</b>
        <span class="calc-math">${e.freeChanges} kit change${e.freeChanges === 1 ? "" : "s"} × ${C.freeWeightChangeSec} s
        + ${e.machineMoves} machine move${e.machineMoves === 1 ? "" : "s"} × ${C.machineMoveSec} s
        = <strong>${e.changeSec} s (${mmss(e.changeSec)})</strong></span></div>
      <div class="calc-line"><b>Warm-up</b>
        <span class="calc-math">${e.warmupSec ? `${C.warmupMin} min = ${e.warmupSec} s` : "off = 0 s"}</span></div>
      <div class="calc-line calc-total">Total = ${e.warmupSec} + ${e.exerciseSec} + ${e.changeSec} = ${e.totalSec} s = ${mmss(e.totalSec)}
        <span class="calc-math"><br>Target ${mmss(w.targetSec)}. Exercises are added until the next one would push the total over ${mmss(w.limitSec)} (target + ${Math.round(C.tolerance * 100)}%).</span></div>`;
  }

  function wireWorkout() {
    $("#workout-list").addEventListener("click", (e) => {
      const sw = e.target.closest("[data-swap]");
      if (sw) { swapAt(+sw.dataset.swap); renderWorkout(); return; }
      const op = e.target.closest("[data-open]");
      if (op) { state.detailId = op.dataset.open; go("exercise"); }
    });
    $("#shuffle").addEventListener("click", () => {
      state.seed = Gym.newSeed();
      state.swaps = 0;
      state.flashId = null;
      state.workout = Gym.generator.generate(DATA, currentOpts());
      renderWorkout();
      window.scrollTo(0, 0);
    });
  }

  // ================= SCREEN 3: exercise detail =================
  function renderDetail() {
    const ex = BY_ID[state.detailId];
    const line = state.workout.estimate.lines.find((l) => l.ex.id === ex.id);
    const st = C.stations[ex.equipment];
    const list = (arr) => (arr && arr.length ? arr.map(esc).join(", ") : "—");
    $("#detail").innerHTML = `
      <h1>${esc(ex.name)}</h1>
      <span class="detail-kit" style="${stationVar(ex.equipment)}"><span class="block-dot"></span>${st.label}</span>
      <div class="detail-images">${imgTag(ex, 0)}${imgTag(ex, 1)}</div>
      ${line ? `<p class="detail-rx">${line.plan.label}, rest ${line.plan.restSec} s</p>` : ""}
      <dl class="facts">
        <dt>Main muscles</dt><dd>${list(ex.primary)}</dd>
        <dt>Also works</dt><dd>${list(ex.secondary)}</dd>
        <dt>Type</dt><dd>${ex.mechanic === "compound" ? "Compound (several joints)" : "Isolation (one joint)"}</dd>
        <dt>Level</dt><dd>${esc(ex.level || "—")}</dd>
      </dl>
      <h2 class="field-label">How to do it</h2>
      <ol class="steps">${ex.instructions.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`;
  }

  function wireDetail() {
    $("#detail-swap").addEventListener("click", () => {
      const idx = state.workout.exercises.findIndex((e) => e.id === state.detailId);
      const newId = swapAt(idx);
      if (newId) { state.detailId = newId; renderDetail(); window.scrollTo(0, 0); }
      else history.back();
    });
  }

  // ================= Navigation (screens via #hash) =================
  function go(screen) {
    const hash = "#" + screen;
    if (location.hash === hash) show();
    else location.hash = hash;   // triggers "hashchange" -> show()
  }

  function show() {
    let screen = location.hash.replace("#", "") || "build";
    if (screen !== "build" && !state.workout) screen = "build"; // e.g. after reloading the page
    if (screen === "exercise" && !BY_ID[state.detailId]) screen = "workout";
    $("#screen-build").hidden = screen !== "build";
    $("#screen-workout").hidden = screen !== "workout";
    $("#screen-detail").hidden = screen !== "exercise";
    if (screen === "build") refreshBuild();
    if (screen === "workout") renderWorkout();
    if (screen === "exercise") renderDetail();
    window.scrollTo(0, 0);
  }

  // All "back" buttons simply do what the phone's back button does.
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-go]")) return;
    if (location.hash) history.back();
    else show();
  });
  window.addEventListener("hashchange", show);

  // ================= Start =================
  if (!DATA.length) {
    document.body.innerHTML = "<p style='padding:20px'>Exercise data didn't load. Check that data/exercises.js exists (run tools/build_exercises.py).</p>";
    return;
  }
  buildControls();
  wireBuild();
  wireWorkout();
  wireDetail();
  if (location.hash) history.replaceState(null, "", location.pathname); // always start on screen 1
  show();
})();
