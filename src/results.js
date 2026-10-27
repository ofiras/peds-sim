/* Result viewers that look like the real thing: a 12-lead ECG printout on pink grid paper (same paper as the PALS app),
   the blood-gas analyzer slip, a glucometer / ketone-meter screen, and hospital-system style lab and imaging reports
   (result, units, reference range, H/L flags). */
(() => {
  const esc = x => String(x ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fx = (v, d) => v == null || isNaN(v) ? '' : (+v).toFixed(d);

  /* ---------- 12-lead ECG ---------- */
  const LEADS = [['I', 0.55], ['II', 1], ['III', 0.5], ['aVR', -0.75], ['aVL', 0.3], ['aVF', 0.75], ['V1', -0.55], ['V2', 0.35], ['V3', 0.85], ['V4', 1.25], ['V5', 1.1], ['V6', 0.85]];   // columns: limb, augmented, V1-3, V4-6
  function ecg12(cv, st) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), W = cv.clientWidth; if (!(W > 40)) return false;
    const secs = 10, mm = W / (secs * 25), rowH = mm * 22, H = Math.round(rowH * 4 + mm * 6);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#fff6f4'; c.fillRect(0, 0, W, H);
    for (let i = 0; i * mm <= W; i++) { c.strokeStyle = i % 5 ? 'rgba(232,120,120,.22)' : 'rgba(214,70,70,.5)'; c.lineWidth = i % 5 ? 0.5 : 1; c.beginPath(); c.moveTo(i * mm, 0); c.lineTo(i * mm, H); c.stroke(); }
    for (let i = 0; i * mm <= H; i++) { c.strokeStyle = i % 5 ? 'rgba(232,120,120,.22)' : 'rgba(214,70,70,.5)'; c.lineWidth = i % 5 ? 0.5 : 1; c.beginPath(); c.moveTo(0, i * mm); c.lineTo(W, i * mm); c.stroke(); }
    const r = new UI.Rhythm(st.hr >= 100 ? 'stach' : 'nsr', st.hr, 0.3); r.ta = st.ta; r.u = st.u;
    c.strokeStyle = '#141414'; c.lineWidth = 1.2; c.lineJoin = 'round'; c.fillStyle = '#141414'; c.font = `600 ${Math.max(10, mm * 2.6)}px monospace`;
    const trace = (x0, y0, t0, t1, g) => { c.beginPath(); for (let tt = t0; tt <= t1; tt += 0.002) { const x = x0 + (tt - t0) * 25 * mm, y = y0 - r.ecg(tt) * g * 10 * mm; if (tt === t0) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); };
    LEADS.forEach(([name, g], i) => {
      const row = i % 3, col = Math.floor(i / 3), x0 = col * 2.5 * 25 * mm, y0 = mm * 4 + row * rowH + rowH * 0.62;
      trace(x0, y0, col * 2.5, col * 2.5 + 2.5, g); c.fillText(name, x0 + mm * 1.5, mm * 4 + row * rowH + mm * 4);
      if (col) { c.beginPath(); c.moveTo(x0, y0 - mm * 3); c.lineTo(x0, y0 + mm * 3); c.stroke(); }
    });
    trace(0, mm * 4 + 3 * rowH + rowH * 0.62, 0, 10, 1); c.fillText('II', mm * 1.5, mm * 4 + 3 * rowH + mm * 4);
    return true;
  }
  function ecgText(st, he) {
    const qt = Math.round(1000 * (0.09 + 0.16 * Math.sqrt(60 / st.hr) + 0.08)), qtc = Math.round(qt / Math.sqrt(60 / st.hr));
    const k = st.k, interp = st.hr >= 100 ? 'Sinus tachycardia' : 'Sinus rhythm', extra = k > 6 ? ' · Peaked T waves' : k < 3 ? ' · Flat T waves, prominent U waves' : '';
    return { head: `HR ${st.hr} bpm · PR 124 ms · QRS 74 ms · QT/QTc ${qt}/${qtc} ms · Axis +60°`, interp: interp + extra + (k > 6 || k < 3 ? '' : ' · Otherwise normal ECG'), note: he ? 'פענוח אוטומטי של המכשיר: יש לאשר על ידי רופא.' : 'Computer interpretation: must be confirmed by a physician.' };
  }

  /* ---------- blood-gas analyzer slip ---------- */
  const sev = P => 1 / (1 + 23400 / (P * P * P + 150 * P));
  function gasSlip(v, ctx) {
    const be = 0.93 * (v.HCO3 - 24.4 + 14.8 * (v.pH - 7.4)), po2 = ctx.arterial ? 95 : 38 + (ctx.seed % 7), so2 = Math.min(99.5, sev(po2) * 100), hb = ctx.hb || 14.8;
    const row = (n, x, dp, u, rg) => `<div class="gr"><span>${n}</span><b>${(+x).toFixed(dp)}<i>${rg ? (x < rg[0] ? '↓' : x > rg[1] ? '↑' : '') : ''}</i></b><em>${u}</em></div>`;
    return `<div class="paper" dir="ltr" lang="en">
      <div class="gh"><b>${ctx.arterial ? 'ARTERIAL' : 'VENOUS'} SAMPLE</b><span>${ctx.date}</span><span>${ctx.time}</span><span>System Name</span><span>PEDS ED</span><span>Patient</span><span>${esc(ctx.pt)}</span></div>
      <h4>ACID/BASE 37.0 °C</h4>${row('pH', v.pH, 3, '', ctx.arterial ? [7.35, 7.45] : [7.32, 7.42])}${row('pCO₂', v.pCO2, 1, 'mmHg', ctx.arterial ? [35, 45] : [40, 50])}${row('pO₂', po2, 1, 'mmHg', ctx.arterial ? [80, 100] : [30, 50])}${row('HCO₃⁻ act', v.HCO3, 1, 'mmol/L', [22, 26])}${row('BE(B)', be, 1, 'mmol/L', [-2, 2])}
      <h4>CO-OXIMETRY</h4>${row('Hct', hb * 2.94, 0, '%', [33, 43])}${row('tHb', hb, 1, 'g/dL', [11, 14.5])}${row('sO₂', so2, 1, '%', ctx.arterial ? [95, 100] : [60, 80])}
      <h4>ELECTROLYTES</h4>${row('Na⁺', v.Na, 1, 'mmol/L', [135, 145])}${row('K⁺', v.K, 2, 'mmol/L', [3.5, 5])}${row('Ca⁺⁺', 1.16, 2, 'mmol/L', [1.12, 1.32])}${row('Cl⁻', v.Cl, 0, 'mmol/L', [98, 107])}${row('AnGap', v.AG, 1, 'mmol/L', [8, 16])}
      <h4>METABOLITES</h4>${row('Glu', v.G, 0, 'mg/dL', [70, 140])}${row('Lac', v.lact, 2, 'mmol/L', [0.5, 2])}
      <div class="gf">↑, ↓ – Out of range</div></div>`;
  }

  /* ---------- bedside meters ---------- */
  function meter(kind, v, he) {
    const val = kind === 'poc' ? (v.G > 600 ? 'HI' : v.G < 20 ? 'LO' : Math.round(v.G)) : (v.BHB > 8 ? 'HI' : fx(v.BHB, 1));
    const unit = kind === 'poc' ? 'mg/dL' : 'mmol/L', lab = kind === 'poc' ? 'GLU' : 'β-KET';
    return `<div class="meter" dir="ltr"><svg viewBox="0 0 160 240" role="img" aria-label="${esc(lab + ' ' + val)}"><rect x="10" y="6" width="140" height="228" rx="34" fill="#3f4b52" stroke="#5f6f7a" stroke-width="2"/><rect x="28" y="30" width="104" height="92" rx="10" fill="#cfe9d8"/><text x="80" y="54" text-anchor="middle" font-family="monospace" font-size="12" fill="#2b3a30">${lab}</text><text x="80" y="96" text-anchor="middle" font-family="monospace" font-weight="700" font-size="${String(val).length > 3 ? 30 : 38}" fill="#132018">${val}</text><text x="80" y="114" text-anchor="middle" font-family="monospace" font-size="11" fill="#2b3a30">${unit}</text><circle cx="58" cy="160" r="12" fill="#56646d"/><circle cx="102" cy="160" r="12" fill="#56646d"/><rect x="64" y="212" width="32" height="26" rx="3" fill="${kind === 'poc' ? '#e9eef0' : '#c39bff'}"/></svg>
      ${val === 'HI' && kind === 'poc' ? `<p class="muted small">${he ? 'HI = מעל טווח המכשיר (600 מ״ג/ד״ל). שלחו סוכר ורידי.' : 'HI = above the meter range (600 mg/dL). Send a venous glucose.'}</p>` : ''}</div>`;
  }

  /* ---------- hospital lab report ---------- */
  const REF = {
    Na: ['Sodium', 'נתרן', 'mEq/L', 135, 145, 0], K: ['Potassium', 'אשלגן', 'mEq/L', 3.5, 5.1, 1], Cl: ['Chloride', 'כלור', 'mEq/L', 98, 107, 0], HCO3: ['Bicarbonate', 'ביקרבונט', 'mEq/L', 22, 29, 1],
    BUN: ['Urea (BUN)', 'אוריאה', 'mg/dL', 7, 18, 0], Cr: ['Creatinine', 'קראטינין', 'mg/dL', 0.3, 0.7, 2], G: ['Glucose', 'גלוקוז', 'mg/dL', 70, 110, 0], Ca: ['Calcium', 'סידן', 'mg/dL', 8.8, 10.8, 1],
    P: ['Phosphorus', 'זרחן', 'mg/dL', 3.7, 5.6, 1], Mg: ['Magnesium', 'מגנזיום', 'mg/dL', 1.7, 2.3, 1], AG: ['Anion gap', 'פער אניונים', 'mEq/L', 8, 16, 0],
    WBC: ['WBC', 'לויקוציטים', 'K/µL', 4.5, 13.5, 1], NEU: ['Neutrophils', 'נויטרופילים', '%', 40, 75, 0], HGB: ['Hemoglobin', 'המוגלובין', 'g/dL', 11.5, 15.5, 1], HCT: ['Hematocrit', 'המטוקריט', '%', 35, 45, 0], MCV: ['MCV', 'MCV', 'fL', 77, 95, 0], PLT: ['Platelets', 'טסיות', 'K/µL', 150, 450, 0], CRP: ['CRP', 'CRP', 'mg/dL', 0, 0.5, 2],
    PT: ['PT', 'PT', 'sec', 11, 14, 1], INR: ['INR', 'INR', '', 0.8, 1.2, 2], PTT: ['PTT', 'PTT', 'sec', 25, 36, 1], FIB: ['Fibrinogen', 'פיברינוגן', 'mg/dL', 200, 400, 0],
    LIP: ['Lipase', 'ליפאז', 'U/L', 0, 60, 0], AMY: ['Amylase', 'עמילאז', 'U/L', 25, 125, 0], ALT: ['ALT', 'ALT', 'U/L', 5, 30, 0], AST: ['AST', 'AST', 'U/L', 10, 40, 0], BIL: ['Bilirubin total', 'בילירובין', 'mg/dL', 0.2, 1.2, 1], ALB: ['Albumin', 'אלבומין', 'g/dL', 3.5, 5, 1],
    A1C: ['HbA1c', 'HbA1c', '%', 4, 5.6, 1], TSH: ['TSH', 'TSH', 'mIU/L', 0.5, 4.5, 2], TTG: ['Anti-tTG IgA', 'נוגדני tTG', 'U/mL', 0, 10, 0]
  };
  const PANELS = {
    chem: { en: 'Chemistry · blood', he: 'ביוכימיה · דם', keys: ['Na', 'K', 'Cl', 'HCO3', 'AG', 'G', 'BUN', 'Cr', 'Ca', 'P', 'Mg'] },
    cbc: { en: 'Complete blood count + CRP', he: 'ספירת דם + CRP', keys: ['WBC', 'NEU', 'HGB', 'HCT', 'MCV', 'PLT', 'CRP'] },
    coag: { en: 'Coagulation', he: 'תפקודי קרישה', keys: ['PT', 'INR', 'PTT', 'FIB'] },
    lipase: { en: 'Pancreatic enzymes', he: 'אנזימי לבלב', keys: ['LIP', 'AMY'] },
    lft: { en: 'Liver function', he: 'תפקודי כבד', keys: ['ALT', 'AST', 'BIL', 'ALB'] },
    dmw: { en: 'Diabetes work-up', he: 'בירור סוכרת', keys: ['A1C', 'TSH', 'TTG'], text: { en: 'Anti-GAD: positive · Anti-insulin: pending · Anti-islet cell: pending', he: 'Anti-GAD: חיובי · נוגדנים לאינסולין: ממתין · Anti-islet cell: ממתין' } }
  };
  function report(kind, v, ctx) {
    const he = ctx.he, P = PANELS[kind];
    const head = `<div class="emr-h"><b>${he ? 'תוצאות מעבדה' : 'Laboratory results'}</b><span>${esc(ctx.pt)}</span></div><div class="emr-m"><span>${he ? 'מחלקה' : 'Unit'}: ${he ? 'מיון ילדים' : 'Pediatric ED'}</span><span>${he ? 'נלקח' : 'Collected'}: ${ctx.date} ${ctx.time}</span><span>${he ? 'אושר' : 'Verified'}: ${ctx.date} ${ctx.ready}</span></div>`;
    if (P) {
      const rows = P.keys.filter(k => v[k] != null).map(k => {
        const [en, hn, u, lo, hi, dp] = REF[k], x = +v[k], fl = x < lo ? 'L' : x > hi ? 'H' : '';
        return `<tr class="${fl ? 'abn' : ''}"><td>${esc(he ? hn : en)}</td><td class="num">${fx(x, dp)}</td><td class="fl">${fl}</td><td>${esc(u)}</td><td class="num">${lo} – ${hi}</td></tr>`;
      }).join('');
      return `<div class="emr">${head}<div class="emr-t">${esc(P[he ? 'he' : 'en'])}</div><table><thead><tr><th>${he ? 'בדיקה' : 'Test'}</th><th>${he ? 'תוצאה' : 'Result'}</th><th></th><th>${he ? 'יחידות' : 'Units'}</th><th>${he ? 'ערכי ייחוס' : 'Reference'}</th></tr></thead><tbody>${rows}</tbody></table>${P.text ? `<p class="emr-x">${esc(P.text[he ? 'he' : 'en'])}</p>` : ''}</div>`;
    }
    const titles = { ua: ['Urinalysis', 'בדיקת שתן'], tns: ['Blood bank', 'בנק הדם'], bcx: ['Microbiology · blood culture', 'מיקרוביולוגיה · תרבית דם'], cxr: ['Radiology · chest X-ray', 'רנטגן · צילום חזה'], usabd: ['Radiology · ultrasound', 'דימות · אולטרסאונד'], ct: ['Radiology · CT', 'דימות · CT'], csf: ['Microbiology · CSF', 'מיקרוביולוגיה · נוזל שדרה'], dmwab: ['Immunology · diabetes autoantibodies', 'אימונולוגיה · נוגדנים לסוכרת'] }[kind] || [kind, kind];
    return `<div class="emr">${head}<div class="emr-t">${esc(titles[he ? 1 : 0])}</div><p class="emr-x">${esc(v.txt)}</p></div>`;
  }

  /* ---------- cumulative results window, like the hospital system: one column per sample time (newest first),
     tests grouped in sections with units and reference ranges; L/H in a yellow pill, panic values in red ---------- */
  const BE = v => v.pH != null && v.HCO3 != null ? 0.93 * (v.HCO3 - 24.4 + 14.8 * (v.pH - 7.4)) : null;
  const OSM = v => v.Na != null && v.G != null && v.BUN != null ? 2 * v.Na + v.G / 18 + v.BUN / 2.8 : null;
  /* rows: [label, unit, lo, hi, dp, panicLo, panicHi, value(v), kinds (default: the section's)] */
  const CH = ['chem'], k = key => v => v[key];
  const CUM = [
    { he: 'ביוכימיה בדם', en: 'Blood chemistry', kinds: ['chem', 'lft', 'lipase', 'cbc', 'dmw'], rows: [
      ['Sodium-B', 'mmol/L', 135, 145, 0, 120, 160, k('Na'), CH], ['Potassium-B', 'mmol/L', 3.5, 5.1, 1, 2.5, 6.5, k('K'), CH],
      ['Chloride-B', 'mmol/L', 98, 107, 0, null, null, k('Cl'), CH], ['Bicarbonate-B', 'mmol/L', 22, 29, 1, 10, null, k('HCO3'), CH],
      ['Anion gap-B', 'mmol/L', 8, 16, 0, null, null, k('AG'), CH], ['Glucose-B', 'mg/dL', 70, 110, 0, 50, 500, k('G'), CH],
      ['Urea-B', 'mg/dL', 15, 40, 1, null, null, v => v.BUN != null ? v.BUN * 2.14 : null, CH], ['Creatinine-B', 'mg/dL', 0.3, 0.7, 2, null, null, k('Cr'), CH],
      ['Calcium-B', 'mg/dL', 8.8, 10.8, 1, 6.5, 13, k('Ca'), CH], ['Phosphorous-B', 'mg/dL', 3.7, 5.6, 1, 1, null, k('P'), CH],
      ['Magnesium-B', 'mg/dL', 1.7, 2.3, 2, 1, null, k('Mg'), CH], ['Osmolality calculated-B', 'mOsm/Kg', 275, 295, 0, null, 330, OSM, CH],
      ['ALT-B', 'U/L', 5, 30, 0, null, null, k('ALT'), ['lft']], ['AST-B', 'U/L', 10, 40, 0, null, null, k('AST'), ['lft']],
      ['Bilirubin Total-B', 'mg/dL', 0.2, 1.2, 1, null, null, k('BIL'), ['lft']], ['Albumin-B', 'g/dL', 3.5, 5, 1, null, null, k('ALB'), ['lft']],
      ['Lipase-B', 'U/L', 0, 60, 0, null, null, k('LIP'), ['lipase']], ['Amylase-B', 'U/L', 25, 125, 0, null, null, k('AMY'), ['lipase']],
      ['CRP-B', 'mg/L', 0, 5, 1, null, null, v => v.CRP != null ? v.CRP * 10 : null, ['cbc']],
      ['HbA1c', '%', 4, 5.6, 1, null, null, k('A1C'), ['dmw']], ['TSH', 'mIU/L', 0.5, 4.5, 2, null, null, k('TSH'), ['dmw']], ['Anti tTG IgA', 'U/mL', 0, 10, 0, null, null, k('TTG'), ['dmw']]
    ] },
    { he: 'בדיקות גזים', en: 'Blood gases', kinds: ['vbg', 'abg'], rows: [
      ['pH-WB', '', 7.31, 7.41, 3, 7.0, 7.6, k('pH')], ['pCO2-WB', 'mmHg', 40, 52, 1, null, null, k('pCO2')], ['HCO3-WB', 'mmol/L', 22, 26, 1, 10, null, k('HCO3')],
      ['ABE-WB', 'mmol/L', -2, 2, 1, null, null, BE], ['Sodium-WB', 'mmol/L', 135, 145, 0, 120, 160, k('Na')], ['Potassium-WB', 'mmol/L', 3.5, 5.1, 1, 2.5, 6.5, k('K')],
      ['Chloride-WB', 'mmol/L', 98, 107, 0, null, null, k('Cl')], ['Glucose-WB', 'mg/dL', 70, 110, 0, 50, 500, k('G')], ['Lactate-WB', 'mmol/L', 0.5, 2.2, 1, null, 4, k('lact')]
    ] },
    { he: 'המטולוגיה', en: 'Hematology', kinds: ['cbc'], rows: [
      ['WBC', '10^3/µL', 4.5, 13.5, 1, 1, 30, k('WBC')], ['Neutrophils %', '%', 40, 75, 0, null, null, k('NEU')], ['HGB', 'g/dL', 11.5, 15.5, 1, 7, 20, k('HGB')],
      ['HCT', '%', 35, 45, 0, null, null, k('HCT')], ['MCV', 'fL', 77, 95, 0, null, null, k('MCV')], ['PLT', '10^3/µL', 150, 450, 0, 50, 1000, k('PLT')]
    ] },
    { he: 'קרישה', en: 'Coagulation', kinds: ['coag'], rows: [
      ['PT', 'sec', 11, 14, 1, null, null, k('PT')], ['INR', '', 0.8, 1.2, 2, null, 4, k('INR')], ['PTT', 'sec', 25, 36, 1, null, 100, k('PTT')], ['Fibrinogen', 'mg/dL', 200, 400, 0, 100, null, k('FIB')]
    ] }
  ];
  const TXT = ['ua', 'tns', 'bcx', 'csf', 'dmwab', 'cxr', 'usabd', 'ct'];
  /* cols: [{ d: 'dd/mm/yy', h: 'hh:mm', hl, rs: [{ kind, v, pend, ix }] }], newest first; ctx.name(kind) names a text result */
  function cumulative(cols, ctx) {
    const he = ctx.he;
    const cell = (x, R, hl) => {
      const lo = R[2], hi = R[3], dp = R[4], pl = R[5], ph = R[6];
      const f = pl != null && x < pl ? 'PL' : ph != null && x > ph ? 'PH' : x < lo ? 'L' : x > hi ? 'H' : '';
      const cls = (hl ? 'hl ' : '') + (f ? (f[0] === 'P' ? 'cpan' : 'cabn') : '');
      return `<td class="${cls}"><span>${fx(x, dp)}</span>${f ? `<i>${f.endsWith('L') ? '↓' : '↑'}</i>` : ''}</td>`;
    };
    const head = `<tr><th class="tn">${he ? 'בדיקות' : 'Tests'}</th><th>${he ? 'יחידות' : 'Units'}</th><th>${he ? 'ערכי ייחוס' : 'Reference'}</th>${cols.map(c => `<th class="${c.hl ? 'hl' : ''}">${c.d}<br>${c.h}</th>`).join('')}</tr>`;
    const span = 3 + cols.length;
    let body = '';
    CUM.forEach(sec => {
      if (!cols.some(c => c.rs.some(r => sec.kinds.includes(r.kind)))) return;
      let rows = '';
      sec.rows.forEach(R => {
        const kinds = R[8] || sec.kinds;
        const vals = cols.map(c => {
          const r = c.rs.find(r => kinds.includes(r.kind) && !r.pend && R[7](r.v) != null);
          return r ? R[7](r.v) : c.rs.some(r => kinds.includes(r.kind) && r.pend) ? '…' : null;
        });
        if (vals.every(x => x == null)) return;
        rows += `<tr><td class="tn"><u>${esc(R[0])}</u></td><td class="u">${esc(R[1])}</td><td class="rg">${R[2]}-${R[3]}</td>${vals.map((x, i) => x == null ? `<td class="${cols[i].hl ? 'hl' : ''}"></td>` : x === '…' ? `<td class="pend${cols[i].hl ? ' hl' : ''}">…</td>` : cell(x, R, cols[i].hl)).join('')}</tr>`;
      });
      if (rows) body += `<tr class="ch-sec"><td colspan="${span}"><span dir="rtl">${esc(he ? sec.he : sec.en)}</span></td></tr>` + rows;
    });
    const tcols = cols.map(c => c.rs.filter(r => TXT.includes(r.kind)));
    const tk = [...new Set(tcols.flat().map(r => r.kind))];
    if (tk.length) {
      body += `<tr class="ch-sec"><td colspan="${span}"><span dir="rtl">${he ? 'שתן, מיקרוביולוגיה, בנק דם ודימות' : 'Urine, microbiology, blood bank, imaging'}</span></td></tr>`;
      tk.forEach(kd => {
        body += `<tr><td class="tn" colspan="3"><u dir="auto">${esc(ctx.name(kd))}</u></td>${tcols.map((rs, i) => { const r = rs.find(r => r.kind === kd); return `<td class="${cols[i].hl ? 'hl' : ''}">${!r ? '' : r.pend ? '<span class="pend">…</span>' : `<button class="ch-doc" data-ri="${r.ix}" title="${esc(ctx.name(kd))}">📄</button>`}</td>`; }).join('')}</tr>`;
      });
    }
    const legend = ['L', 'H', 'VL', 'VH', 'PL', 'PH'].map(x => `<b class="lg-${x}">${x}</b>`).join('');
    return `<div class="cham" dir="ltr"><div class="ch-title"><i>e</i><span dir="rtl">${he ? 'תוצאות מעבדה' : 'Laboratory results'}</span> -- Webpage Dialog</div>
      <div class="ch-bar"><div class="ch-legend">${legend}</div><span class="ch-pt" dir="rtl">${esc(ctx.pt)}</span><span class="ch-sel" dir="rtl">${he ? '-כל המדבקות-' : '-All labels-'} ▾</span></div>
      <div class="ch-ser" dir="rtl">${he ? 'סידרה 1 מתוך 1' : 'Series 1 of 1'}</div>
      <div class="ch-scroll">${body ? `<table class="ch-t"><thead>${head}</thead><tbody>${body}</tbody></table>` : `<p class="ch-empty" dir="rtl">${he ? 'אין עדיין תוצאות' : 'No results yet'}</p>`}</div></div>`;
  }
  function abnormal(kind, v) { const P = PANELS[kind]; return !!P && P.keys.some(k => v[k] != null && REF[k] && (+v[k] < REF[k][3] || +v[k] > REF[k][4])); }
  window.RV = { ecg12, ecgText, gasSlip, meter, report, abnormal, cumulative, CUM_KINDS: CUM.flatMap(x => x.kinds).concat(TXT) };
})();
