/* Replays a protocol-faithful DKA course on the model and prints the trajectory (node tests/calibrate.js [variant]). */
global.window = {};
require('../src/model.js');
const D = window.DKA, v = process.argv[2] || 'ideal';
const s = D.create({ temp: 37.0, wt: 32, wt0: 35, age: 10, deficitMl: 3000, glucose: 545, ketoacid: 19.5, naCorr: 137.1, kDeficit: 5, ceAt: 360, ceRiskBase: 0.5 });
const f = x => (Math.round(x * 10) / 10).toFixed(1);
const row = () => console.log(`t=${String(s.t / 60).padStart(5)}h G=${Math.round(s.G)} pH=${s.pH.toFixed(2)} HCO3=${f(s.HCO3)} K=${f(s.K)} Na=${Math.round(s.Na)} NaC=${f(s.NaC)} eOsm=${Math.round(s.eOsm)} AG=${Math.round(s.AG)} def=${f(s.defPct)}% HR=${s.HR} BP=${s.SBP}/${s.DBP} RR=${s.RR} GCS=${s.GCS} uo=${Math.round(s.uo)} P=${f(s.P)} ce=${f(s.ce)} risk=${f(s.ceRisk)}`);
row();
s.inf.boluses.push({ fluid: 'NS', left: 320, mlMin: 320 / 60 });
for (let t = 1; t <= 24 * 60; t++) {
  if (t === 60) { s.inf.main.rate = v === 'fast' ? 220 : 128; s.inf.insulin = v === 'ins01' ? 0.1 : 0.05; }
  if (s.K < 5 && s.inf.main.kcl === 0 && t > 60 && v !== 'nok') s.inf.main.kcl = 40;
  if (s.K < 3.5 && s.inf.main.kcl === 40 && v !== 'nok') s.inf.main.kcl = 60;
  if (s.G < 300 && s.inf.main.dex === 0 && v !== 'nodex') s.inf.main.dex = 5;
  if (s.G < 180 && s.inf.main.dex === 5 && v !== 'nodex') s.inf.main.dex = 10;
  if (s.ceOn != null && t === s.ceOn + 40 && v !== 'noce') { s.mannitol.push({ at: t, gkg: 0.5 }); s.ceDrive = (s.ceDrive || 1) * (s.ceRisk < 1.5 ? 0.15 : 0.5); s.manVol = 2.5 * 32; s.manUntil = t + 120; s.inf.main.rate *= 2 / 3; s.headUp = true; }
  D.step(s, 1);
  if (t % 60 === 0) row();
  if (s.dead) { console.log('DEAD at', t); break; }
  if (s.pH > 7.3 && s.HCO3 > 18 && !s.exitAt) { s.exitAt = t; console.log('--- exit criteria met at', (t / 60).toFixed(1), 'h'); }
}
