/* settings.js — the Settings screen.
 *
 * Sections: My gym · Intensity · Timing · My presets · Backup.
 * Every change is saved straight away (no Save button) and the preview
 * under "Intensity" recalculates live, so you see what a number does.
 *
 * app.js hands us two functions:
 *   api.data()          -> the current saved data (see storage.js)
 *   api.commit(newData) -> save it, and apply it to the generator
 */
window.Gym = window.Gym || {};

Gym.settingsUI = function (api) {
  const C = Gym.config;
  const S = Gym.storage;
  const $ = (sel) => document.querySelector(sel);
  const root = $("#settings-body");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const mmss = Gym.timing.mmss;
  let pendingImport = null;  // a parsed backup waiting for "Replace"
  let resetArmed = false;    // reset needs two taps (no pop-up dialogs)

  const clone = (o) => JSON.parse(JSON.stringify(o));

  // ---------------- Drawing ----------------
  function render() {
    const d = api.data();
    root.innerHTML = `
      ${gymSection(d)}
      ${intensitySection(d)}
      ${timingSection(d)}
      ${presetsSection(d)}
      ${backupSection()}
      <p class="hint-left">Changes save automatically on this phone.</p>`;
    renderPreview();
  }

  function gymSection(d) {
    const have = new Set(C.gymStations);
    const chips = Object.entries(C.stations).map(([k, st]) =>
      `<button class="chip chip-kit" style="--st: var(--st-${k})" data-station="${k}" aria-pressed="${have.has(k)}">
         <span class="block-dot"></span>${st.label}</button>`).join("");
    return `<section class="set-section">
      <h2 class="set-title">My gym</h2>
      <p class="set-help">Untick anything your gym doesn't have. The kit buttons on the main screen only use what's ticked.</p>
      <div class="chips">${chips}</div>
    </section>`;
  }

  function numInput(id, value, f, extra) {
    return `<input class="num" type="number" inputmode="numeric" id="${id}" value="${value}"
              min="${f.min}" max="${f.max}" step="1" ${extra || ""}>`;
  }

  function intensitySection(d) {
    const F = S.INTENSITY_FIELDS;
    const head = Object.values(F).map((f) => `<th scope="col">${f.label}</th>`).join("");
    const rows = Object.entries(C.intensities).map(([lvl, p]) => `
      <tr><th scope="row">${p.label}</th>
        ${Object.entries(F).map(([field, f]) =>
          `<td>${numInput(`int-${lvl}-${field}`, S.currentIntensity(d, lvl, field), f,
              `data-lvl="${lvl}" data-field="${field}" aria-label="${p.label} ${f.label}"`)}</td>`).join("")}
      </tr>`).join("");
    return `<section class="set-section">
      <h2 class="set-title">Intensity</h2>
      <div class="table-scroll"><table class="int-table"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
      <div id="preview" class="preview" aria-live="polite"></div>
    </section>`;
  }

  function timingSection(d) {
    const rows = Object.entries(S.NUMBER_FIELDS).map(([key, f]) => `
      <label class="num-row"><span>${f.label}</span>
        <span class="num-wrap">${numInput(`num-${key}`, S.currentValue(d, key), f, `data-key="${key}"`)}<span class="unit">${f.unit}</span></span>
      </label>`).join("");
    return `<section class="set-section">
      <h2 class="set-title">Timing</h2>
      ${rows}
    </section>`;
  }

  function presetsSection(d) {
    const items = d.presets.length
      ? d.presets.map((p) => `<li class="preset-row"><span><b>${esc(p.label)}</b>
           <span class="set-help">${esc(Gym.groupsLabelRaw(p.groups))}</span></span>
           <button class="btn-small" data-delete-preset="${esc(p.id)}">Delete</button></li>`).join("")
      : `<li class="set-help">None yet. On the main screen, pick muscles that don't match a preset and tap "Save as preset".</li>`;
    return `<section class="set-section">
      <h2 class="set-title">My presets</h2>
      <ul class="preset-list">${items}</ul>
    </section>`;
  }

  function backupSection() {
    return `<section class="set-section">
      <h2 class="set-title">Backup</h2>
      <p class="set-help">Export saves your gym, numbers, presets and options to one file. Import loads such a file back.</p>
      <div class="btn-row">
        <button class="btn-secondary" id="export">Export</button>
        <label class="btn-secondary btn-file">Import<input type="file" id="import" accept="application/json,.json" hidden></label>
      </div>
      <div id="import-msg" aria-live="polite"></div>
      <button class="btn-text-danger" id="reset">${resetArmed ? "Tap again to reset gym and numbers" : "Reset gym and numbers to defaults"}</button>
    </section>`;
  }

  // Live maths: what one exercise takes at each intensity, and how many fit.
  function renderPreview() {
    const el = $("#preview");
    if (!el) return;
    const fake = { timed: false };
    const lines = Object.entries(C.intensities).map(([lvl, p]) => {
      const t = Gym.timing.exercisePlan(fake, lvl);
      const fits = [30, 45, 60].map((min) => {
        const limit = min * 60 * (1 + C.tolerance) - C.warmupMin * 60;
        return `${min} min → ${Math.max(0, Math.floor(limit / t.total))}`;
      }).join(", ");
      return `<p><b>${p.label}:</b> ${t.sets} × (${t.repsUsed} reps × ${C.secondsPerRep} s) + ${t.sets - 1} × ${t.restSec} s rest + ${t.setup} s setup
        = <b>${mmss(t.total)}</b> per exercise<br><span class="set-help">Fits (incl. ${C.warmupMin} min warm-up, before kit changes): ${fits}</span></p>`;
    }).join("");
    el.innerHTML = lines;
  }

  // ---------------- Reacting to input ----------------
  function clamp(v, f) { return Math.min(f.max, Math.max(f.min, Math.round(v))); }

  // Store a number only if it differs from config.js; otherwise remove the override.
  function setNumber(input, final) {
    const raw = parseFloat(input.value);
    if (!isFinite(raw)) { if (final) render(); return; }
    const d = clone(api.data());
    d.overrides = d.overrides || {};
    if (input.dataset.key) {
      const key = input.dataset.key, f = S.NUMBER_FIELDS[key];
      if (!final && (raw < f.min || raw > f.max)) return; // still typing
      const v = clamp(raw, f);
      const base = key === "tolerancePct" ? Math.round(S.BASE.tolerance * 100) : S.BASE[key];
      if (v === base) delete d.overrides[key]; else d.overrides[key] = v;
      if (final) input.value = v;
    } else {
      const { lvl, field } = input.dataset, f = S.INTENSITY_FIELDS[field];
      if (!final && (raw < f.min || raw > f.max)) return;
      const v = clamp(raw, f);
      const b = S.BASE.intensities[lvl];
      const base = { repsMin: b.reps[0], repsMax: b.reps[1], sets: b.sets, restSec: b.restSec, holdSec: b.holdSec }[field];
      d.overrides.intensities = d.overrides.intensities || {};
      const ov = d.overrides.intensities[lvl] = d.overrides.intensities[lvl] || {};
      if (v === base) delete ov[field]; else ov[field] = v;
      if (!Object.keys(ov).length) delete d.overrides.intensities[lvl];
      if (final) input.value = v;
    }
    api.commit(d);
    renderPreview();
  }

  root.addEventListener("input", (e) => { if (e.target.classList.contains("num")) setNumber(e.target, false); });
  root.addEventListener("change", (e) => {
    if (e.target.classList.contains("num")) setNumber(e.target, true);
    if (e.target.id === "import") readImport(e.target.files[0]);
  });

  root.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const d = clone(api.data());
    if (b.dataset.station) {
      const have = new Set(C.gymStations);
      const k = b.dataset.station;
      if (have.has(k)) {
        if (have.size === 1) return; // keep at least one
        have.delete(k);
      } else have.add(k);
      d.gymStations = Object.keys(C.stations).filter((s) => have.has(s));
      if (d.gymStations.length === Object.keys(C.stations).length) d.gymStations = null; // = everything
      api.commit(d);
      render();
    } else if (b.dataset.deletePreset) {
      d.presets = d.presets.filter((p) => p.id !== b.dataset.deletePreset);
      api.commit(d);
      render();
    } else if (b.id === "export") {
      S.exportFile(api.data());
    } else if (b.id === "import-replace" && pendingImport) {
      api.commit(pendingImport);
      pendingImport = null;
      render();
      $("#import-msg").innerHTML = `<p class="msg-ok">Backup loaded.</p>`;
    } else if (b.id === "import-cancel") {
      pendingImport = null;
      $("#import-msg").innerHTML = "";
    } else if (b.id === "reset") {
      if (!resetArmed) {
        resetArmed = true;
        b.textContent = "Tap again to reset gym and numbers";
        setTimeout(() => { resetArmed = false; if (b.isConnected) b.textContent = "Reset gym and numbers to defaults"; }, 4000);
        return;
      }
      resetArmed = false;
      d.overrides = {};
      d.gymStations = null;
      api.commit(d);
      render();
    }
  });

  function readImport(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const msg = $("#import-msg");
      try {
        const data = S.parseImport(reader.result);
        pendingImport = data;
        const changed = Object.keys(data.overrides).filter((k) => k !== "intensities").length
          + Object.values(data.overrides.intensities || {}).reduce((n, o) => n + Object.keys(o).length, 0);
        const kit = data.gymStations ? `${data.gymStations.length} of ${Object.keys(C.stations).length} kit types` : "all kit types";
        msg.innerHTML = `<div class="import-box">
          <p>This backup has <b>${data.presets.length}</b> preset${data.presets.length === 1 ? "" : "s"},
             gym: <b>${kit}</b>, and <b>${changed}</b> changed number${changed === 1 ? "" : "s"}.
             Replace your current settings with it?</p>
          <div class="btn-row"><button class="btn-secondary" id="import-cancel">Cancel</button>
          <button class="btn-primary" id="import-replace">Replace</button></div></div>`;
      } catch (err) {
        pendingImport = null;
        msg.innerHTML = `<p class="msg-err">Couldn't import: ${esc(err.message)}</p>`;
      }
      $("#import").value = "";
    };
    reader.readAsText(file);
  }

  return { render };
};
