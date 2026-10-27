/* Pediatric DKA physiology model: a small, rule-based model calibrated to Nelson 22e ch. 629 and the PICU DKA protocol.
   Not a validated simulator: it reproduces the textbook course (glucose, ketoacids, bicarbonate, potassium, corrected
   sodium, effective osmolality, hydration, perfusion, cerebral edema) and responds to the orders a resident writes.
   Units: glucose mg/dL, electrolytes mEq/L (phosphate mg/dL), volumes mL, time minutes, insulin units/kg/h. */
(() => {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const FLUIDS = { NS: { na: 154, cl: 154 }, HALF: { na: 77, cl: 77 }, LR: { na: 130, cl: 109 } };
  /* Holliday-Segar hourly maintenance (Nelson table 74.3; protocol 4-2-1), capped at 100 mL/h */
  const maint = w => Math.min(100, w <= 10 ? 4 * w : w <= 20 ? 40 + 2 * (w - 10) : 60 + (w - 20));

  function create(c) {
    const s = {
      t: 0, wt: c.wt, wt0: c.wt0, age: c.age,
      deficit: c.deficitMl,                         // body water deficit, mL
      G: c.glucose, A: c.ketoacid, clD: 0,          // glucose; unmeasured ketoacids (mEq/L); hyperchloremia from saline
      NaC: c.naCorr,                                // corrected sodium
      Kdef: c.kDeficit * c.wt, Pdef: 0,             // total-body potassium deficit (mEq), phosphate losses (mmol)
      Ieff: 0, Ifloor: 0, sc: [],                           // insulin effect (lags the drip), subcutaneous insulin floor
      ce: 0, ceOn: null, ceRisk: c.ceRiskBase || 0, // cerebral edema 0..1, onset time, accumulated risk
      ceAt: c.ceAt,                                 // minute the edema process can start
      mannitol: [], hts: [],                        // osmotherapy doses: [{at, gkg}]
      bicarb: 0, insBolus: false, headUp: false, po: false, dead: false,
      inf: { main: { base: 'NS', dex: 0, kcl: 0, rate: 0 }, insulin: 0, boluses: [] },
      io: { inTotal: 0, out: 0, inNS: 0, hourIn: 0, hourOut: 0, hourMark: 0, lastHourIn: 0, lastHourOut: 0 },
      hist: [], temp: c.temp || 37.0, hyperK: false,
      maint: maint(c.wt)
    };
    derive(s);
    s.G0h = s.G; s.osm0h = s.eOsm; s.Nac0h = s.NaC; s.hourly = [];
    return s;
  }

  /* everything that follows from the state variables */
  function derive(s) {
    const defPct = Math.max(0, s.deficit) / (s.wt0 * 10);
    s.defPct = defPct;
    s.perf = clamp(1 - Math.max(0, defPct - 3) * 0.07, 0.4, 1);
    s.HCO3 = clamp(24 - s.A - s.clD, 2, 30);
    s.pCO2 = clamp(1.5 * s.HCO3 + 8 + (s.ce > 0.55 && !s.vent ? (s.ce - 0.55) * 60 : 0), 12, 80);   // ventilated: kept at the pre-deterioration level
    s.pH = 6.1 + Math.log10(s.HCO3 / (0.0307 * s.pCO2));
    s.Na = s.NaC - 1.6 * Math.max(0, s.G - 100) / 100;
    s.Cl = s.Na - 32 + s.clD;
    s.AG = s.Na - s.Cl - s.HCO3;
    s.eOsm = 2 * s.Na + s.G / 18;
    const insFrac = clamp(Math.max(s.Ieff, s.Ifloor) / 0.1, 0, 1.3);
    s.K = 4.4 - 0.3 * (s.Kdef / s.wt) + 0.6 * Math.max(0, 7.4 - s.pH) * 10 - 0.7 * insFrac + 0.25 * Math.max(0, s.G - 150) / 300;
    s.P = 3.6 - 0.9 * (s.Pdef / s.wt) + 4.2 * Math.max(0, 7.4 - s.pH) - 1.2 * insFrac;
    s.BHB = Math.max(0.1, s.A * 0.35);
    s.BUN = 11 + 18 * Math.min(1.4, defPct / 8.5);
    s.Cr = 0.45 + 0.025 * s.A + 0.15 * Math.min(1.4, defPct / 8.5);
    s.lact = 1.0 + 1.2 * Math.max(0, 1 - s.perf) / 0.4;
    /* hemodynamics and breathing */
    const ceS = Math.max(0, s.ce - 0.25);
    s.HR = Math.round(88 + 4 * defPct + 60 * Math.max(0, 7.2 - s.pH) + 6 * (s.temp - 37) - 110 * ceS + (s.G < 60 ? 15 : 0) + (s.K < 2.8 ? 6 : 0));
    s.SBP = Math.round(108 - 4 * Math.max(0, defPct - 7) + 45 * ceS);
    s.DBP = Math.round(64 - 3 * Math.max(0, defPct - 7) + 28 * ceS);
    s.RR = s.vent ? 22 : Math.round(clamp(16 + Math.max(0, 40 - s.pCO2) * 0.6 - (s.ce > 0.6 ? (s.ce - 0.6) * 40 : 0), 4, 50));
    s.SpO2 = Math.round(s.ce > 0.7 ? 99 - (s.ce - 0.7) * 40 : 99);
    s.CRT = Math.round((2 + Math.max(0, defPct - 6) * 0.45) * 2) / 2;
    if (s.arrestAt != null) { s.HR = 45; s.SBP = 150; s.RR = s.vent ? 22 : 4; s.SpO2 = s.vent ? 96 : 78; }
    /* neurology */
    let g = 15;
    if (s.pH < 7.1) g--;
    if (s.eOsm > 330) g--;
    if (s.G < 50) g -= 2; if (s.G < 35) g -= 4;
    g -= Math.round(Math.max(0, s.ce - 0.15) * 11) + Math.round(s.injury || 0);
    s.GCS = clamp(g, 3, 15);
    s.pupils = s.ce > 0.7 ? 'unequal' : s.ce > 0.5 ? 'sluggish' : 'normal';
    s.headache = s.ce > 0.1;
    s.vomit = s.ce > 0.2;
  }

  /* advance dt minutes (call with dt = 1) */
  function step(s, dt) {
    if (s.dead) return;
    const h = dt / 60, w = s.wt, inf = s.inf, m = inf.main, F = FLUIDS[m.base] || FLUIDS.NS;
    s.t += dt;
    /* insulin reaches its effect over ~45 min; a subcutaneous dose gives a floor that ramps over 2 h */
    s.Ieff += (inf.insulin - s.Ieff) * Math.min(1, dt / 45);
    /* subcutaneous insulin as an equivalent drip rate (U/kg/h): rapid acts from ~30 min, peaks 1–3 h, gone by ~5 h;
       basal (glargine) is the daily dose spread over 24 h after a 2 h onset */
    s.Ifloor = (s.sc || []).reduce((a, d) => { const x = s.t - d.at;
      if (d.kind === 'scBasal') return a + (x > 0 && x < 1440 ? d.dose / 24 * clamp(x / 120, 0, 1) : 0);
      return a + d.dose * 0.5 * (x < 30 ? clamp(x / 30, 0, 1) : x < 180 ? 1 : clamp(1 - (x - 180) / 120, 0, 1)); }, 0);
    const I = Math.max(s.Ieff, s.Ifloor);
    /* fluids in: maintenance line + boluses */
    let vol = m.rate * h, na = F.na * vol / 1000, cl = F.cl * vol / 1000, kIn = m.kcl * vol / 1000, dexMg = m.dex * 10 * vol;
    inf.boluses.forEach(b => {
      if (b.left <= 0) return;
      const v = Math.min(b.left, b.mlMin * dt); b.left -= v; vol += v;
      const BF = FLUIDS[b.fluid] || FLUIDS.NS; na += BF.na * v / 1000; cl += BF.cl * v / 1000;
      if (b.fluid === 'NS') s.io.inNS += v;
    });
    if (m.base === 'NS') s.io.inNS += m.rate * h;
    /* osmotherapy volume */
    if (s.htsVol > 0) { const v = Math.min(s.htsVol, 5 * dt); s.htsVol -= v; vol += v; na += 513 * v / 1000; cl += 513 * v / 1000; }
    if (s.manVol > 0) { const v = Math.min(s.manVol, 5 * dt); s.manVol -= v; vol += v; }
    /* outputs */
    const uo = (s.G > 180 ? 1 + Math.min(2.2, (s.G - 180) / 150) : 1.0) * w * s.perf + (s.manUntil > s.t ? 2 * w : 0);   // mL/h
    const insens = s.maint * 0.3 * (s.RR > 28 ? 1.2 : 1);                                                                // mL/h
    const out = (uo + insens) * h;
    s.io.inTotal += vol; s.io.out += uo * h; s.io.hourIn += vol; s.io.hourOut += uo * h; s.uo = uo;
    /* sodium and water (corrected sodium, total body water) */
    /* corrected sodium drifts toward a level set by the main fluid (0.9% saline: rises slowly to ~143; 0.45%: falls),
       plus free-water loss while the osmotic diuresis lasts; 3% saline is added at the dose */
    const naIn = m.rate > 0 ? F.na : 140, load = Math.min(1.5, m.rate / s.maint);
    const naTarget = 136 + 5 * load * (naIn - 100) / 54 + (s.G > 250 ? 2 : 0);
    s.NaC += (naTarget - s.NaC) * h / 8;
    s.deficit += out - vol;
    /* glucose (mg/dL per hour); 1 mg/kg/min of dextrose ≈ 30 mg/dL/h */
    const sens = 0.25 + 0.75 * clamp((s.pH - 6.95) / 0.4, 0, 1);
    const fI = Math.pow(clamp(I / 0.1, 0, 1.5), 0.8);
    const prod = 90 * (1 - 0.85 * clamp(I / 0.05, 0, 1));
    const brain = 40 * clamp(s.G / 80, 0, 1);
    const upt = 200 * sens * fI * s.G / (s.G + 300);
    const renal = s.G > 180 ? 0.1 * (s.G - 180) * s.perf : 0;
    const gir = dexMg / w / dt;
    const ecf = s.wt0 * 250 - s.deficit * 0.6;
    s.G += (prod - brain - upt - renal + 30 * gir) * h;
    s.G *= ecf / (ecf + vol);
    s.G *= ecf / Math.max(1000, ecf - insens * h);
    s.G = Math.max(20, s.G);
    /* ketoacids: production stops with even a low insulin effect (Nelson: 0.02–0.05 u/kg/h), clearance needs insulin and perfusion */
    const prodA = 1.2 * (1 - clamp(I / 0.035, 0, 1));
    const clearA = (0.05 + 0.15 * clamp(I / 0.05, 0, 1)) * s.A * Math.sqrt(s.perf);
    s.A = Math.max(0, s.A + (prodA - clearA) * h - (s.bicarbNow || 0));
    s.bicarbNow = 0;
    /* hyperchloremia from chloride-rich fluids, slowly excreted */
    s.clD = Math.max(0, s.clD + 0.2 * (cl - 104 * vol / 1000) / (ecf / 1000) - 0.03 * s.clD * h);
    /* potassium and phosphate losses in urine, replacement in fluids (1:1 KCl/KPhos counts as potassium) */
    s.Kdef = Math.max(-2 * w, s.Kdef + 42 * uo * h / 1000 - kIn - (s.kPO || 0));
    s.kPO = 0;
    s.Pdef = Math.max(0, s.Pdef + 18 * uo * h / 1000);
    /* cerebral edema: risk rises with what the protocol warns about; the process, once started, grows unless treated */
    if (s.t >= s.ceAt && s.ceOn == null) s.ceOn = s.t;
    if (s.ceOn != null) {
      const osmo = s.mannitol.some(d => s.t - d.at < 90) || s.hts.some(d => s.t - d.at < 90);
      const fluidsHigh = (m.rate > 2.2 * s.maint) ? 0.6 : 0;
      if (s.ceDrive == null) s.ceDrive = 1;
      const grow = (0.12 + 0.07 * s.ceRisk + fluidsHigh * 0.1) * (s.headUp ? 0.85 : 1) * s.ceDrive;
      const peak = s.ceRisk < 1.5 ? 0.45 : 1.2;    // careful management: edema stays moderate
      if (osmo) s.ce = Math.max(0, s.ce - 0.9 * h);
      else if (s.ce < peak && s.ceDrive > 0.2) s.ce = Math.min(peak, s.ce + grow * h);
      else if (s.ceDrive <= 0.2) s.ce = Math.max(0, s.ce - 0.2 * h);
      /* herniation: a 10-minute peri-arrest window (apnea, Cushing response) in which osmotherapy and intubation can still save him */
      if (s.ce >= (s.vent ? 1.05 : 0.95)) { if (s.arrestAt == null) s.arrestAt = s.t; else if (s.t - s.arrestAt >= 10) { s.dead = true; s.deadAt = s.t; } }
      else s.arrestAt = null;
    }
    /* deep hypoglycemia that lasts injures the brain; so does a herniation */
    if (s.G < 40) { s.hypoMin = (s.hypoMin || 0) + dt; if (s.hypoMin > 30) s.injury = Math.min(8, (s.injury || 0) + 0.05 * dt); }
    if (s.arrestAt != null) s.injury = Math.max(s.injury || 0, 3);
    derive(s);
    /* hourly record: glucose fall, osmolality fall, corrected sodium trend (risk) */
    if (s.t - s.io.hourMark >= 60) {
      const dG = s.G0h - s.G, dOsm = s.osm0h - s.eOsm, dNa = s.NaC - s.Nac0h;
      if (dG > 100) s.ceRisk += 0.35;
      if (dOsm > 3) s.ceRisk += 0.35;
      if (dNa < -1 && s.t > 120) s.ceRisk += 0.4;
      if (s.t > 90 && s.io.hourIn > 2.2 * s.maint) s.ceRisk += 0.3;   // more than ~2× maintenance outside the first bolus hour
      s.hourly.push({ t: s.t, dG, dOsm, dNa, inMl: s.io.hourIn, outMl: s.io.hourOut });
      s.io.lastHourIn = s.io.hourIn; s.io.lastHourOut = s.io.hourOut; s.io.hourIn = 0; s.io.hourOut = 0; s.io.hourMark = s.t;
      s.G0h = s.G; s.osm0h = s.eOsm; s.Nac0h = s.NaC;
    }
    if (s.t % 5 === 0) s.hist.push({ t: s.t, G: s.G, pH: s.pH, HCO3: s.HCO3, K: s.K, Na: s.Na, NaC: s.NaC, eOsm: s.eOsm, ins: inf.insulin, rate: m.rate, dex: m.dex, kcl: m.kcl, ce: s.ce, GCS: s.GCS, HR: s.HR });
  }

  /* lab panels as a resident would receive them (measured values, rounded like the analyzer) */
  function labs(s, kind) {
    const r1 = v => Math.round(v * 10) / 10, r0 = Math.round, r2 = v => Math.round(v * 100) / 100;
    if (kind === 'poc') return { G: r0(s.G) };
    if (kind === 'bhb') return { BHB: r1(s.BHB) };
    if (kind === 'vbg') return { pH: r2(s.pH), pCO2: r0(s.pCO2), HCO3: r1(s.HCO3), Na: r0(s.Na), K: r1(s.K), Cl: r0(s.Cl), G: r0(s.G), lact: r1(s.lact), AG: r0(s.AG) };
    if (kind === 'chem') return { Na: r0(s.Na), K: r1(s.K), Cl: r0(s.Cl), HCO3: r1(s.HCO3), BUN: r0(s.BUN), Cr: r2(s.Cr), G: r0(s.G), Ca: r1(9.4 - 0.1 * (s.t / 600)), P: r1(Math.max(0.6, s.P)), Mg: r1(2.0), AG: r0(s.AG) };
    return {};
  }

  window.DKA = { create, step, derive, labs, maint, FLUIDS, clamp };
})();
