/* Visual building blocks shared with the PALS Resus Bay app (same look): icons, sounds, the IntelliVue-style monitor
   with its ECG generator, the patient drawing, the crash-cart art and the drawer items. Ported from that app;
   adapted so the T and U waves follow the potassium. */
window.UI = { sound: true };
const esc = x => String(x ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sv = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICA = {
  resp: sv('<circle cx="9" cy="6" r="3"/><path d="M4 21v-5a5 5 0 0 1 10 0v5"/><path d="M17 8c1.5 1 1.5 3 0 4M19.5 6c3 2 3 6 0 8"/>'),
  shout: sv('<path d="M3 10v4h3l7 4V6L6 10z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/>'),
  ems: sv('<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2"/>'),
  check: sv('<path d="M12 20s-7-4.4-7-9.6A4 4 0 0 1 12 8a4 4 0 0 1 7 2.4C19 15.6 12 20 12 20z"/><path d="M7.5 12h2.5l1-2 2 4 1-2h2.5"/>'),
  cpr: sv('<path d="M8 3h8"/><path d="M12 3v7"/><path d="M8.5 7.5L12 11l3.5-3.5"/><path d="M4 18c2-3 5-4 8-4s6 1 8 4"/><path d="M4 21h16"/>'),
  auscult: sv('<path d="M6 3v5a5 5 0 0 0 10 0V3"/><path d="M11 13v2a4 4 0 0 0 8 0v-2"/><circle cx="19" cy="11" r="2"/>'),
  vagal: sv('<path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9"/><path d="M10 4l2 2 2-2M10 20l2-2 2 2"/>'),
  hts: sv('<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L21 21"/><path d="M8 10h4M10 8v4"/>'),
  pads: sv('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><path d="M6.5 12v4a3 3 0 0 0 3 3h4.5M17.5 12V8a3 3 0 0 0-3-3H10"/>'),
  rhythm: sv('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M4 13h4l1.5-4 2.5 7 2-5 1 2h5"/>'),
  shock: sv('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
  sync: sv('<path d="M2 18h5l2-9 2 9h11"/><path d="M9 3l-1.6 2.5h3.2z" fill="currentColor"/><path d="M15 8l-2 4h3l-2 4"/>'),
  pace: sv('<path d="M3 17h4V5"/><path d="M7 17h3l2-6 2 6h7"/><circle cx="7" cy="4" r="1" fill="currentColor"/>'),
  leads: sv('<path d="M3 13h4l2-5 3 9 2-6 2 2h5"/><circle cx="19" cy="6" r="2.2"/><path d="M19 8.2V11"/>'),
  ecg12: sv('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18" opacity=".45"/><path d="M5 12h3l1.5-3 2 6 1.5-3H19"/>'),
  drugSyr: sv('<path d="M18 2l4 4"/><path d="M20 4l-3.5 3.5"/><path d="M15 5l4 4L9 19H5v-4z"/><path d="M8 12l2 2M11 9l2 2"/><path d="M2 22l3-3"/>'),
  drugPen: sv('<rect x="3.5" y="9" width="17" height="6" rx="3" transform="rotate(-45 12 12)"/><path d="M5 19l-2 2"/><path d="M8 13l3 3"/>'),
  drugVial: sv('<path d="M9 2h6v3H9z"/><path d="M8 5h8v14a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3z"/><path d="M8 11h8"/>'),
  drugSpray: sv('<rect x="8" y="10" width="8" height="12" rx="2"/><path d="M10 10V7h4v3"/><path d="M11 7V3h2v4"/><path d="M15 3l2-1M15 5h3M15 7l2 1"/>'),
  ivio: sv('<path d="M4 20l5-5"/><rect x="9" y="4" width="7" height="10" rx="2" transform="rotate(45 12.5 9)"/><path d="M16 4l4 4"/><path d="M13 13l3 3"/>'),
  fluid: sv('<path d="M7 3h10v11a5 5 0 0 1-10 0z"/><path d="M7 8h10"/><path d="M12 19v3"/><path d="M10 11h4"/>'),
  vaso: sv('<rect x="3" y="4" width="18" height="15" rx="2"/><rect x="6" y="7" width="12" height="5" rx="1"/><path d="M7 15h2M11 15h2M15 15h2"/><path d="M12 19v3"/>'),
  glucose: sv('<rect x="6" y="2" width="12" height="20" rx="3"/><rect x="9" y="5" width="6" height="5" rx="1"/><path d="M12 13c-1.6 2-1.6 3.6 0 3.6s1.6-1.6 0-3.6z"/>'),
  position: sv('<circle cx="10" cy="7" r="4"/><path d="M6 21v-3a6 6 0 0 1 9-5"/><path d="M15 3c3 1 5 4 5 7"/><path d="M20 10l-2-1M20 10l1-2"/>'),
  suction: sv('<path d="M3 21l8-8"/><path d="M11 13c2-2 2-5 0-7l3-3c3 3 3 8 0 11z"/><path d="M17 17h4v4h-4z"/>'),
  o2: sv('<path d="M7 9c0-3 2-5 5-5s5 2 5 5v4c0 3-2 5-5 5s-5-2-5-5z"/><path d="M12 18v4h7"/><path d="M3 10l4 .5M21 10l-4 .5"/>'),
  bvm: sv('<ellipse cx="16" cy="8" rx="6" ry="4.5"/><path d="M10 8H7"/><path d="M2 15l2.5-6h2L9 15c0 3-7 3-7 0z"/><path d="M22 8h1"/>'),
  airway: sv('<rect x="5" y="2" width="5" height="4" rx="1"/><path d="M7.5 6v8a6 6 0 0 0 6 6H19"/><ellipse cx="11" cy="16.5" rx="2" ry="1.2" transform="rotate(-40 11 16.5)"/>'),
  albuterol: sv('<path d="M7 11h10l-1.5 10h-7z"/><path d="M12 11V7"/><path d="M9 7h6"/><path d="M9 4c1 1 2 1 3 0s2-1 3 0"/>'),
  nebepi: sv('<path d="M7 11h10l-1.5 10h-7z"/><path d="M12 11V7"/><path d="M9 7h6"/><path d="M9 4c1 1 2 1 3 0s2-1 3 0"/><path d="M10 15h4"/>'),
  needle: sv('<path d="M14 3l7 7"/><path d="M17.5 6.5L8 16"/><path d="M8 16l-5 5"/><path d="M10.5 9.5l4 4"/>')
};
const Sound = {
  ctx: null,
  ensure() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; } }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  },
  tone(f, d = 0.08, type = 'sine', v = 0.06, when = 0) {
    if (!UI.sound || !this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + when, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + d + 0.03);
  },
  /* Pulse-oximeter tone: a short, soft, almost pure beep on each pleth peak. Pitch falls about half a semitone for every
     1% drop in SpO2 (about 940 Hz at 100%), the way bedside monitors let you hear desaturation without looking. */
  wave() {
    if (!this.pw && this.ctx) { const re = new Float32Array([0, 1, 0.16, 0.05, 0.02]), im = new Float32Array(re.length); this.pw = this.ctx.createPeriodicWave(re, im); }
    return this.pw;
  },
  pulseTone(spo2) {
    if (!UI.sound || !this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx, t = c.currentTime + 0.005, f = 940 * Math.pow(2, (Math.max(50, Math.min(100, spo2)) - 100) / 24);
    const o = c.createOscillator(), g = c.createGain();
    o.setPeriodicWave(this.wave()); o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.055, t + 0.004);
    g.gain.setValueAtTime(0.055, t + 0.045); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.14);
  },
  /* QRS beep when there is no SpO2 signal: fixed pitch, a little shorter. */
  qrs() { this.tone(880, 0.05, 'sine', 0.04); },
  /* IEC 60601-1-8 style high-priority alarm: a burst of 3 + 2 harmonic-rich pulses. */
  alarm() {
    if (!UI.sound || !this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx, w = this.wave(), base = c.currentTime + 0.01;
    [0, 0.2, 0.4, 0.75, 0.95].forEach(dt => {
      const t = base + dt, o = c.createOscillator(), g = c.createGain(), o2 = c.createOscillator(), g2 = c.createGain();
      o.setPeriodicWave(w); o.frequency.value = 523; o2.type = 'square'; o2.frequency.value = 1046; g2.gain.value = 0.18;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + 0.02); g.gain.setValueAtTime(0.035, t + 0.13); g.gain.linearRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g); o2.connect(g2).connect(g); g.connect(c.destination); o.start(t); o2.start(t); o.stop(t + 0.18); o2.stop(t + 0.18);
    });
  },
  /* Medium-priority alarm (low SpO2): three slower, lower pulses. */
  alarmMed() {
    if (!UI.sound || !this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx, w = this.wave(), base = c.currentTime + 0.01;
    [0, 0.3, 0.6].forEach(dt => {
      const t = base + dt, o = c.createOscillator(), g = c.createGain();
      o.setPeriodicWave(w); o.frequency.value = 440;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03, t + 0.03); g.gain.setValueAtTime(0.03, t + 0.18); g.gain.linearRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.25);
    });
  },
  ok() { this.tone(660, 0.08, 'triangle', 0.06); this.tone(990, 0.12, 'triangle', 0.05, 0.07); },
  bad() { this.tone(180, 0.2, 'sawtooth', 0.04); },
  zap() { this.tone(70, 0.35, 'sawtooth', 0.09); this.tone(140, 0.2, 'square', 0.05, 0.02); },
  charge(d = 1.6) {
    if (!UI.sound || !this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(500, t0); o.frequency.exponentialRampToValueAtTime(1500, t0 + d);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.03, t0 + 0.1); g.gain.setValueAtTime(0.03, t0 + d - 0.05); g.gain.linearRampToValueAtTime(0.0001, t0 + d);
    o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + d + 0.05);
  },
  ready() { this.tone(1200, 0.12, 'square', 0.03); this.tone(1200, 0.12, 'square', 0.03, 0.18); },
  click(acc) { this.tone(acc ? 1500 : 1100, 0.03, 'square', 0.04); },
  noiseBuf() {
    if (!this.nb && this.ctx) { const n = this.ctx.sampleRate, b = this.ctx.createBuffer(1, n, n), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.nb = b; }
    return this.nb;
  },
  /* NIBP cuff: the pump motor while it inflates (a low buzz with some air noise) */
  cuffPump(d) {
    if (!UI.sound || !this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx, t0 = c.currentTime + 0.01, g = c.createGain(), o = c.createOscillator(), lp = c.createBiquadFilter(), ns = c.createBufferSource(), ng = c.createGain(), bp = c.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(95, t0); o.frequency.linearRampToValueAtTime(82, t0 + d);
    lp.type = 'lowpass'; lp.frequency.value = 420;
    ns.buffer = this.noiseBuf(); ns.loop = true; bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.8; ng.gain.value = 0.35;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.022, t0 + 0.15); g.gain.setValueAtTime(0.022, t0 + d - 0.2); g.gain.linearRampToValueAtTime(0.0001, t0 + d);
    o.connect(lp).connect(g); ns.connect(bp).connect(ng).connect(g); g.connect(c.destination);
    o.start(t0); ns.start(t0); o.stop(t0 + d + 0.05); ns.stop(t0 + d + 0.05);
  },
  /* a short release of air at each deflation step */
  cuffStep() {
    if (!UI.sound || !this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx, t0 = c.currentTime + 0.005, ns = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain();
    ns.buffer = this.noiseBuf(); hp.type = 'highpass'; hp.frequency.value = 2500;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.018, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
    ns.connect(hp).connect(g).connect(c.destination); ns.start(t0); ns.stop(t0 + 0.14);
  },
  /* measurement done: one soft beep */
  cuffDone() { this.tone(1046, 0.09, 'sine', 0.035); },
  /* Chest sounds through the stethoscope, two breaths. Normal air entry is soft filtered noise; stridor is a harsh
     high-pitched inspiratory note, wheeze a musical expiratory one, crackles are fine clicks on inspiration, grunting a
     short low expiratory note; a nearly silent chest is barely audible. */
  breath(k, P = 2) {
    if (!UI.sound || !this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx, out = c.destination, T0 = c.currentTime + 0.05, ins = P * 0.4, ex = P * 0.5, vol = k.silent ? 0.25 : 1;
    const env = (g, t, d, v) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + d * 0.35); g.gain.linearRampToValueAtTime(v * 0.7, t + d * 0.75); g.gain.linearRampToValueAtTime(0.0001, t + d); };
    const air = (t, d, f, v) => { const ns = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(); ns.buffer = this.noiseBuf(); ns.loop = true; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 0.9; env(g, t, d, v * vol); ns.connect(bp).connect(g).connect(out); ns.start(t); ns.stop(t + d + 0.05); };
    const note = (t, d, f0, f1, type, v, q) => { const o = c.createOscillator(), bp = c.createBiquadFilter(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f1, t + d); bp.type = 'bandpass'; bp.frequency.value = (f0 + f1) / 2; bp.Q.value = q; env(g, t, d, v * vol); o.connect(bp).connect(g).connect(out); o.start(t); o.stop(t + d + 0.05); };
    for (let n = 0; n < 2; n++) {
      const t = T0 + n * P;
      air(t, ins, 420, 0.05); air(t + ins + 0.05, ex, 260, 0.022);
      if (k.stridor) { note(t, ins, 620, 760, 'sawtooth', 0.03, 6); note(t, ins, 930, 1080, 'sawtooth', 0.012, 8); }
      if (k.wheeze) { note(t + ins + 0.05, ex, 520, 430, 'triangle', 0.035, 4); note(t + ins + 0.1, ex * 0.9, 390, 330, 'sine', 0.025, 4); }
      if (k.crackle) for (let i = 0; i < 9; i++) {
        const ct = t + ins * (0.35 + 0.6 * Math.random()), ns = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain();
        ns.buffer = this.noiseBuf(); hp.type = 'highpass'; hp.frequency.value = 1800;
        g.gain.setValueAtTime(0.05 * vol, ct); g.gain.exponentialRampToValueAtTime(0.0001, ct + 0.012);
        ns.connect(hp).connect(g).connect(out); ns.start(ct, Math.random() * 0.5); ns.stop(ct + 0.02);
      }
      if (k.grunt) note(t + ins + 0.05, 0.22, 210, 170, 'sawtooth', 0.04, 2);
    }
  }
};
const gs = (x, s) => Math.exp(-(x * x) / (2 * s * s));
function shape(e, x) {
  switch (e.k) {
    case 'P': return 0.24 * gs(x, e.ps || 0.02);
    /* QT shortens and T narrows as the rate rises, so the next P wave stays visible in sinus tachycardia. */
    case 'N': { const tq = 0.09 + 0.16 * Math.sqrt(e.rr); return (e.u || 0) * gs(x - tq - 0.17, 0.035) + -0.09 * gs(x + 0.022, 0.007) + gs(x, 0.0095) - 0.26 * gs(x - 0.022, 0.008) + (e.ta ?? 0.28) * gs(x - tq, 0.024 + 0.03 * Math.min(e.rr, 1)); }
    case 'W': { const tq = 0.2 + 0.08 * Math.sqrt(e.rr); return 0.9 * gs(x, 0.034) - 0.62 * gs(x - 0.075, 0.03) - 0.3 * gs(x - tq, 0.06); }
    case 'S': return 1.1 * gs(x, 0.004);
  }
  return 0;
}
const cprArt = t => { const ph = t % 0.545; return 0.9 * gs(ph - 0.1, 0.045) - 0.35 * gs(ph - 0.26, 0.07); };
const cprPleth = t => { const ph = t % 0.545; return gs(ph - 0.2, 0.07); };
function respWave(t, st) {
  if (st.cpr) return 0.18 * Math.sin(2 * Math.PI * 1.83 * t) + (st.rp ? 0.35 * Math.max(0, Math.sin(2 * Math.PI * t / st.rp)) : 0);
  if (!st.rp) return (Math.random() - 0.5) * 0.02;
  const P = st.rp, x = t % P, ins = P * 0.4;
  return x < ins ? 0.5 - 0.5 * Math.cos(Math.PI * x / ins) : 0.5 + 0.5 * Math.cos(Math.PI * (x - ins) / (P - ins));
}
function capWave(t, st) {
  const v = Math.min(1.25, (st.co2 || 0) / 50), rip = st.cpr ? 0.05 * v * Math.sin(2 * Math.PI * 1.83 * t) : 0;
  if (st.cpr && !st.tube) {
    const x = t % 9;
    if (x < 0.08) return v * 0.6 * (1 - x / 0.08);
    if (x < 0.55 || (x >= 1.45 && x < 1.9)) return 0.02;
    if (x < 1.45) { const r = x - 0.55; return v * Math.min(1, r / 0.12) * (0.92 + 0.08 * r / 0.9); }
    const r = x - 1.9; return v * Math.min(1, r / 0.12) * Math.max(0.5, 1 - r / 15) + rip;
  }
  const P = st.vent || 3, x = t % P, ins = Math.min(0.9, P * 0.35);
  if (x < 0.08) return v * (1 - x / 0.08);
  if (x < ins) return 0.02;
  const r = x - ins;
  return v * Math.min(1, r / 0.12) * (0.9 + 0.1 * Math.min(1, r / (P - ins))) + rip;
}
class Rhythm {
  constructor(type, hr, t0) { this.type = type; this.hr = Math.max(20, hr || 80); this.ev = []; this.n = t0; this.na = t0; this.k = 0; this.seed = Math.random() * 10; }
  sched(T) {
    const ty = this.type, hr = this.hr;
    if (ty === 'vf' || ty === 'torsades' || ty === 'asystole') return;
    if (ty === 'avb3') {
      while (this.na < T) { this.ev.push({ t: this.na, k: 'P' }); this.na += 0.58; }
      while (this.n < T) { this.ev.push({ t: this.n, k: 'W', rr: 60 / hr, c: 1 }); this.n += 60 / hr; }
      return;
    }
    while (this.n < T) {
      const t = this.n, rr = 60 / hr;
      switch (ty) {
        case 'nsr': case 'stach': case 'sbrady': case 'avb1': case 'pea': {
          const pr = ty === 'avb1' ? 0.3 : (hr > 160 ? 0.08 : hr > 130 ? 0.095 : 0.13);
          this.ev.push({ t: t - pr, k: 'P', ps: hr > 130 ? 0.015 : 0.02 }); this.ev.push({ t, k: 'N', rr, c: 1, ta: this.ta ?? (hr > 130 ? 0.22 : undefined), u: this.u });
          const j = ty === 'stach' ? 0.05 : 0.03;
          this.n += rr * (1 + (Math.random() * 2 - 1) * j); break;
        }
        case 'svt': this.ev.push({ t, k: 'N', rr, c: 1, ta: 0.18 }); this.n += rr; break;
        case 'vt': this.ev.push({ t, k: 'W', rr, c: 1 }); this.n += rr; break;
        case 'paced': this.ev.push({ t: t - 0.04, k: 'S' }); this.ev.push({ t, k: 'W', rr, c: 1 }); this.n += rr; break;
        case 'afib': { const r = rr * (0.6 + Math.random() * 0.8); this.ev.push({ t, k: 'N', rr: r, c: 1, ta: 0.2 }); this.n += r; break; }
        case 'aflutter': this.ev.push({ t, k: 'N', rr, c: 1, ta: 0.1 }); this.n += rr; break;
        case 'mobitz1': {
          const pp = 60 / hr, seq = [0.16, 0.24, 0.32, null], pr = seq[this.k % 4]; this.k++;
          this.ev.push({ t, k: 'P' }); if (pr !== null) this.ev.push({ t: t + pr, k: 'N', rr: pp * 1.3, c: 1 });
          this.n += pp; break;
        }
        case 'mobitz2': {
          const pp = 60 / hr, drop = this.k % 3 === 2; this.k++;
          this.ev.push({ t, k: 'P' }); if (!drop) this.ev.push({ t: t + 0.16, k: 'N', rr: pp, c: 1 });
          this.n += pp; break;
        }
        default: this.ev.push({ t, k: 'N', rr, c: 1 }); this.n += rr;
      }
    }
  }
  prune(t) { if (this.ev.length > 40) this.ev = this.ev.filter(e => e.t > t - 2); }
  ecg(t) {
    this.sched(t + 0.6);
    const ty = this.type; let v = 0;
    if (ty === 'vf') { const a = (0.3 + 0.2 * Math.sin(2 * Math.PI * 0.21 * t + this.seed)) * (this.amp ?? 1); return a * (Math.sin(2 * Math.PI * 5.3 * t) + 0.55 * Math.sin(2 * Math.PI * 7.9 * t + 1.3) + 0.4 * Math.sin(2 * Math.PI * 3.1 * t + 0.4 + this.seed)); }
    if (ty === 'torsades') return 0.85 * Math.sin(2 * Math.PI * 3.7 * t) * (0.2 + 0.8 * Math.abs(Math.sin(2 * Math.PI * 0.32 * t)));
    if (ty === 'asystole') return 0.025 * Math.sin(2 * Math.PI * 0.27 * t + this.seed);
    if (ty === 'afib') v += 0.045 * (Math.sin(2 * Math.PI * 6.3 * t) + Math.sin(2 * Math.PI * 8.9 * t + 1) + 0.7 * Math.sin(2 * Math.PI * 5.1 * t + 2)) / 2;
    if (ty === 'aflutter') { const ph = (t * 5) % 1; v += 0.18 * (ph < 0.8 ? 0.5 - ph / 0.8 : -0.5 + (ph - 0.8) / 0.2); }
    for (const e of this.ev) { const x = t - e.t; if (x < -0.25 || x > 0.7) continue; v += shape(e, x); }
    return v;
  }
  pleth(t) {
    let v = 0;
    for (const e of this.ev) { if (!e.c) continue; const x = t - e.t; if (x < 0 || x > 0.9) continue; v += 0.9 * gs(x - 0.2, 0.07) + 0.32 * gs(x - 0.43, 0.06); }
    return Math.min(v, 1.25);
  }
}
const COL = {};
function readCols() { const cs = getComputedStyle(document.documentElement); ['ecg', 'spo2', 'co2', 'rr'].forEach(k => { COL[k] = cs.getPropertyValue('--' + k).trim() || '#3ef08f'; }); }
class Monitor {
  constructor(cv, o = {}) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.sweep = o.sweep || 5; this.onBeat = o.onBeat || null; this.full = !!o.full;
    this.t0 = performance.now(); this.last = 0; this.cursor = 0;
    this.st = { monitor: true, rhythm: 'nsr', hr: 100, pulse: true, cpr: false };
    this.r = new Rhythm('nsr', 100, 0.2);
    this.resize();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(cv);
    this.loop = this.loop.bind(this); this.raf = requestAnimationFrame(this.loop);
  }
  now() { return (performance.now() - this.t0) / 1000; }
  set(s) {
    const p = this.st; this.st = Object.assign({}, p, s);
    if (this.st.rhythm !== p.rhythm) this.r = new Rhythm(this.st.rhythm, this.st.hr, Math.max(this.now() + 0.12, this.holdT || 0));
    else if (this.st.hr !== p.hr) this.r.hr = Math.max(20, this.st.hr || 80);
    this.r.amp = this.st.vfa; this.r.ta = this.st.ta; this.r.u = this.st.u;
  }
  /* A pause in the heartbeat (adenosine, a shock): no complexes for s seconds, then whatever rhythm there is by then. */
  hold(s) {
    const now = this.now(), t = now + s; this.holdT = Math.max(this.holdT || 0, t);
    this.r.ev = this.r.ev.filter(e => e.t <= now); this.r.n = Math.max(this.r.n, t); this.r.na = Math.max(this.r.na, t);
  }
  /* A shock: the trace saturates, drifts back to the baseline, and only then shows the rhythm. */
  shock() { this.shockT = this.now(); this.hold(1.7); }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(60, Math.round(this.cv.clientWidth)), h = Math.max(60, Math.round(this.cv.clientHeight));
    if (w === this.cw && h === this.ch) return;
    this.cw = w; this.ch = h; this.w = w;
    this.cv.width = w * dpr; this.cv.height = h * dpr; this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.eMin = new Float32Array(w).fill(NaN); this.eMax = new Float32Array(w).fill(NaN);
    this.pMin = new Float32Array(w).fill(NaN); this.pMax = new Float32Array(w).fill(NaN);
    this.cMin = new Float32Array(w).fill(NaN); this.cMax = new Float32Array(w).fill(NaN);
    this.rMin = new Float32Array(w).fill(NaN); this.rMax = new Float32Array(w).fill(NaN);
    this.stamp = new Int32Array(w).fill(-1);
  }
  loop() {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.cv.isConnected) { this.destroy(); return; }
    this.step(); this.draw();
  }
  destroy() { cancelAnimationFrame(this.raf); if (this.ro) this.ro.disconnect(); this.ro = null; }
  step() {
    const t = this.now(); let a = this.last; if (t - a > 0.6) a = t - 0.6; if (a >= t) return;
    const w = this.w, sw = this.sweep, dt = sw / w / 3, st = this.st, r = this.r;
    let col = this.cursor;
    for (let tt = a; tt < t; tt += dt) {
      const k = Math.floor(tt / sw); col = Math.min(w - 1, Math.floor((tt / sw - k) * w));
      let e = 0, p = 0, cc = NaN, rs = 0;
      if (st.monitor) {
        const sx = this.shockT != null ? tt - this.shockT : -1;
        e = r.ecg(tt);
        if (sx >= 0 && sx < 1.7) e = (r.type === 'vf' || r.type === 'torsades' ? 0 : e) + (sx < 0.06 ? 1.25 : sx < 0.12 ? -0.75 : 0.9 * Math.exp(-(sx - 0.12) / 0.35));
        e += (st.cpr ? cprArt(tt) : 0) + (Math.random() - 0.5) * 0.014;
        p = st.pulse ? r.pleth(tt) * (st.perf ?? 1) : (st.cpr ? 0.35 * cprPleth(tt) : 0);
        if (st.co2 != null) cc = capWave(tt, st);
        if (this.full) rs = respWave(tt, st);
      }
      if (this.stamp[col] !== k) { this.stamp[col] = k; this.eMin[col] = this.eMax[col] = e; this.pMin[col] = this.pMax[col] = p; this.cMin[col] = this.cMax[col] = cc; this.rMin[col] = this.rMax[col] = rs; }
      else {
        if (rs < this.rMin[col]) this.rMin[col] = rs; if (rs > this.rMax[col]) this.rMax[col] = rs;
        if (e < this.eMin[col]) this.eMin[col] = e; if (e > this.eMax[col]) this.eMax[col] = e;
        if (p < this.pMin[col]) this.pMin[col] = p; if (p > this.pMax[col]) this.pMax[col] = p;
        if (!(cc >= this.cMin[col])) this.cMin[col] = isNaN(this.cMin[col]) ? cc : Math.min(cc, this.cMin[col]); if (!(cc <= this.cMax[col])) this.cMax[col] = isNaN(this.cMax[col]) ? cc : Math.max(cc, this.cMax[col]);
      }
    }
    /* beeps: on each QRS (pleth tone when SpO2 reads, QRS tone otherwise); during CPR the monitor counts the compressions */
    if (st.monitor && this.onBeat) {
      if (st.cpr && !st.pulse) {
        for (let n = Math.floor(a / 0.545); n <= Math.floor(t / 0.545); n++) { const q = n * 0.545 + 0.1, pl = n * 0.545 + 0.2; if (q > a && q <= t) this.onBeat('qrs'); if (pl > a && pl <= t) this.onBeat('pleth'); }
      } else for (const ev of r.ev) { if (!ev.c) continue; if (ev.t > a && ev.t <= t) this.onBeat('qrs'); if (st.pulse && ev.t + 0.2 > a && ev.t + 0.2 <= t) this.onBeat('pleth'); }
    }
    this.cursor = col; this.last = t; r.prune(t);
  }
  draw() {
    const c = this.ctx, w = this.cw, h = this.ch;
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(110,170,190,0.06)'; c.lineWidth = 1; c.beginPath();
    const g = w / (this.sweep * 5);
    for (let x = 0; x < w; x += g) { c.moveTo(Math.round(x) + 0.5, 0); c.lineTo(Math.round(x) + 0.5, h); }
    for (let y = 0; y < h; y += g) { c.moveTo(0, Math.round(y) + 0.5); c.lineTo(w, Math.round(y) + 0.5); }
    c.stroke();
    const cap = this.st.monitor && this.st.co2 != null;
    /* Bedside layout: one lane per waveform (ECG larger), each lined up with its number beside the canvas. */
    if (this.full) {
      const L = [['e', 1.4, COL.ecg, 'II', 0.62, 0.48], ['p', 1, COL.spo2, this.st.monitor && this.st.pulse && this.st.perf < 0.5 ? 'Pleth · low perfusion' : 'Pleth', 0.88, 0.66], ['r', 1, COL.rr, 'Resp', 0.86, 0.6]].concat(cap ? [['c', 1, COL.co2, 'CO₂', 0.92, 0.75]] : []);
      const tot = L.reduce((a, l) => a + l[1], 0); let y = 0;
      c.font = '600 10px "IBM Plex Mono", monospace';
      L.forEach(([k, wt, col, lab, base, amp], i) => {
        const H = h * wt / tot, top = y; y += H;
        if (i) { c.strokeStyle = 'rgba(110,170,190,0.13)'; c.beginPath(); c.moveTo(0, Math.round(top) + 0.5); c.lineTo(w, Math.round(top) + 0.5); c.stroke(); }
        this.trace(this[k + 'Min'], this[k + 'Max'], v => top + H * base - v * H * amp, col);
        c.globalAlpha = 0.75; c.fillStyle = col; c.fillText(lab, 6, top + 12); c.globalAlpha = 1;
      });
      return;
    }
    /* Three lanes once capnography is connected: ECG, pleth, CO2. */
    const eTop = h * 0.04, eH = h * (cap ? 0.48 : 0.6), pTop = h * (cap ? 0.53 : 0.68), pH = h * (cap ? 0.21 : 0.3), cTop = h * 0.76, cH = h * 0.23;
    this.trace(this.eMin, this.eMax, v => eTop + eH * 0.62 - v * eH * 0.48, COL.ecg);
    this.trace(this.pMin, this.pMax, v => pTop + pH * 0.9 - v * pH * 0.68, COL.spo2);
    if (cap) this.trace(this.cMin, this.cMax, v => cTop + cH * 0.95 - v * cH * 0.8, COL.co2);
    c.font = '600 10px "IBM Plex Mono", monospace'; c.globalAlpha = 0.7;
    c.fillStyle = COL.ecg; c.fillText('II', 6, 12);
    c.fillStyle = COL.spo2; c.fillText('PLETH', 6, pTop + 10);
    if (cap) { c.fillStyle = COL.co2; c.fillText('CO₂', 6, cTop + 10); }
    c.globalAlpha = 1;
  }
  trace(mn, mx, fy, col) {
    const c = this.ctx, w = this.w, gap = Math.max(10, w * 0.02), cur = this.cursor;
    c.strokeStyle = col; c.lineWidth = 1.7; c.lineJoin = 'round'; c.shadowColor = col; c.shadowBlur = 5;
    c.beginPath(); let pen = false, prev = 0;
    for (let x = 0; x < w; x++) {
      const d = (x - cur + w) % w;
      if ((d > 0 && d < gap) || isNaN(mn[x])) { pen = false; continue; }
      let a = fy(mn[x]), b = fy(mx[x]);
      if (Math.abs(prev - a) > Math.abs(prev - b)) { const tmp = a; a = b; b = tmp; }
      if (!pen) { c.moveTo(x, a); pen = true; } else c.lineTo(x, a);
      if (Math.abs(b - a) > 0.5) c.lineTo(x, b);
      prev = b;
    }
    c.stroke(); c.shadowBlur = 0;
  }
}
const SKIN = { pink: ['#f0b49c', '#cf6670', '#c98a74'], pale: ['#eadbd2', '#c79aa0', '#b9a59a'], mottled: ['#d2b2b6', '#9a6f86', '#a5838c'], cyan: ['#b6c3da', '#5f70ad', '#8794b0'], grey: ['#b5b6ba', '#77809a', '#8a8c94'], flushed: ['#f4a593', '#c8505e', '#cf7867'] };
function patientSVG(kind) {
  const P = {
    infant: { hy: 50, hr: 21, tw: 40, ty: 77, th: 44, aw: 9, al: 32, ar: 34, lw: 12, ll: 40, la: 22, hair: '#b8875a', pants: 'diaper' },
    child: { hy: 40, hr: 16.5, tw: 44, ty: 61, th: 58, aw: 10, al: 52, ar: 14, lw: 13, ll: 70, la: 4, hair: '#4a3428', pants: 'shorts' },
    teen: { hy: 33, hr: 14.5, tw: 52, ty: 50, th: 70, aw: 11, al: 62, ar: 10, lw: 15, ll: 80, la: 3, hair: '#2a1d16', pants: 'shorts' }
  }[kind] || null;
  const p = P || { hy: 40, hr: 16.5, tw: 44, ty: 61, th: 58, aw: 10, al: 52, ar: 14, lw: 13, ll: 70, la: 4, hair: '#4a3428', pants: 'shorts' };
  const cx = 70, tx = cx - p.tw / 2, by = p.ty + p.th, hipY = by - 8, KNEE = kind === 'infant' ? 0.56 : 0.48;
  const shL = [tx + 5, p.ty + 7], shR = [tx + p.tw - 5, p.ty + 7];
  const arm = (sx, sy, rot, side) => `<g transform="translate(${sx} ${sy}) rotate(${rot})"><rect x="${-p.aw / 2}" y="0" width="${p.aw}" height="${p.al}" rx="${p.aw / 2}" fill="url(#skG)" stroke="var(--skinE)" stroke-width=".6"/><ellipse cx="0" cy="${p.al + p.aw * 0.35}" rx="${p.aw * 0.62}" ry="${p.aw * 0.75}" fill="var(--skin)" stroke="var(--skinE)" stroke-width=".6"/>${side === 'R' ? `<g class="probe"><rect x="${-p.aw * 0.55}" y="${p.al + p.aw * 0.55}" width="${p.aw * 1.1}" height="${p.aw * 0.9}" rx="2" fill="#2f3a41" stroke="#77858d" stroke-width=".6"/><circle class="led" cx="0" cy="${p.al + p.aw}" r="1.6" fill="#ff3b4e"/><path d="M0 ${p.al + p.aw * 1.45} c 6 10, 20 14, 40 18" stroke="#77858d" stroke-width="1" fill="none"/></g>` : ''}</g>`;
  const leg = (x, rot) => `<g transform="translate(${x} ${hipY}) rotate(${rot})"><rect x="${-p.lw / 2}" y="0" width="${p.lw}" height="${p.ll}" rx="${p.lw / 2}" fill="url(#skG)" stroke="var(--skinE)" stroke-width=".6"/><path d="M${-p.lw * 0.3} ${p.ll * KNEE} q ${p.lw * 0.3} ${p.lw * 0.22} ${p.lw * 0.6} 0" stroke="var(--skinE)" stroke-width=".7" fill="none" opacity=".7"/><ellipse cx="${rot > 0 ? -2 : 2}" cy="${p.ll + 1}" rx="${p.lw * 0.5}" ry="${p.lw * 0.7}" fill="var(--skin)" stroke="var(--skinE)" stroke-width=".6"/></g>`;
  const lx = cx - p.lw * 0.75, rx = cx + p.lw * 0.75;
  /* IO site: proximal tibia, just below the knee, on the medial (inner) side of the patient's right leg.
     Leg-local point (medial offset, distance from hip) rotated with the leg (SVG rotate is clockwise). */
  const th = p.la * Math.PI / 180, ioL = [p.lw * 0.18, p.ll * (KNEE + 0.13)];
  const ioX = lx + ioL[0] * Math.cos(th) - ioL[1] * Math.sin(th), ioY = hipY + ioL[0] * Math.sin(th) + ioL[1] * Math.cos(th);
  const eyeY = p.hy - p.hr * 0.05, eyeDx = p.hr * 0.38, mouthY = p.hy + p.hr * 0.5;
  const nip = [cx - p.tw * 0.24, p.ty + p.th * 0.3, cx + p.tw * 0.24];
  const pads = `<g class="pads"><path d="M${cx - p.tw * 0.27} ${p.ty + 6} C ${cx - 40} ${p.ty - 20}, 20 30, 10 20" stroke="#ff7a45" stroke-width="1.6" fill="none"/><path d="M${cx + p.tw * 0.38} ${p.ty + p.th * 0.6} C 128 ${p.ty + 30}, 132 60, 130 22" stroke="#ff7a45" stroke-width="1.6" fill="none"/><rect x="${cx - p.tw * 0.42}" y="${p.ty + 4}" width="${p.tw * 0.32}" height="${p.th * 0.34}" rx="3" fill="#eef3f5" stroke="#55707d"/><rect x="${cx - p.tw * 0.39}" y="${p.ty + 7}" width="${p.tw * 0.26}" height="4" rx="1" fill="#ff7a45"/><rect x="${cx + p.tw * 0.14}" y="${p.ty + p.th * 0.46}" width="${p.tw * 0.32}" height="${p.th * 0.34}" rx="3" fill="#eef3f5" stroke="#55707d"/><rect x="${cx + p.tw * 0.17}" y="${p.ty + p.th * 0.49}" width="${p.tw * 0.26}" height="4" rx="1" fill="#ff7a45"/></g>`;
  const lead = (x, y, c) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#f3f6f7" stroke="#9aa7ad" stroke-width=".6"/><circle cx="${x}" cy="${y}" r="1.4" fill="${c}"/>`;
  const leads = `<g class="leads"><path d="M${shL[0] + 2} ${p.ty + 3} C 30 ${p.ty - 10}, 22 40, 14 30 M${shR[0] - 2} ${p.ty + 3} C 108 ${p.ty - 10}, 118 40, 126 30 M${cx + p.tw * 0.3} ${by - 12} C ${cx + p.tw * 0.7} ${by - 20}, 126 90, 128 40" stroke="#c7d3d8" stroke-width=".8" fill="none" opacity=".75"/>${lead(shL[0] + 2, p.ty + 3, '#f3f6f7')}${lead(shR[0] - 2, p.ty + 3, '#222')}${lead(cx + p.tw * 0.3, by - 12, '#e0303f')}</g>`;
  const hands = kind === 'infant'
    ? `<g class="hands"><path d="M${tx - 7} ${p.ty + p.th * 0.62} q -3 -10 6 -14 l ${p.tw * 0.45} 4 q 3 3 0 6 z" fill="#d9a07a" stroke="#8a5a3c"/><path d="M${tx + p.tw + 7} ${p.ty + p.th * 0.62} q 3 -10 -6 -14 l ${-p.tw * 0.45} 4 q -3 3 0 6 z" fill="#d9a07a" stroke="#8a5a3c"/><ellipse cx="${cx - 3}" cy="${p.ty + p.th * 0.5}" rx="3.2" ry="5" fill="#e6b08a" stroke="#8a5a3c"/><ellipse cx="${cx + 3}" cy="${p.ty + p.th * 0.5}" rx="3.2" ry="5" fill="#e6b08a" stroke="#8a5a3c"/></g>`
    : `<g class="hands"><path d="M${cx - 16} ${p.ty + p.th * 0.72} q -2 -18 16 -20 q 18 2 16 20 q -16 8 -32 0z" fill="#c98b62" stroke="#8a5a3c"/><path d="M${cx - 13} ${p.ty + p.th * 0.62} q 0 -14 13 -16 q 13 2 13 16 q -13 7 -26 0z" fill="#d9a07a" stroke="#8a5a3c"/><path d="M${cx - 8} ${p.ty + p.th * 0.56} l 0 -6 M${cx - 3} ${p.ty + p.th * 0.55} l 0 -7 M${cx + 2} ${p.ty + p.th * 0.55} l 0 -7 M${cx + 7} ${p.ty + p.th * 0.56} l 0 -6" stroke="#8a5a3c" stroke-width=".8"/></g>`;
  return `<svg viewBox="0 0 140 220" role="img" aria-label="${esc('patient')}">
  <defs>
    <linearGradient id="skG" x1="0" x2="1"><stop offset="0" stop-color="var(--skin)"/><stop offset=".6" stop-color="var(--skin)"/><stop offset="1" stop-color="var(--skinE)" stop-opacity=".9"/></linearGradient>
    <radialGradient id="hdG" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="var(--skin)"/><stop offset=".8" stop-color="var(--skin)"/><stop offset="1" stop-color="var(--skinE)"/></radialGradient>
    <linearGradient id="bdG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2c4a57"/><stop offset="1" stop-color="#21404c"/></linearGradient>
  </defs>
  <rect x="3" y="2" width="134" height="216" rx="14" fill="#0e1f27" stroke="#2d5567"/>
  <rect x="9" y="8" width="122" height="204" rx="11" fill="url(#bdG)"/>
  <path d="M9 120 h122" stroke="#31566a" stroke-width="1" opacity=".6"/>
  <rect x="${cx - 34}" y="${p.hy - p.hr - 9}" width="68" height="${p.hr * 2 + 6}" rx="${p.hr}" fill="#3b6170" opacity=".85"/>
  ${leg(lx, p.la)}${leg(rx, -p.la)}
  ${p.pants === 'diaper'
    ? `<path d="M${cx - p.tw * 0.5} ${hipY - 6} h${p.tw} v6 q -4 16 -${p.tw * 0.5} 18 q -${p.tw * 0.5 - 4} -2 -${p.tw * 0.5} -18 z" fill="#eef3f5" stroke="#b8c6cc"/><rect x="${cx - p.tw * 0.5 + 2}" y="${hipY - 4}" width="7" height="5" rx="1.5" fill="#8ec5ff"/><rect x="${cx + p.tw * 0.5 - 9}" y="${hipY - 4}" width="7" height="5" rx="1.5" fill="#8ec5ff"/>`
    : `<path d="M${cx - p.tw * 0.5} ${hipY - 8} h${p.tw} l 2 ${p.ll * 0.3} h-${p.tw * 0.46} l -2 -6 l -2 6 h-${p.tw * 0.46} z" fill="#3d6b8a" stroke="#2a5068"/>`}
  <g class="io"><path d="M${ioX} ${ioY} C ${ioX - 18} ${ioY + 6}, 8 ${ioY + 30}, 6 214" stroke="#d6eef8" stroke-width="1.1" fill="none" opacity=".8"/><rect x="${ioX - 4}" y="${ioY - 4}" width="8" height="8" rx="2" fill="#ff4fa3" stroke="#fff" stroke-width=".8"/><circle cx="${ioX}" cy="${ioY}" r="1.6" fill="#fff"/></g>
  ${arm(shL[0], shL[1], p.ar, 'L')}${arm(shR[0], shR[1], -p.ar, 'R')}
  <g class="chest">
    <rect class="torso" x="${tx}" y="${p.ty}" width="${p.tw}" height="${p.th}" rx="${p.tw * 0.36}" fill="url(#skG)" stroke="var(--skinE)" stroke-width=".7"/>
    <path d="M${cx - p.tw * 0.28} ${p.ty + p.th * 0.42} q ${p.tw * 0.28} 5 ${p.tw * 0.56} 0 M${cx - p.tw * 0.3} ${p.ty + p.th * 0.52} q ${p.tw * 0.3} 5 ${p.tw * 0.6} 0" stroke="var(--skinE)" stroke-width=".7" fill="none" opacity=".45"/>
    <circle cx="${nip[0]}" cy="${nip[1]}" r="1.4" fill="var(--lips)" opacity=".7"/><circle cx="${nip[2]}" cy="${nip[1]}" r="1.4" fill="var(--lips)" opacity=".7"/>
    <circle cx="${cx}" cy="${p.ty + p.th * 0.74}" r="1.2" fill="var(--skinE)"/>
    <g class="retr" stroke="#6b3f33" fill="none" stroke-linecap="round"><path d="M${cx - p.tw * 0.36} ${p.ty + p.th * 0.66} q ${p.tw * 0.16} -${p.th * 0.1} ${p.tw * 0.33} -${p.th * 0.03} M${cx + p.tw * 0.36} ${p.ty + p.th * 0.66} q -${p.tw * 0.16} -${p.th * 0.1} -${p.tw * 0.33} -${p.th * 0.03}" stroke-width="1.5"/><path d="M${cx - p.tw * 0.3} ${p.ty + p.th * 0.33} q ${p.tw * 0.1} 2.5 ${p.tw * 0.2} 0 M${cx + p.tw * 0.3} ${p.ty + p.th * 0.33} q -${p.tw * 0.1} 2.5 -${p.tw * 0.2} 0" stroke-width="1"/><path d="M${cx - 3.5} ${p.ty + 2.5} q 3.5 4 7 0" stroke-width="1.4"/></g>
    <g class="mottle" fill="#7d5a78" opacity=".35"><circle cx="${cx - 9}" cy="${p.ty + 14}" r="4"/><circle cx="${cx + 9}" cy="${p.ty + 26}" r="5"/><circle cx="${cx - 4}" cy="${p.ty + p.th * 0.62}" r="4.5"/><circle cx="${cx + 12}" cy="${p.ty + p.th * 0.78}" r="3.5"/><circle cx="${cx - 14}" cy="${p.ty + p.th * 0.45}" r="3"/></g>
    <g class="hives" fill="#e35d6a" opacity=".55"><circle cx="${cx - 10}" cy="${p.ty + 12}" r="3"/><circle cx="${cx + 11}" cy="${p.ty + 18}" r="3.5"/><circle cx="${cx}" cy="${p.ty + p.th * 0.55}" r="2.6"/><circle cx="${cx + 12}" cy="${p.ty + p.th * 0.7}" r="3"/><circle cx="${cx - 13}" cy="${p.ty + p.th * 0.75}" r="2.2"/></g>
    ${leads}${pads}
  </g>
  <rect x="${cx - p.hr * 0.36}" y="${p.hy + p.hr * 0.7}" width="${p.hr * 0.72}" height="${p.ty - p.hy - p.hr * 0.7 + 4}" fill="var(--skin)" stroke="var(--skinE)" stroke-width=".5"/>
  <ellipse cx="${cx - p.hr * 0.98}" cy="${p.hy + 1}" rx="${p.hr * 0.18}" ry="${p.hr * 0.3}" fill="var(--skin)" stroke="var(--skinE)" stroke-width=".6"/>
  <ellipse cx="${cx + p.hr * 0.98}" cy="${p.hy + 1}" rx="${p.hr * 0.18}" ry="${p.hr * 0.3}" fill="var(--skin)" stroke="var(--skinE)" stroke-width=".6"/>
  <circle cx="${cx}" cy="${p.hy}" r="${p.hr}" fill="url(#hdG)" stroke="var(--skinE)" stroke-width=".7"/>
  ${kind === 'infant'
    ? `<path d="M${cx - p.hr * 0.6} ${p.hy - p.hr * 0.72} q ${p.hr * 0.3} -${p.hr * 0.3} ${p.hr * 0.6} -${p.hr * 0.1} q ${p.hr * 0.3} -${p.hr * 0.25} ${p.hr * 0.55} ${p.hr * 0.05}" stroke="${p.hair}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
    : `<path d="M${cx - p.hr * 1.02} ${p.hy - p.hr * 0.05} C ${cx - p.hr * 1.05} ${p.hy - p.hr * 1.15}, ${cx + p.hr * 1.05} ${p.hy - p.hr * 1.15}, ${cx + p.hr * 1.02} ${p.hy - p.hr * 0.05} C ${cx + p.hr * 0.75} ${p.hy - p.hr * 0.62}, ${cx + p.hr * 0.1} ${p.hy - p.hr * 0.5}, ${cx - p.hr * 0.25} ${p.hy - p.hr * 0.72} C ${cx - p.hr * 0.5} ${p.hy - p.hr * 0.45}, ${cx - p.hr * 0.85} ${p.hy - p.hr * 0.45}, ${cx - p.hr * 1.02} ${p.hy - p.hr * 0.05}Z" fill="${p.hair}"/>`}
  <path d="M${cx - eyeDx - 3.2} ${eyeY - 4.2} q 3.2 -1.6 6.4 0 M${cx + eyeDx - 3.2} ${eyeY - 4.2} q 3.2 -1.6 6.4 0" stroke="${p.hair}" stroke-width="1" fill="none" opacity=".8"/>
  <path class="eyeC" d="M${cx - eyeDx - 3} ${eyeY} q 3 2.4 6 0 M${cx + eyeDx - 3} ${eyeY} q 3 2.4 6 0" stroke="#3a2a22" stroke-width="1.3" fill="none" stroke-linecap="round"/>
  <g class="eyeO">${[-1, 1].map(s => `<g class="eye"><ellipse cx="${cx + s * eyeDx}" cy="${eyeY}" rx="3.3" ry="2.5" fill="#fbfbf6" stroke="#3a2a22" stroke-width=".6"/><circle cx="${cx + s * eyeDx}" cy="${eyeY + 0.2}" r="1.7" fill="#3b2a20"/><circle cx="${cx + s * eyeDx + 0.6}" cy="${eyeY - 0.5}" r=".5" fill="#fff"/></g>`).join('')}</g>
  <path d="M${cx - 1.2} ${p.hy + p.hr * 0.12} q 1.2 2.4 2.4 0" stroke="var(--skinE)" stroke-width="1" fill="none"/>
  <ellipse cx="${cx - p.hr * 0.55}" cy="${p.hy + p.hr * 0.3}" rx="${p.hr * 0.18}" ry="${p.hr * 0.11}" fill="var(--lips)" opacity=".25"/><ellipse cx="${cx + p.hr * 0.55}" cy="${p.hy + p.hr * 0.3}" rx="${p.hr * 0.18}" ry="${p.hr * 0.11}" fill="var(--lips)" opacity=".25"/>
  <ellipse cx="${cx}" cy="${mouthY}" rx="${p.hr * 0.2}" ry="${p.hr * 0.1}" fill="var(--lips)"/>
  <g class="tube"><path d="M${cx - p.hr * 0.75} ${mouthY - 1} h${p.hr * 1.5}" stroke="#f3e6c4" stroke-width="3.2" stroke-linecap="round" opacity=".95"/><path d="M${cx} ${mouthY} Q ${cx + p.hr * 0.9} ${mouthY + 3}, ${cx + p.hr + 10} ${p.hy - p.hr * 0.5}" stroke="#e8f6ff" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M${cx} ${mouthY} Q ${cx + p.hr * 0.9} ${mouthY + 3}, ${cx + p.hr + 10} ${p.hy - p.hr * 0.5}" stroke="#9fd8ff" stroke-width="1" fill="none" opacity=".7"/><rect x="${cx + p.hr + 6}" y="${p.hy - p.hr * 0.5 - 9}" width="8" height="6" rx="1.5" fill="#f3f6f7" stroke="#9aa7ad"/><rect x="${cx + p.hr + 6.5}" y="${p.hy - p.hr * 0.5 - 15}" width="7" height="5" rx="1" fill="#a974ff"/><path d="M${cx + p.hr + 10} ${p.hy - p.hr * 0.5 - 15} C ${cx + p.hr + 14} ${p.hy - p.hr - 18}, 128 20, 130 10" stroke="#a974ff" stroke-width=".9" fill="none" opacity=".8"/></g>
  <g class="o2line"><path d="M${cx - p.hr * 0.6} ${mouthY - 2} C ${cx - p.hr * 1.4} ${mouthY + 6}, 26 ${p.hy - 6}, 12 ${p.hy - 22}" stroke="#a6f0c6" stroke-width="1.6" fill="none" opacity=".85"/><path d="M${cx - p.hr * 0.9} ${p.hy - p.hr * 0.1} C ${cx - p.hr * 1.1} ${p.hy - p.hr * 1.2}, ${cx + p.hr * 1.1} ${p.hy - p.hr * 1.2}, ${cx + p.hr * 0.9} ${p.hy - p.hr * 0.1}" stroke="#d6eef8" stroke-width=".9" fill="none" opacity=".7"/></g>
  <path class="mask" d="M${cx - p.hr * 0.55} ${p.hy + p.hr * 0.05} q ${p.hr * 0.55} -${p.hr * 0.45} ${p.hr * 1.1} 0 q ${p.hr * 0.12} ${p.hr * 0.55} -${p.hr * 0.12} ${p.hr * 0.85} q -${p.hr * 0.43} ${p.hr * 0.3} -${p.hr * 0.86} 0 q -${p.hr * 0.24} -${p.hr * 0.3} -${p.hr * 0.12} -${p.hr * 0.85}z" fill="rgba(200,240,255,.3)" stroke="#bfefff" stroke-width="1.2"/>
  <g class="bag"><path d="M${cx + p.hr * 0.35} ${p.hy + p.hr * 0.2} L ${cx + p.hr + 4} ${p.hy - p.hr * 0.25}" stroke="#dfe6ea" stroke-width="4" stroke-linecap="round"/><g transform="translate(${cx + p.hr + 13} ${p.hy - p.hr * 0.6}) rotate(-50)"><g class="bagbody"><ellipse cx="0" cy="0" rx="12" ry="8" fill="rgba(80,160,255,.62)" stroke="#9cc7ff"/><path d="M-6 -7 q 3 7 0 14 M0 -8 q 3 8 0 16 M6 -7 q 3 7 0 14" stroke="#cfe5ff" stroke-width=".7" fill="none"/></g><rect x="12" y="-2.5" width="6" height="5" rx="1.5" fill="#dfe6ea"/><ellipse cx="27" cy="0" rx="9" ry="5" fill="rgba(166,240,198,.35)" stroke="#a6f0c6" stroke-width=".8"/></g></g>
  ${hands}
