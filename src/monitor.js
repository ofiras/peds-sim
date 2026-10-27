/* Bedside monitor: ECG lead II (T and U waves follow the potassium), pleth, and respiration (deep Kussmaul breaths,
   irregular when the brainstem is compressed). Drawn in real time; the numbers come from the model. */
(() => {
  const gs = (x, s) => Math.exp(-(x * x) / (2 * s * s));
  class Monitor {
    constructor(cv) {
      this.cv = cv; this.ctx = cv.getContext('2d'); this.t0 = performance.now(); this.last = 0; this.next = 0.3; this.beats = []; this.sweep = 5;
      this.st = { hr: 100, k: 4, spo2: 98, rr: 20, deep: false, irreg: false, perf: 1, on: true };
      this.resize(); this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(cv);
      this.loop = this.loop.bind(this); this.raf = requestAnimationFrame(this.loop);
    }
    set(o) { Object.assign(this.st, o); }
    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.max(80, this.cv.clientWidth | 0), h = Math.max(80, this.cv.clientHeight | 0);
      if (w === this.w && h === this.h) return;
      this.w = w; this.h = h; this.cv.width = w * dpr; this.cv.height = h * dpr; this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.buf = { e: new Float32Array(w).fill(NaN), p: new Float32Array(w).fill(NaN), r: new Float32Array(w).fill(NaN) }; this.stamp = new Int32Array(w).fill(-1);
    }
    now() { return (performance.now() - this.t0) / 1000; }
    sched(T) {
      const st = this.st;
      while (this.next < T) {
        const rr = 60 / Math.max(25, st.hr), pvc = st.k < 2.6 && Math.random() < 0.08;
        this.beats.push({ t: this.next, k: st.k, pvc });
        if (this.onBeat) this.onBeat(this.next);
        this.next += rr * (1 + (Math.random() - 0.5) * 0.04);
      }
      if (this.beats.length > 30) this.beats = this.beats.filter(b => b.t > T - 3);
    }
    ecg(t) {
      let v = 0;
      for (const b of this.beats) {
        const x = t - b.t; if (x < -0.3 || x > 0.8) continue;
        if (b.pvc) { v += 0.9 * gs(x, 0.04) - 0.6 * gs(x - 0.09, 0.05) - 0.35 * gs(x - 0.3, 0.07); continue; }
        const k = b.k, tAmp = k > 6.5 ? 0.75 : k > 5.5 ? 0.45 : k < 3 ? 0.07 : k < 3.5 ? 0.16 : 0.27, tW = k > 5.5 ? 0.028 : 0.045, uAmp = k < 3 ? 0.13 : k < 3.5 ? 0.06 : 0;
        v += 0.18 * gs(x + 0.15, 0.02) - 0.08 * gs(x + 0.02, 0.008) + gs(x, 0.01) - 0.22 * gs(x - 0.025, 0.009) + tAmp * gs(x - 0.27, tW) + uAmp * gs(x - 0.45, 0.04);
      }
      return v + (Math.random() - 0.5) * 0.015;
    }
    pleth(t) {
      let v = 0;
      for (const b of this.beats) { const x = t - b.t; if (x < 0 || x > 0.9) continue; v += 0.9 * gs(x - 0.22, 0.07) + 0.3 * gs(x - 0.45, 0.06); }
      return Math.min(1.2, v) * (0.35 + 0.65 * this.st.perf);
    }
    resp(t) {
      const st = this.st; if (!st.rr) return 0;
      const P = 60 / st.rr; let x = (t % P) / P;
      if (st.irreg) { const k = Math.floor(t / P); if (k % 3 === 2) return 0.05; }
      const a = st.deep ? 1 : 0.45;
      return a * (x < 0.42 ? 0.5 - 0.5 * Math.cos(Math.PI * x / 0.42) : 0.5 + 0.5 * Math.cos(Math.PI * (x - 0.42) / 0.58));
    }
    loop() {
      this.raf = requestAnimationFrame(this.loop);
      if (!this.cv.isConnected) { cancelAnimationFrame(this.raf); this.ro.disconnect(); return; }
      const t = this.now(); let a = this.last; if (t - a > 0.5) a = t - 0.5; this.sched(t + 0.5);
      const w = this.w, sw = this.sweep, dt = sw / w / 2;
      for (let tt = a; tt < t; tt += dt) {
        const k = Math.floor(tt / sw), col = Math.min(w - 1, Math.floor((tt / sw - k) * w)), on = this.st.on;
        const e = on ? this.ecg(tt) : 0, p = on ? this.pleth(tt) : 0, r = on ? this.resp(tt) : 0;
        if (this.stamp[col] !== k) { this.stamp[col] = k; this.buf.e[col] = e; this.buf.p[col] = p; this.buf.r[col] = r; }
        else { this.buf.e[col] = Math.abs(e) > Math.abs(this.buf.e[col]) ? e : this.buf.e[col]; this.buf.p[col] = Math.max(p, this.buf.p[col]); this.buf.r[col] = r; }
        this.cur = col;
      }
      this.last = t; this.draw();
    }
    draw() {
      const c = this.ctx, w = this.w, h = this.h; c.clearRect(0, 0, w, h);
      const lanes = [['e', '#3ef08f', 0.45, 0.58, 0.5], ['p', '#4fc3ff', 0.27, 0.92, 0.62], ['r', '#ffd84a', 0.28, 0.92, 0.6]];
      let top = 0;
      lanes.forEach(([k, col, frac, base, amp], i) => {
        const H = h * frac, arr = this.buf[k];
        c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath(); let pen = false;
        for (let x = 0; x < w; x++) {
          const d = (x - this.cur + w) % w; if ((d > 0 && d < 12) || isNaN(arr[x])) { pen = false; continue; }
          const y = top + H * base - arr[x] * H * amp; if (!pen) { c.moveTo(x, y); pen = true; } else c.lineTo(x, y);
        }
        c.stroke(); c.fillStyle = col; c.globalAlpha = 0.75; c.font = '600 10px ui-monospace, monospace'; c.fillText(['II', 'Pleth', 'Resp'][i], 6, top + 12); c.globalAlpha = 1;
        top += H;
      });
    }
  }
  /* beeps, quieter as the oxygen saturation falls (pitch) */
  const Snd = {
    ctx: null, on: true,
    ensure() { if (!this.ctx) try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* none */ } if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    beep(spo2) {
      if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
      const c = this.ctx, t = c.currentTime + 0.01, o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 940 * Math.pow(2, (Math.max(50, Math.min(100, spo2)) - 100) / 24);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.04, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.14);
    },
    alert() {
      if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
      const c = this.ctx; [0, 0.25, 0.5].forEach(d => { const t = c.currentTime + d, o = c.createOscillator(), g = c.createGain(); o.frequency.value = 523; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.04, t + 0.02); g.gain.linearRampToValueAtTime(0.0001, t + 0.18); o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.2); });
    }
  };
  document.addEventListener('pointerdown', () => Snd.ensure(), { passive: true });
  window.Monitor = Monitor; window.Snd = Snd;
})();