</svg>`;
}
function itemSVG(it) {
  const cap = it.cap || '#9aa7ad', lab = '<rect x="13" y="38" width="34" height="26" rx="2" fill="#f3f6f7"/><rect x="13" y="38" width="34" height="6" fill="' + cap + '"/>';
  switch (it.kind) {
    case 'vial': return `<svg viewBox="0 0 60 80"><rect x="18" y="6" width="24" height="9" rx="2" fill="${cap}"/><rect x="21" y="14" width="18" height="6" fill="#aab6bc"/><path d="M14 22h32v46a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="rgba(210,235,245,.35)" stroke="#d6eef8"/>${lab}<path d="M16 66h28" stroke="#d6eef8" opacity=".5"/></svg>`;
    case 'amp': return `<svg viewBox="0 0 60 80"><path d="M26 4h8v10l4 6v6h-16v-6l4-6z" fill="rgba(210,235,245,.35)" stroke="#d6eef8"/><path d="M24 20h12" stroke="${cap}" stroke-width="3"/><path d="M18 26h24v44a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6z" fill="rgba(210,235,245,.35)" stroke="#d6eef8"/><rect x="18" y="40" width="24" height="22" rx="1.5" fill="#f3f6f7"/><rect x="18" y="40" width="24" height="5" fill="${cap}"/></svg>`;
    case 'syr': return `<svg viewBox="0 0 60 80"><rect x="27" y="2" width="6" height="10" rx="1" fill="#c7d3d8"/><rect x="20" y="10" width="20" height="4" rx="1" fill="#c7d3d8"/><rect x="22" y="14" width="16" height="54" rx="3" fill="rgba(210,235,245,.3)" stroke="#d6eef8"/><rect x="22" y="22" width="16" height="30" fill="#f3f6f7"/><rect x="22" y="22" width="16" height="5" fill="${cap}"/><path d="M28 68h4v6h-4z" fill="#c7d3d8"/><rect x="25" y="73" width="10" height="5" rx="1" fill="${cap}"/></svg>`;
    case 'bag': return `<svg viewBox="0 0 60 80"><rect x="25" y="2" width="10" height="6" rx="2" fill="#c7d3d8"/><path d="M10 8h40v52a10 10 0 0 1-10 10H20a10 10 0 0 1-10-10z" fill="rgba(210,235,245,.28)" stroke="#d6eef8"/><rect x="14" y="16" width="32" height="26" rx="2" fill="#f3f6f7"/><rect x="14" y="16" width="32" height="6" fill="${cap}"/><path d="M24 70v8M36 70v8" stroke="#c7d3d8" stroke-width="3"/></svg>`;
    case 'io': return `<svg viewBox="0 0 60 80"><path d="M14 24h26a8 8 0 0 1 8 8v8a8 8 0 0 1-8 8H30v22H18V48h-4z" fill="#d23a4a" stroke="#ff8f99"/><rect x="18" y="58" width="12" height="4" fill="#8a1f2b"/><path d="M48 36h8" stroke="#c7d3d8" stroke-width="3"/><path d="M56 36h3" stroke="#e9eef0" stroke-width="1.4"/><circle cx="58" cy="36" r="2" fill="#3d8bff"/></svg>`;
    case 'cann': return `<svg viewBox="0 0 60 80"><path d="M30 6v20" stroke="#c7d3d8" stroke-width="1.6"/><path d="M22 26h16l-2 10H24z" fill="#ffd23f"/><path d="M24 36h12v14H24z" fill="rgba(210,235,245,.4)" stroke="#d6eef8"/><path d="M27 50h6v18l-3 6-3-6z" fill="#3d8bff"/></svg>`;
    case 'pump': return `<svg viewBox="0 0 60 80"><rect x="8" y="12" width="44" height="56" rx="5" fill="#dfe6ea" stroke="#7d8f98"/><rect x="13" y="18" width="34" height="16" rx="2" fill="#062a1c"/><path d="M16 27h6l2-4 3 8 2-4h12" stroke="#3ef08f" stroke-width="1.2" fill="none"/><circle cx="18" cy="46" r="3.5" fill="#3d8bff"/><circle cx="30" cy="46" r="3.5" fill="#3ef08f"/><circle cx="42" cy="46" r="3.5" fill="#ff5d73"/><rect x="14" y="56" width="32" height="6" rx="2" fill="#9aa7ad"/></svg>`;
    case 'gluco': return `<svg viewBox="0 0 60 80"><rect x="14" y="10" width="32" height="56" rx="8" fill="#3f4b52" stroke="#5f6f7a"/><rect x="19" y="16" width="22" height="18" rx="2" fill="#cfe9d8"/><text x="30" y="29" font-family="monospace" font-size="9" text-anchor="middle" fill="#123">mg/dL</text><circle cx="30" cy="46" r="5" fill="#5f6f7a"/><rect x="26" y="64" width="8" height="12" fill="#e9eef0"/><path d="M30 70c-2 3-2 5 0 5s2-2 0-5z" fill="#e0303f"/></svg>`;
    case 'nrb': return `<svg viewBox="0 0 60 80"><path d="M16 22c0-10 6-16 14-16s14 6 14 16v12c0 10-6 16-14 16s-14-6-14-16z" fill="rgba(200,240,255,.3)" stroke="#bfefff" stroke-width="1.4"/><ellipse cx="30" cy="66" rx="12" ry="9" fill="rgba(166,240,198,.35)" stroke="#a6f0c6"/><path d="M30 50v8" stroke="#a6f0c6" stroke-width="2"/><path d="M44 28c8 2 10 12 4 20" stroke="#a6f0c6" stroke-width="1.6" fill="none"/></svg>`;
    case 'yank': return `<svg viewBox="0 0 60 80"><path d="M30 6c-10 0-12 14-6 30l6 40" stroke="#e8f6ff" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M30 6c-10 0-12 14-6 30l6 40" stroke="#9fd8ff" stroke-width="1.5" fill="none" opacity=".6"/><rect x="38" y="44" width="16" height="30" rx="3" fill="rgba(210,235,245,.3)" stroke="#d6eef8"/><rect x="38" y="60" width="16" height="14" fill="rgba(255,120,120,.35)"/></svg>`;
    case 'ett': return `<svg viewBox="0 0 60 80"><path d="M10 10h10v8l14 40" stroke="#9aa7ad" stroke-width="5" fill="none" stroke-linejoin="round"/><circle cx="34" cy="60" r="2" fill="#ffd84a"/><path d="M44 6v52a10 10 0 0 0 10 10" stroke="#e8f6ff" stroke-width="4" fill="none"/><ellipse cx="46" cy="62" rx="4" ry="2.5" fill="rgba(140,200,255,.6)"/><rect x="41" y="2" width="6" height="6" rx="1" fill="#f3f6f7"/></svg>`;
    case 'neb': return `<svg viewBox="0 0 60 80"><path d="M18 40h24l-4 26H22z" fill="rgba(210,235,245,.3)" stroke="#d6eef8"/><path d="M20 54h20" stroke="${cap}" stroke-width="5" opacity=".8"/><path d="M30 40V28M24 28h12" stroke="#d6eef8" stroke-width="2"/><path d="M22 20c3 3 5 3 8 0s5-3 8 0M24 12c2 2 4 2 6 0s4-2 6 0" stroke="#cfe5ff" stroke-width="1.4" fill="none"/><path d="M30 66v10" stroke="#a6f0c6" stroke-width="2"/></svg>`;
    case 'cath': return `<svg viewBox="0 0 60 80"><path d="M30 4v34" stroke="#c7d3d8" stroke-width="1.6"/><path d="M26 38h8v8h-8z" fill="#ff8a2a"/><path d="M24 46h12l-1 14H25z" fill="rgba(210,235,245,.4)" stroke="#d6eef8"/><path d="M27 60h6v16h-6z" fill="#ff8a2a"/></svg>`;
    case 'tubes': return `<svg viewBox="0 0 60 80">${[['#7d8f98', 10], ['#a85cff', 24], ['#e0303f', 38]].map(([c, x]) => `<rect x="${x}" y="8" width="12" height="9" rx="2" fill="${c}"/><path d="M${x + 1} 17h10v46a5 5 0 0 1-10 0z" fill="rgba(210,235,245,.3)" stroke="#d6eef8"/><path d="M${x + 1} 40h10v23a5 5 0 0 1-10 0z" fill="#9e1f2c"/><rect x="${x + 1}" y="24" width="10" height="12" fill="#f3f6f7"/>`).join('')}</svg>`;
  }
  return '';
}
const CART_ART = { pole: '<svg viewBox="0 0 34 200" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><path d="M17 8v184M9 8h16M9 8c-2 0-3 2-3 4M25 8c2 0 3 2 3 4" stroke="#9aa7ad" stroke-width="2.4" fill="none"/><path d="M7 14h12v26a6 6 0 0 1-12 0z" fill="rgba(200,235,255,.28)" stroke="#d6eef8" stroke-width="1.2"/><path d="M7 30h12v10a6 6 0 0 1-12 0z" fill="rgba(140,210,255,.35)"/><rect x="11" y="47" width="4" height="7" rx="1" fill="#d6eef8"/><path d="M13 54c0 10 6 12 6 22s-8 14-8 30" stroke="#d6eef8" stroke-width="1" fill="none" opacity=".7"/><rect x="5" y="80" width="24" height="30" rx="3" fill="#dfe6ea" stroke="#7d8f98"/><rect x="8" y="84" width="18" height="9" rx="1.5" fill="#062a1c"/><path d="M10 89h3l1-2 2 4 1-2h5" stroke="#3ef08f" stroke-width=".9" fill="none"/><circle cx="11" cy="101" r="2" fill="#3d8bff"/><circle cx="17" cy="101" r="2" fill="#3ef08f"/><circle cx="23" cy="101" r="2" fill="#ff5d73"/><path d="M5 196l12-6 12 6" stroke="#9aa7ad" stroke-width="2.4" fill="none"/></svg>', mon: '<svg viewBox="0 0 240 92" aria-hidden="true"><path d="M70 10V4h100v6" stroke="#55626b" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="4" y="10" width="232" height="80" rx="12" fill="#2b343b" stroke="#47555f"/><rect x="14" y="19" width="120" height="62" rx="5" fill="#02080b" stroke="#1d2a31"/><path d="M18 46h16l4-12 6 24 5-14 3 6h22l4-12 6 24 5-14 3 6h22" stroke="#3ef08f" stroke-width="1.6" fill="none"/><path d="M18 70c6 0 7-8 12-8s6 8 12 8 7-8 12-8 6 8 12 8 7-8 12-8 6 8 12 8 7-8 12-8 6 8 12 8" stroke="#40d4f6" stroke-width="1.2" fill="none"/><text x="120" y="31" fill="#3ef08f" font-family="monospace" font-size="11" text-anchor="end" font-weight="700">HR</text><circle cx="160" cy="50" r="15" fill="#3a464f" stroke="#5f6f7a"/><path d="M160 50l7-8" stroke="#e9eef0" stroke-width="3" stroke-linecap="round"/><circle cx="160" cy="50" r="3" fill="#e9eef0"/><rect x="186" y="15" width="38" height="12" rx="3.5" fill="#ffd84a"/><text x="205" y="23.8" fill="#2b343b" font-family="monospace" font-size="8.6" text-anchor="middle" font-weight="700">ANALYZE</text><rect x="186" y="30" width="38" height="12" rx="3.5" fill="#e9eef0"/><text x="205" y="38.8" fill="#2b343b" font-family="monospace" font-size="9.2" text-anchor="middle" font-weight="700">SYNC</text><rect x="186" y="45" width="38" height="12" rx="3.5" fill="#9fd8ff"/><text x="205" y="53.8" fill="#12303d" font-family="monospace" font-size="8.2" text-anchor="middle" font-weight="700" direction="ltr" unicode-bidi="isolate">12-LEAD</text><circle cx="205" cy="72" r="10" fill="#e0303f" stroke="#ff8f99" stroke-width="1.5"/><path d="M207 64.5l-5.5 8.5h4.5l-2 6.5 5.5-8.5h-4.5z" fill="#fff"/><rect x="146" y="72" width="28" height="9" rx="2" fill="#5f6f7a"/><text x="160" y="79" fill="#e9eef0" font-family="monospace" font-size="7.2" text-anchor="middle" font-weight="700">PACER</text><rect x="146" y="20" width="28" height="10" rx="2.5" fill="#ff7a45" stroke="#ffb08a" stroke-width=".8"/><text x="160" y="27.6" fill="#2b1206" font-family="monospace" font-size="7.6" text-anchor="middle" font-weight="700">PADS</text><path d="M146 25 C 136 25, 140 6, 120 6" stroke="#ff7a45" stroke-width="1.6" fill="none" opacity=".8"/></svg>', side: '<svg viewBox="0 0 44 200" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><path d="M22 10c-8 0-14 5-14 12v6h28v-6c0-7-6-12-14-12z" fill="#f3f6f7" stroke="#9aa7ad"/><rect x="18" y="2" width="8" height="9" rx="2" fill="#7d8f98"/><path d="M26 6h8" stroke="#7d8f98" stroke-width="3"/><rect x="8" y="27" width="28" height="94" rx="6" fill="#3f4b52" stroke="#5f6f7a"/><text x="22" y="80" fill="#f3f6f7" font-family="monospace" font-size="8" text-anchor="middle" font-weight="700" transform="rotate(-90 22 76)">O₂</text><ellipse cx="22" cy="140" rx="11" ry="16" fill="rgba(80,160,255,.55)" stroke="#9cc7ff"/><path d="M14 132c5 3 11 3 16 0M14 140c5 3 11 3 16 0M14 148c5 3 11 3 16 0" stroke="#cfe5ff" stroke-width=".8" fill="none" opacity=".8"/><rect x="18" y="155" width="8" height="8" rx="2" fill="#dfe6ea"/><path d="M12 168h20l-4 12c-2 4-10 4-12 0z" fill="rgba(200,235,255,.35)" stroke="#d6eef8"/><path d="M22 124v-8c0-6 8-6 8-12" stroke="#a6f0c6" stroke-width="1.4" fill="none"/></svg>' };
readCols();
Object.assign(window.UI, { sv, ICA, Sound, Monitor, Rhythm, SKIN, patientSVG, itemSVG, CART_ART });
