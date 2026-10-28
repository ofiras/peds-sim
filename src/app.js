/* Peds ER & PICU Sim: app shell, order catalog, time loop, flowsheet, scoring and debrief.
   The order catalog is the whole emergency-department toolbox and is shared by every case; each case decides which
   orders matter (its model reacts to them, its rubric scores them) and which are unnecessary or harmful. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = x => String(x ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  let LANG = ls('psim-lang') || 'he', L = I18N[LANG], LEVEL = ls('psim-level') || 'guided';
  const C = window.CASE_DKA, M = window.DKA, app = $('#app');
  const CT = () => C[LANG];
  let S = null, MON = null, timer = null;

  const hhmm = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const dur = m => `${Math.floor(m / 60)}:${String(Math.round(m) % 60).padStart(2, '0')}`;
  const r1 = v => Math.round(v * 10) / 10;

  /* ---------------- order catalog ---------------- */
  /* The cart, drawn like the PALS app's: the monitor on top and four drawers of real items (vials, ampoules, bags, kits),
     plus hands-on actions at the patient. Forms: [key, kind, options|default]; kinds num, sel, freq. */
  const LABS = ['poc', 'vbg', 'abg', 'chem', 'bhb', 'cbc', 'coag', 'tns', 'bcx', 'ua', 'lipase', 'lft', 'ecg', 'dmw'];
  const FORMS = {
    o2: [['mode', 'sel', ['nc', 'mask', 'nrb', 'hfnc']]],
    bolus: [['fluid', 'sel', ['NS', 'LR']], ['mlkg', 'num', 10], ['over', 'num', 60]],
    main: [['base', 'sel', ['NS', 'HALF', 'LR']], ['dex', 'sel', [0, 5, 10, 12.5]], ['kcl', 'sel', [0, 20, 40, 60]], ['rate', 'num', '']],
    dexBolus: [['mlkg', 'num', 2]], prbc: [['mlkg', 'num', 10]], ffp: [['mlkg', 'num', 10]], plt: [['mlkg', 'num', 10]], albumin: [['mlkg', 'num', 10]],
    insDrip: [['dose', 'num', '']], scRapid: [['dose', 'num', 0.1]], scBasal: [['dose', 'num', 0.3]],
    mannitol: [['gkg', 'num', 0.5]], hts: [['mlkg', 'num', 5]], bicarb: [['meqkg', 'num', 1]], kpo: [['meqkg', 'num', 0.5]], kphos: [['mmolkg', 'num', 0.25]]
  };
  LABS.forEach(k => { if (['poc', 'vbg', 'abg', 'chem', 'bhb', 'ecg'].includes(k)) FORMS[k] = [['freq', 'freq']]; });
  Object.assign(FORMS, { insBolus: [['dose', 'num', '']], cagluc: [['mlkg', 'num', 0.5]], ondan: [['mgkg', 'num', 0.15]], paracet: [['mgkg', 'num', 15]], morphine: [['mgkg', 'num', 0.1]], midaz: [['mgkg', 'num', 0.1]], ceftriax: [['mgkg', 'num', 50]] });
  /* at the patient: the three most used are big, like the PALS hands-on buttons */
  const BED = { big: ['examQ', 'historyQ', 'att'], sm: ['weigh', 'npo', 'headUp', 'neuro', 'io', 'po', 'parents', 'endo', 'surg', 'picu', 'ward'] };
  const BED_ICON = { examQ: 'auscult', historyQ: 'history', att: 'ems', weigh: 'glucose', npo: 'position', headUp: 'position', neuro: 'resp', io: 'fluid', po: 'albuterol', parents: 'history', endo: 'ems', surg: 'ems', picu: 'ems', ward: 'ems' };
  /* drawer contents, as stocked: kind = the drawing; o = the order it opens */
  const ITEMS = {
    mon: [['monitor', 'leads'], ['ecg', 'ecg12'], ['aline', 'rhythm']],
    drug: [
      { o: 'insulinVial', kind: 'vial', cap: '#f2c14e', name: 'ACTRAPID', conc: 'regular insulin', pack: '100 units/mL' },
      { o: 'scRapid', kind: 'syr', cap: '#ff8a2a', name: 'NOVORAPID', conc: 'rapid insulin pen', pack: '100 units/mL' },
      { o: 'scBasal', kind: 'syr', cap: '#a974ff', name: 'LANTUS', conc: 'basal insulin pen', pack: '100 units/mL' },
      { o: 'mannitol', kind: 'bag', cap: '#e9eef0', name: 'MANNITOL 20%', conc: '0.2 g/mL', pack: '250 mL' },
      { o: 'hts', kind: 'bag', cap: '#ff5d73', name: 'NaCl 3%', conc: 'hypertonic', pack: '250 mL' },
      { o: 'bicarb', kind: 'syr', cap: '#9fd8ff', name: 'SODIUM BICARBO­NATE 8.4%', conc: '1 mEq/mL', pack: '50 mEq / 50 mL' },
      { o: 'kclConc', kind: 'vial', cap: '#d23a4a', name: 'POTASSIUM CHLORIDE 14.9%', conc: '2 mEq/mL · CONCENTRATE', pack: 'add to the IV bag' },
      { o: 'kpo', kind: 'vial', cap: '#ffd23f', name: 'SOPA-K', conc: 'oral potassium', pack: '1.34 mEq/mL' },
      { o: 'kphos', kind: 'vial', cap: '#d23a4a', name: 'POTASSIUM PHOSPHATE', conc: '3 mmol/mL', pack: 'dilute in G5%' },
      { o: 'cagluc', kind: 'amp', cap: '#e9eef0', name: 'CALCIUM GLUCONATE 10%', conc: '100 mg/mL', pack: '1 g / 10 mL' },
      { o: 'ondan', kind: 'amp', cap: '#e9eef0', name: 'ONDANSE­TRON', conc: '2 mg/mL', pack: '4 mg / 2 mL' },
      { o: 'paracet', kind: 'bag', cap: '#e9eef0', name: 'PARACETA­MOL IV', conc: '10 mg/mL', pack: '100 mL' },
      { o: 'morphine', kind: 'amp', cap: '#64a8ff', name: 'MORPHINE', conc: '10 mg/mL', pack: '10 mg / 1 mL' },
      { o: 'midaz', kind: 'amp', cap: '#ff9a6b', name: 'MIDAZOLAM', conc: '5 mg/mL', pack: '5 mg / 1 mL' },
      { o: 'ceftriax', kind: 'vial', cap: '#ff9a6b', name: 'CefTRIAXone', conc: 'powder', pack: '1 g for IV use' }
    ],
    line: [
      { o: 'iv', kind: 'cann', name: 'IV CANNULA', conc: '20G / 22G', pack: '× 2' },
      { o: 'io_access', kind: 'io', name: 'EZ-IO', conc: 'IO driver', pack: '15 / 25 mm needles' },
      { o: 'bolusNS', kind: 'bag', cap: '#3d8bff', name: '0.9% SODIUM CHLORIDE', conc: 'isotonic', pack: '500 mL' },
      { o: 'bolusLR', kind: 'bag', cap: '#35c46a', name: 'LACTATED RINGER’S', conc: 'isotonic', pack: '500 mL' },
      { o: 'main', kind: 'pump', name: 'INFUSION PUMP', conc: 'continuous IV fluids', pack: 'saline · dextrose · KCl' },
      { o: 'dexBolus', kind: 'bag', cap: '#ff8a2a', name: '10% DEXTROSE', conc: 'D10W · 100 mg/mL', pack: '250 mL' },
      { o: 'prbc', kind: 'bag', cap: '#b3121f', name: 'PACKED RED CELLS', conc: 'crossmatched', pack: '≈ 280 mL unit' },
      { o: 'ffp', kind: 'bag', cap: '#ffd23f', name: 'FRESH FROZEN PLASMA', conc: 'thawed', pack: '≈ 250 mL unit' },
      { o: 'plt', kind: 'bag', cap: '#ff8a2a', name: 'PLATELETS', conc: 'apheresis', pack: '≈ 250 mL unit' },
      { o: 'albumin', kind: 'bag', cap: '#e9eef0', name: 'ALBUMIN 5%', conc: 'colloid', pack: '250 mL' },
      { o: 'cvc', kind: 'cath', name: 'CENTRAL LINE KIT', conc: 'triple lumen', pack: 'femoral / IJ' },
      { o: 'poc', kind: 'gluco', name: 'GLUCO­METER', conc: 'point of care', pack: '' }
    ],
    air: [
      { o: 'o2', kind: 'nrb', name: 'OXYGEN', conc: 'cannula · mask · high-flow', pack: '' },
      { o: 'intub', kind: 'ett', name: 'ETT + LARYNGO­SCOPE', conc: 'cuffed tubes', pack: '+ capnography' },
      { o: 'ngt', kind: 'yank', name: 'NG TUBE', conc: '10–12 Fr', pack: 'with pH strips' },
      { o: 'foley', kind: 'cath', name: 'URINARY CATHETER', conc: '8–10 Fr Foley', pack: 'with urine bag' },
      { o: 'lp', kind: 'cath', name: 'LP NEEDLE', conc: '22G spinal', pack: 'with manometer' }
    ],
    lab: [
      { o: 'vbg', kind: 'syr', cap: '#3d8bff', name: 'BLOOD GAS', conc: 'venous · lytes', pack: '' },
      { o: 'abg', kind: 'syr', cap: '#ff5d73', name: 'ARTERIAL GAS', conc: 'needs an arterial stab or line', pack: '' },
      { o: 'chem', kind: 'tubes', name: 'CHEMISTRY', conc: 'Na K Cl urea Cr Ca P Mg', pack: '' },
      { o: 'bhb', kind: 'gluco', name: 'KETONE METER', conc: 'β-hydroxybutyrate', pack: '' },
      { o: 'cbc', kind: 'tubes', name: 'CBC + CRP', conc: 'purple tube', pack: '' },
      { o: 'coag', kind: 'tubes', name: 'COAGU­LATION', conc: 'blue tube', pack: '' },
      { o: 'tns', kind: 'tubes', name: 'TYPE & SCREEN', conc: 'blood bank', pack: '' },
      { o: 'bcx', kind: 'vial', cap: '#35c46a', name: 'BLOOD CULTURE', conc: 'pediatric bottle', pack: '' },
      { o: 'ua', kind: 'cup', name: 'URINE', conc: 'dipstick + culture', pack: '' },
      { o: 'lipase', kind: 'tubes', name: 'LIPASE / AMYLASE', conc: 'gold tube', pack: '' },
      { o: 'lft', kind: 'tubes', name: 'LIVER TESTS', conc: 'gold tube', pack: '' },
      { o: 'dmw', kind: 'tubes', name: 'DIABETES WORK-UP', conc: 'HbA1c · antibodies · TSH', pack: '' },
      { o: 'cxr', kind: 'xray', name: 'CHEST X-RAY', conc: 'portable', pack: '' },
      { o: 'usabd', kind: 'scan', name: 'ULTRA­SOUND', conc: 'abdomen · FAST', pack: '' },
      { o: 'ct', kind: 'scan', name: 'CT', conc: 'head', pack: 'leaves the unit' }
    ]
  };
  /* drawings the PALS cart did not need */
  const extraSVG = it => ({
    cup: '<svg viewBox="0 0 60 80"><path d="M16 22h28l-3 46a5 5 0 0 1-5 4H24a5 5 0 0 1-5-4z" fill="rgba(255,230,140,.35)" stroke="#d6eef8"/><rect x="14" y="16" width="32" height="7" rx="2" fill="#ffd23f"/><path d="M19 48h22" stroke="#ffd23f" stroke-width="10" opacity=".45"/></svg>',
    xray: '<svg viewBox="0 0 60 80"><rect x="10" y="12" width="40" height="56" rx="3" fill="#0b1820" stroke="#9aa7ad"/><path d="M30 20v40M22 26c-6 4-8 14-6 24M38 26c6 4 8 14 6 24M24 30h12M23 36h14M23 42h14M24 48h12" stroke="#d6eef8" stroke-width="1.4" fill="none" opacity=".8"/></svg>',
    scan: '<svg viewBox="0 0 60 80"><circle cx="30" cy="40" r="22" fill="none" stroke="#9aa7ad" stroke-width="6"/><circle cx="30" cy="40" r="12" fill="#0b1820" stroke="#d6eef8"/><rect x="14" y="64" width="32" height="6" rx="2" fill="#7d8f98"/></svg>'
  })[it.kind] || '';
  const itemPic = it => { const svg = UI.itemSVG(it) || extraSVG(it); return it.o === 'bhb' ? svg.replace('>mg/dL<', '>mmol/L<') : svg; };
  const EXTRA = {
    en: { io_access: 'Intraosseous (IO) access', o2: 'Oxygen', foley: 'Urinary catheter', ngt: 'Nasogastric tube', aline: 'Arterial line', cvc: 'Central venous line', lp: 'Lumbar puncture', endo: 'Endocrinology consult', parents: 'Talk with the parents', ventSet: 'Ventilator settings', surg: 'Surgical consult', ward: 'Admit to the pediatric ward',
      abg: 'Arterial blood gas', coag: 'Coagulation (PT/INR, PTT)', tns: 'Type and screen / crossmatch', bcx: 'Blood culture', ua: 'Urinalysis + urine culture', lipase: 'Lipase / amylase', lft: 'Liver function tests', cxr: 'Chest X-ray', usabd: 'Abdominal ultrasound',
      dexBolus: 'Dextrose 10% IV bolus', prbc: 'Packed red cells', ffp: 'Fresh frozen plasma', plt: 'Platelets', albumin: 'Albumin 5%', cagluc: 'Calcium gluconate 10% IV', paracet: 'Paracetamol IV', morphine: 'Morphine IV', midaz: 'Midazolam IV', ceftriax: 'Ceftriaxone IV',
      insulinVial: 'Regular insulin (Actrapid)', csf: 'CSF results', dmwab: 'Diabetes autoantibodies', kclConc: 'Concentrated KCl: goes into the IV bag', kclWhere: 'Potassium is added to the maintenance fluids: set it on the infusion pump.',
      modes: { nc: 'Nasal cannula', mask: 'Face mask', nrb: 'Non-rebreather', hfnc: 'High-flow' } },
    he: { io_access: 'גישה תוך-גרמית (IO)', o2: 'חמצן', foley: 'קטטר בשלפוחית', ngt: 'זונדה (NG)', aline: 'קו עורקי', cvc: 'צנתר ורידי מרכזי', lp: 'ניקור מותני', endo: 'ייעוץ אנדוקרינולוג', parents: 'שיחה עם ההורים', ventSet: 'הגדרות מנשם', surg: 'ייעוץ כירורג', ward: 'אשפוז במחלקת ילדים',
      abg: 'גזים עורקיים', coag: 'תפקודי קרישה (PT/INR, PTT)', tns: 'סוג והצלבה', bcx: 'תרבית דם', ua: 'בדיקת שתן + תרבית', lipase: 'ליפאז / עמילאז', lft: 'תפקודי כבד', cxr: 'צילום חזה', usabd: 'US בטן',
      dexBolus: 'בולוס גלוקוז 10% IV', prbc: 'מנות דם (PRBC)', ffp: 'פלזמה (FFP)', plt: 'טסיות', albumin: 'אלבומין 5%', cagluc: 'קלציום גלוקונט 10% IV', paracet: 'פרצטמול IV', morphine: 'מורפין IV', midaz: 'מידזולם IV', ceftriax: 'צפטריאקסון IV',
      insulinVial: 'אינסולין רגולר (Actrapid)', csf: 'תשובת נוזל שדרה', dmwab: 'נוגדנים לסוכרת', kclConc: 'KCl מרוכז: מוסיפים לשקית העירוי', kclWhere: 'אשלגן מוסיפים לנוזלי האחזקה: מגדירים אותו במשאבת העירוי.',
      modes: { nc: 'משקפי חמצן', mask: 'מסכה', nrb: 'מסכה עם שקית', hfnc: 'זרימה גבוהה' } }
  };
  const oname = id => L.o[id] || EXTRA[LANG][id] || id;
  /* minutes until the result is back; bedside tests (glucometer, ketone meter, ECG) are immediate */
  /* procedures: who does them and how many minutes they take */
  const ONCE = ['monitor', 'npo', 'headUp', 'picu', 'ward', 'endo', 'surg'];
  const onceDone = id => id === 'monitor' ? S.flags.mon : id === 'headUp' ? S.m.headUp : S.flags[id];
  const PROC = { iv: { by: 'nurse', min: 5 }, io_access: { by: 'md', min: 2, flag: 'io' }, ngt: { by: 'nurse', min: 5 }, foley: { by: 'nurse', min: 5 }, aline: { by: 'md', min: 15 }, cvc: { by: 'md', min: 20 }, lp: { by: 'md', min: 15 }, intub: { by: 'md', min: 10, flag: 'intubated' } };
  const LAB_DELAY = { poc: 0, vbg: 10, abg: 10, chem: 40, bhb: 0, cbc: 40, coag: 50, tns: 60, bcx: 1440, ua: 30, lipase: 45, lft: 45, ecg: 0, dmw: 240, cxr: 30, usabd: 60, ct: 40 };
  /* invasive or costly orders this case does not need: shown in the debrief as unnecessary */
  const UNNEEDED = { cxr: 1, foley: 1, cvc: 4, prbc: 4, ffp: 3, plt: 3, albumin: 2, lp: 8, intub: 6, ceftriax: 1, morphine: 1, midaz: 2, usabd: 1, surg: 0 };

  /* ---------------- shell ---------------- */
  function setLang(l) { LANG = l; L = I18N[l]; ls('psim-lang', l); document.documentElement.lang = l; document.documentElement.dir = l === 'he' ? 'rtl' : 'ltr'; }
  setLang(LANG);
  function modal(html, cls = '') {
    const el = document.createElement('div'); el.className = 'scrim'; el.innerHTML = `<div class="sheet ${cls}">${html}</div>`; document.body.appendChild(el);
    return { el, close() { el.remove(); } };
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-lang]')) { setLang(LANG === 'he' ? 'en' : 'he'); if (S && S.ended) { $$('.scrim').forEach(x => x.remove()); renderSim(); S.ended = false; endCase(); } else S ? renderSim() : home(); } });
  /* Escape closes the top dialog */
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !(S && S.ended)) { const sc = $$('.scrim'); if (sc.length) sc[sc.length - 1].remove(); } });

  /* ---------------- progress: stars per case, experience, rank, badges (this device only) ---------------- */
  const RANK_XP = [0, 150, 400, 800, 1400, 2200, 3200];
  const progGet = () => { try { return Object.assign({ xp: 0, stars: {}, ach: {} }, JSON.parse(ls('psim-prog') || '{}')); } catch (e) { return { xp: 0, stars: {}, ach: {} }; } };
  const rankOf = xp => { let i = 0; while (i + 1 < RANK_XP.length && xp >= RANK_XP[i + 1]) i++; return i; };
  const starsHTML = (n, cls = '') => `<span class="stars ${cls}" aria-label="${n}/3">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}">★</i>`).join('')}</span>`;
  function xpBar(xp) {
    const r = rankOf(xp), lo = RANK_XP[r], hi = RANK_XP[r + 1], pc = hi ? Math.round((xp - lo) / (hi - lo) * 100) : 100;
    return `<div class="rank"><span class="rk">${r + 1}</span><div><b>${esc(L.g.ranks[r])}</b><div class="xpbar"><i style="width:${pc}%"></i></div><small>${xp} XP${hi ? ` · ${esc(L.g.next(hi - xp, L.g.ranks[r + 1]))}` : ''}</small></div></div>`;
  }
  /* badges: [id, test(R by key, outcome context)] */
  const ACH = [
    ['first', () => true], ['survive', c => c.alive], ['perfect', c => c.pct >= 100], ['k', c => c.ok('potassium')], ['smooth', c => c.ok('gfall') && c.ok('hypo')],
    ['brain', c => c.has('ce') && c.ok('ce') && c.alive], ['airway', c => c.has('vent') && c.ok('vent')], ['family', c => S.log.some(e => e.id === 'parents' && e.t <= 30)],
    ['clean', c => !c.has('stopped') && !c.has('overrode') && !c.has('extra')], ['night', c => !!S.flags.shiftAsked && S.handover == null && c.alive && c.ok('exit')],
    ['three', c => c.stars === 3], ['comeback', c => c.prev != null && c.pct >= c.prev + 20]
  ];
  function award(R, pct, prevPct) {
    const P = progGet(), m = S.m, alive = !m.dead && !(m.injury > 0), byKey = k => R.find(r => r.key === k);
    let stars = m.dead ? 0 : pct >= 90 ? 3 : pct >= 75 ? 2 : pct >= 50 ? 1 : 0;
    const capped = LEVEL === 'guided' && stars > 2; if (capped) stars = 2;
    const c = { pct, alive, stars, prev: prevPct, ok: k => !!(byKey(k) && byKey(k).ok), has: k => !!byKey(k) };
    const items = [[['base', pct, LEVEL === 'guided' ? 1 : 1.5], Math.round(pct * (LEVEL === 'guided' ? 1 : 1.5) * (m.dead ? 0.3 : 1))]];
    const was = P.stars[C.id] || 0; if (stars > was) { items.push([['stars', stars - was], 40 * (stars - was)]); P.stars[C.id] = stars; }
    const fresh = ACH.filter(([id, f]) => !P.ach[id] && f(c)).map(([id]) => id);
    fresh.forEach(id => { P.ach[id] = Date.now(); items.push([['badge', id], 30]); });
    const gained = items.reduce((a, x) => a + x[1], 0), before = P.xp; P.xp += gained;
    ls('psim-prog', JSON.stringify(P));
    return { stars, capped, items, gained, fresh, before, after: P.xp, up: rankOf(P.xp) > rankOf(before) };
  }
  function gamHTML(G) {
    return `<div class="gam"><div class="gtop">${starsHTML(G.stars, 'big')}<b class="gxp" dir="ltr">+${G.gained} XP</b>${G.up ? `<span class="lvup">${esc(L.g.lvlUp(L.g.ranks[rankOf(G.after)]))}</span>` : ''}</div>
      ${G.capped ? `<p class="gcap">${esc(L.g.cap)}</p>` : ''}<ul class="gitems">${G.items.map(([k, x]) => `<li><span>${esc(k[0] === 'base' ? L.g.base(k[1], k[2]) : k[0] === 'stars' ? L.g.newStars(k[1]) : L.g.badge(L.g.ach[k[1]][0]))}</span><b dir="ltr">+${x}</b></li>`).join('')}</ul>
      ${xpBar(G.after)}${G.fresh.length ? `<div class="badges new">${G.fresh.map(id => `<span class="bdg on" title="${esc(L.g.ach[id][1])}"><i>${L.g.icon[id]}</i>${esc(L.g.ach[id][0])}</span>`).join('')}</div>` : ''}</div>`;
  }
  function badgesHTML() {
    const P = progGet();
    return `<div class="badges">${ACH.map(([id]) => `<span class="bdg ${P.ach[id] ? 'on' : ''}" title="${esc(L.g.ach[id][1])}"><i>${P.ach[id] ? L.g.icon[id] : '🔒'}</i>${esc(L.g.ach[id][0])}<small>${esc(L.g.ach[id][1])}</small></span>`).join('')}</div>`;
  }
  /* attempts are kept on this device only */
  const histGet = () => { try { return JSON.parse(ls('psim-hist') || '[]'); } catch (e) { return []; } };
  function histHTML() {
    const H = histGet().filter(x => x.c === C.id).slice().reverse(), he = LANG === 'he';
    if (!H.length) return `<p class="muted small">${esc(L.hist.none)}</p>`;
    const best = Math.max(...H.map(x => x.pct)), dt = d => { const x = new Date(d), z = n => String(n).padStart(2, '0'); return `${z(x.getDate())}/${z(x.getMonth() + 1)} ${z(x.getHours())}:${z(x.getMinutes())}`; };
    const sp = H.slice(0, 12).reverse(), W = 160, Ht = 34, X = i => 4 + (W - 8) * (sp.length > 1 ? i / (sp.length - 1) : 0.5), Y = v => 4 + (Ht - 8) * (1 - v / 100);
    const spark = `<svg class="hspark" viewBox="0 0 ${W} ${Ht}" aria-hidden="true"><path d="${sp.map((x, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(x.pct).toFixed(1)}`).join('')}" fill="none" stroke="#4fc3ff" stroke-width="1.6"/>${sp.map((x, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(x.pct).toFixed(1)}" r="2.4" fill="${x.o === 'ok' ? '#3ef08f' : x.o === 'd' ? '#ff5d6c' : '#ffb35c'}"/>`).join('')}</svg>`;
    return `<div class="hhead">${spark}<span>${esc(L.hist.best)}: <b>${best}%</b></span><button class="btn sm ghost" data-hclr>${esc(L.hist.clear)}</button></div>
      <table class="htab"><tbody>${H.slice(0, 8).map(x => `<tr><td dir="ltr">${dt(x.d)}</td><td>${esc(L[x.lv] || x.lv)}</td><td><b>${x.pct}%</b></td><td class="ho-${x.o}">${esc(L.hist.out[x.o])}${x.ho ? ' · ' + esc(L.hist.ho) : ''}</td><td dir="ltr">${dur(x.t)}</td></tr>`).join('')}</tbody></table>`;
  }
  function home() {
    stopLoop(); S = null; $$('.scrim,.redeb').forEach(x => x.remove());
    app.innerHTML = `<div class="phome"><div class="top"><div><span class="eyebrow">ER · PICU</span><h1>${esc(L.appTitle)}</h1></div><button class="btn ghost" data-lang>${esc(L.lang)}</button></div>
      <p class="sub">${esc(L.appSub)}</p>
      ${xpBar(progGet().xp)}
      <div class="lvpick"><span class="eyebrow">${esc(L.level)}</span>${['guided', 'indep'].map(k => `<label class="pill ${LEVEL === k ? 'on' : ''}"><input type="radio" name="lv" value="${k}" ${LEVEL === k ? 'checked' : ''}>${esc(L[k])}</label>`).join('')}<small>${esc(L[LEVEL + 'D'])}</small></div>
      <button class="ccard" data-case><span class="tag">${esc(CT().tag)}</span>${starsHTML(progGet().stars[C.id] || 0)}<b>${esc(CT().title)}</b><span class="muted">${esc(CT().brief)}</span></button>
      <section class="hist"><h3>${esc(L.hist.title)}</h3>${histHTML()}</section>
      <section class="hist"><h3>${esc(L.g.achT)} <small dir="ltr">${Object.keys(progGet().ach).length}/${ACH.length}</small></h3>${badgesHTML()}</section></div>`;
    $$('input[name=lv]').forEach(r => r.addEventListener('change', () => { LEVEL = r.value; ls('psim-level', LEVEL); home(); }));
    $('[data-case]').addEventListener('click', briefing);
    const hc = $('[data-hclr]'); if (hc) hc.addEventListener('click', () => { const md = modal(`<p>${esc(L.hist.clearQ)}</p><div class="row"><button class="btn primary" data-y>${esc(L.yes)}</button><button class="btn ghost" data-n>${esc(L.no)}</button></div>`); md.el.onclick = e => { if (e.target.closest('[data-y]')) { ls('psim-hist', JSON.stringify(histGet().filter(x => x.c !== C.id))); ls('psim-prog', '{}'); md.close(); home(); } else if (e.target.closest('[data-n]')) md.close(); }; });
  }
  function briefing() {
    const m = modal(`<h2>${esc(CT().title)}</h2><p>${esc(CT().brief)}</p><p class="muted">${esc(CT().triage)}</p><div class="row"><button class="btn primary" data-go>${esc(L.start)}</button><button class="btn ghost" data-x>${esc(L.back)}</button></div>`);
    m.el.addEventListener('click', e => { if (e.target.closest('[data-go]')) { m.close(); startCase(); } else if (e.target.closest('[data-x]')) m.close(); });
  }

  /* ---------------- session ---------------- */
  function startCase() {
    $$('.scrim,.redeb').forEach(x => x.remove());
    S = { date0: new Date().setHours(0, 0, 0, 0), m: M.create(C.model), procs: {}, later: [], log: [], msgs: [], res: [], standing: {}, flags: { loc: 'ED' }, speed: 0, acc: 0, ended: false, fired: {}, att: [], tab: 'drug', uoLow: 0, nbp: { v: null, at: '', busy: false, next: 0, cuff: 0 }, silUntil: 0 };
    msg('sys', CT().triage);
    renderSim(); loop();
    S.speed = 1; renderClock();   // the clock runs from arrival and never stops
  }
  const now = () => S.m.t;
  /* time never stops: a critical message sounds an alert and is highlighted, nothing pauses */
  function msg(kind, text, crit, res) {
    S.msgs.push({ t: now(), kind, text, crit: !!crit, res });
    if (crit) { UI.Sound.alarmMed(); if (S.speed > 1) { S.speed = 1; renderClock(); } }
    renderFeed();
  }
  const did = id => S.log.some(e => e.id === id);
  const dw = () => S.flags.weighed ? S.m.wt : S.m.wt0;   // the weight doses are worked out with
  const firstT = id => { const e = S.log.find(x => x.id === id); return e ? e.t : null; };

  /* ---------------- orders ---------------- */
  function order(id, p = {}) {
    if (S.ended) return;
    /* until he is weighed, doses go by the weight from the history (35 kg two months ago) */
    const m = S.m, w = S.flags.weighed ? m.wt : m.wt0, needIV = ['bolus', 'main', 'insDrip', 'insBolus', 'mannitol', 'hts', 'bicarb', 'kphos', 'dexBolus', 'prbc', 'ffp', 'plt', 'albumin', 'cagluc', 'ondan', 'paracet', 'morphine', 'midaz', 'ceftriax', 'intub'];
    if (needIV.includes(id) && !S.flags.iv && !S.flags.io) { msg('nurse', L.msgs.noIV); return; }
    { const MAX = { bolus: { mlkg: 40 }, dexBolus: { mlkg: 5 }, prbc: { mlkg: 20 }, ffp: { mlkg: 20 }, plt: { mlkg: 20 }, albumin: { mlkg: 20 }, insDrip: { dose: 0.2 }, insBolus: { dose: 0.2 }, scRapid: { dose: 0.3 }, scBasal: { dose: 0.6 }, mannitol: { gkg: 1.5 }, hts: { mlkg: 10 }, bicarb: { meqkg: 2 }, kpo: { meqkg: 1 }, kphos: { mmolkg: 0.5 }, cagluc: { mlkg: 1 }, ondan: { mgkg: 0.2 }, paracet: { mgkg: 15 }, morphine: { mgkg: 0.2 }, midaz: { mgkg: 0.2 }, ceftriax: { mgkg: 100 }, main: { rate: Math.round(4 * M.maint(w)) } }[id];
      const over = MAX && Object.keys(MAX).find(k => +p[k] > MAX[k]); if (over) { const u = over === 'rate' ? L.mlh : over === 'dose' ? (id === 'insDrip' ? L.f.ukgh : L.f.ukg) : L.f[over] || ''; msg('nurse', L.msgs.tooMuch(oname(id), `${p[over]} ${u}`, `${MAX[over]} ${u}`), true); return; } }
    if (id === 'intub' && p.sed) { const bad = [['sed', p.sed, p.sedD], ['par', p.par, p.parD]].find(([g, k, d]) => RSI[g][k] && RSI[g][k][3] && d > RSI[g][k][3]); if (bad) { const D = RSI[bad[0]][bad[1]]; msg('nurse', L.msgs.tooMuch(D[0], `${bad[2]} ${D[4]}`, `${D[3]} ${D[4]}`), true); return; } }
    if (['prbc', 'ffp', 'plt'].includes(id) && !S.res.some(r => r.kind === 'tns' && r.ready <= now())) { msg('nurse', L.msgs.noTS); return; }
    /* the attending objects to harmful orders before anything happens: cancel (logged, half the penalty) or insist */
    const vomited = S.log.some(e => e.id === 'po' && (e.fail || e.refused) && now() - e.t < 45);
    const kKnown = S.res.some(r => r.ready <= now() && typeof (r.v || {}).K === 'number'), mt2 = 2.2 * M.maint(w), ceRecent = Math.max(m.ce, ...m.hist.filter(h => h.t >= now() - 15).map(h => h.ce)), gcsWorst = Math.min(m.GCS, ...m.hist.filter(h => h.t >= now() - 15).map(h => h.GCS));
    const W = CT().warn || {}, wk = id === 'intub' ? (ceRecent < 0.55 && gcsWorst > 8 && m.arrestAt == null ? 'intub' : null) : id === 'ward' ? (m.pH < 7.3 ? 'ward' : null) : id === 'foley' ? (m.GCS >= 13 && !m.vent ? 'foley' : null) : id;
    const kLastR = S.res.filter(r => r.ready <= now() && typeof (r.v || {}).K === 'number').pop(), kLastV = kLastR ? kLastR.v.K : null;
    const dyn = id === 'ward' && kLastV != null && kLastV < 3.5 ? 'wardK'
      : id === 'bolus' && (p.mlkg > 10 || p.over < 30) ? 'bolusFast'
      : id === 'ct' && m.ce < 0.2 && S.ceSignAt == null && m.GCS >= 14 ? 'ctNoSigns'
      : id === 'ct' && m.ce > 0.3 && !(m.mannitol.concat(m.hts)).some(d => now() - d.at < 120) ? 'ctEarly'
      : id === 'main' && +p.rate > mt2 && now() > 30 ? 'fluidsHigh'
      : id === 'bolus' && m.inf.boluses.some(b => b.left > 1) ? 'bolusRunning'
      : (id === 'insDrip' && !m.inf.insulin || id === 'main' && +p.kcl > 0 && !m.inf.main.kcl) && !kKnown && !p.okK ? 'noK'
      : id === 'insDrip' && +p.dose >= 0.099 && !S.att.some(a => a >= now() - 30) ? 'ins01'
      : id === 'scRapid' && (m.vent || m.GCS < 14 || m.G < 120 || m.pH < 7.3 || vomited) ? 'scQuery'
      : LABS.includes(id) && !p.freq && !['poc', 'bhb', 'vbg', 'abg', 'ecg'].includes(id) && S.res.some(r => r.kind === id && now() - r.drawn < 60) ? 'dupLab'
      : LEVEL === 'guided' && (id === 'insBolus' || id === 'bicarb') ? id : null;
    const lastLab = S.res.filter(r => r.kind === id).pop();
    const dynText = { ctEarly: L.msgs.ctEarly, noK: L.msgs.noK, ins01: L.msgs.ins01, fluidsHigh: L.msgs.fluidsHigh(Math.round(mt2 / 1.1)), scQuery: L.msgs.scQuery(m.vent ? L.msgs.why.vent : m.GCS < 14 ? L.msgs.why.drowsy : m.G < 120 ? L.msgs.why.lowG(Math.round(m.G)) : vomited ? L.msgs.why.vomit : L.msgs.why.acid), bolusRunning: L.msgs.bolusRunning, wardK: L.msgs.wardK(kLastV), dupLab: lastLab && L.msgs.dupLab(oname(id), Math.round(now() - lastLab.drawn)) }[dyn];
    if (dyn && dynText && !p.force) return objection(id, dyn === 'noK' ? Object.assign({}, p, { okK: true }) : p, dynText, ['noK', 'ins01', 'scQuery', 'dupLab', 'bolusRunning'].includes(dyn) ? 'nurse' : 'att', dyn === 'noK', dyn);
    if (dyn && W[dyn] && !p.force) return objection(id, p, W[dyn]);
    if (wk && W[wk] && !p.force) {
      if (ONCE.includes(id) && onceDone(id)) { msg('sys', L.already(oname(id))); return; }
      if ((PROC[id] && (S.flags[PROC[id].flag || id] || S.procs[id] != null))) { msg('sys', L.already(oname(id))); return; }
      return objection(id, p, W[wk]);
    }
    if (ONCE.includes(id) && onceDone(id)) { msg('sys', L.already(oname(id))); return; }
    /* procedures take time and are done once; physician procedures are yours, nursing ones the nurse's */
    const PR = PROC[id];
    if (PR) {
      if (S.flags[PR.flag || id] || S.procs[id] != null) { msg(id === 'iv' ? 'nurse' : 'sys', id === 'iv' ? L.msgs.ivAlready : L.already(oname(id))); return; }
      S.log.push({ t: now(), id, p: JSON.parse(JSON.stringify(p)), ce: m.ce, gcs: m.GCS });
      S.procs[id] = now() + PR.min + (id === 'intub' && p.par === 'none' ? 6 : 0);
      if (id === 'intub' && p.par === 'none') S.later.push({ t: now() + 6, kind: 'you', text: L.msgs.intubFail });
      msg(PR.by === 'md' ? 'you' : 'nurse', PR.by === 'md' ? L.youStart(oname(id), PR.min) : L.nurseStart(oname(id), PR.min));
      renderSitu(); return;
    }
    S.log.push({ t: now(), id, p: JSON.parse(JSON.stringify(p)), ce: m.ce, gcs: m.GCS, w });
    const MS = L.msgs;
    switch (id) {
      case 'historyQ': msg('sys', `${L.history}: ${CT().history}`); break;
      case 'ventSet': m.ventSet = { tv: +p.tv, rr: +p.rr, peep: +p.peep, fio2: +p.fio2 }; msg('nurse', L.msgs.ventSet(ventTxt(m.ventSet))); break;
      case 'parents': parentTalk(); break;
      case 'examQ': msg('sys', `${L.exam}: ${now() < 20 ? CT().exam : (m.vent ? L.examVent(Math.min(m.GCS, 7), L.pupilsV[m.pupils], m.CRT) : L.examNow(Object.assign({}, m, { pupilsTxt: L.pupilsV[m.pupils], kuss: m.pCO2 < 26 && !m.vent, headache: m.headache && m.GCS >= 13, dry: m.defPct > 5, abd: m.pH < 7.2 })))}`); break;
      case 'weigh': S.flags.weighed = true; msg('nurse', MS.weighed(m.wt)); break;
      case 'monitor': S.flags.mon = true; msg('nurse', MS.monOn); break;
      case 'npo': S.flags.npo = true; msg('nurse', MS.npo); break;
      case 'headUp': m.headUp = true; msg('nurse', MS.headUp); break;
      case 'neuro': case 'io': S.standing[id] = { every: 60, next: now() + 60 }; msg('nurse', oname(id) + ' ✓'); break;
      case 'att': S.att.push(now()); msg('att', m.ce > 0.25 || (S.ceSignAt != null && m.ce > 0.05) ? MS.attCE : p.ins ? MS.attIns : MS.attGen); break;
      case 'picu': S.flags.picu = true; S.flags.picuAt = now() + 30; msg('sys', MS.picuReq); renderClock(); break;
      case 'endo': case 'surg': { S.flags[id] = true; const cs = (CT().consult || {})[id]; msg('sys', L.consCalled(oname(id), cs ? cs.min : 30)); if (cs) S.later.push({ t: now() + cs.min, kind: 'cons', text: did('dmw') && cs.textSent ? cs.textSent : cs.text }); break; }
      case 'ward': S.flags.ward = true; S.flags.picuAt = null; S.flags.wardAt = now() + 30; msg('sys', MS.wardReq); renderClock(); break;
      case 'o2': S.flags.o2 = true; msg('nurse', oname(id) + (p.mode ? ` (${EXTRA[LANG].modes[p.mode]})` : '') + ' ✓'); break;
      case 'ct': if (m.ce > 0.3 && !(m.mannitol.concat(m.hts)).some(d => now() - d.at < 120)) S.log[S.log.length - 1].early = true; msg('nurse', L.imgOrdered(oname('ct'))); addResult('ct', now() + LAB_DELAY.ct, { txt: m.ce > 0.2 ? MS.ctDone : MS.ctNormal }); break;
      case 'cxr': msg('nurse', L.imgOrdered(oname(id))); addResult(id, now() + LAB_DELAY[id], { txt: LANG === 'he' ? 'טכניקה: צילום חזה AP בשכיבה.\nממצאים: שדות ריאה נקיים, ללא תסנינים, ללא נוזל פלאורלי וללא חזה אוויר. צל לב ומצר בגודל תקין.\nסיכום: צילום חזה תקין.' : 'Technique: supine AP chest radiograph.\nFindings: clear lung fields; no consolidation, effusion or pneumothorax. Normal cardiomediastinal silhouette.\nImpression: normal chest radiograph.' }); break;
      case 'usabd': msg('nurse', L.imgOrdered(oname(id))); addResult(id, now() + LAB_DELAY[id], { txt: LANG === 'he' ? 'טכניקה: US בטן מלאה.\nממצאים: כבד, טחול, לבלב וכליות בגודל ובמבנה תקינים. ללא נוזל חופשי. התוספתן לא הודגם; ללא סימנים עקיפים לדלקת.\nסיכום: ללא ממצא חריג.' : 'Technique: complete abdominal ultrasound.\nFindings: normal liver, spleen, pancreas and kidneys. No free fluid. Appendix not seen; no indirect signs of inflammation.\nImpression: no abnormal findings.' }); break;
      case 'bolus': m.inf.boluses.push({ fluid: p.fluid, left: p.mlkg * w, mlMin: p.mlkg * w / Math.max(5, p.over) }); msg('nurse', `${oname(id)}: ${L.fl[p.fluid]} ${Math.round(p.mlkg * w)} ${L.ml} / ${p.over} ${L.min}`); break;
      case 'main': m.inf.main = { base: p.base, dex: +p.dex, kcl: +p.kcl, rate: +p.rate }; S.mainHist = (S.mainHist || []).concat({ t: now(), rate: +p.rate }); msg('nurse', `${oname(id)}: ${L.fl[p.base]}${+p.dex ? ` + D${p.dex}%` : ''}${+p.kcl ? ` + KCl ${p.kcl}` : ''} · ${p.rate} ${L.mlh}`); break;
      case 'insDrip': m.inf.insulin = +p.dose; msg('nurse', `${oname(id)}: ${p.dose} ${L.f.ukgh} = ${r1(p.dose * w)} ${L.uh}`); break;
      case 'insBolus': m.Ieff += +p.dose || 0.1; m.ceRisk += 1.5; msg('nurse', `${MS.insBolus} (${r1((+p.dose || 0.1) * w)} ${L.u})`); break;
      case 'scRapid': case 'scBasal': m.sc.push({ at: now(), kind: id, dose: +p.dose }); msg('nurse', `${oname(id)}: ${MS.scGiven} (${p.dose} ${L.f.ukg} = ${r1(p.dose * w)} ${L.u})`); break;
      case 'stopDrip': m.inf.insulin = 0; msg('nurse', MS.dripStopped); break;
      case 'mannitol': case 'hts': {
        const vol = id === 'mannitol' ? p.gkg * 5 * w : p.mlkg * w;
        (id === 'mannitol' ? m.mannitol : m.hts).push({ at: now() });
        if (id === 'mannitol') { m.manVol = vol; m.manUntil = now() + 120; } else { m.htsVol = vol; m.NaC += vol * 0.513 / (0.6 * m.wt0); }
        if (m.ceOn != null) m.ceDrive = (m.ceDrive ?? 1) * (m.ceRisk < 1.5 ? 0.15 : 0.5);
        msg('nurse', id === 'mannitol' ? MS.man : MS.hts); break;
      }
      case 'bicarb': m.bicarbNow = 2 * p.meqkg; m.NaC += p.meqkg * w / (0.6 * m.wt0); m.ceRisk += 1.2; msg('nurse', MS.bicarb); break;
      case 'kpo': m.kPO = p.meqkg * w; msg('nurse', MS.kpo); break;
      case 'kphos': m.kPO = p.mmolkg * w * 1.47; m.Pdef = Math.max(0, m.Pdef - p.mmolkg * w); msg('nurse', MS.kphos); break;
      case 'dexBolus': m.G += p.mlkg * 50; msg('nurse', `${oname(id)}: ${Math.round(p.mlkg * w)} ${L.ml}`); break;
      case 'prbc': case 'ffp': case 'plt': case 'albumin': m.inf.boluses.push({ fluid: 'NS', left: p.mlkg * w, mlMin: p.mlkg * w / (id === 'albumin' ? 30 : 120) }); msg('nurse', `${oname(id)}: ${Math.round(p.mlkg * w)} ${L.ml}`); break;
      case 'ondan': msg('nurse', MS.ondan); break;
      case 'po': if (m.GCS < 14) { S.log[S.log.length - 1].refused = true; msg('nurse', MS.poDrowsy, true); break; }
        if (m.pH > 7.3 && m.HCO3 > 18) { S.later.push({ t: now() + 20, kind: 'nurse', text: MS.tray, tray: true }); msg('nurse', MS.trayOrdered); } else { S.log[S.log.length - 1].fail = true; msg('nurse', MS.poEarly); } break;
      default:
        if (LABS.includes(id)) {
          if (p.freq && +p.freq) { S.standing[id] = { every: p.freq * 60, next: now() }; msg('nurse', `${oname(id)}: ${L.every(+p.freq)}`); }
          else { if (LAB_DELAY[id]) msg('nurse', (['cxr', 'usabd', 'ct'].includes(id) ? L.imgOrdered : L.labSent)(oname(id))); drawLab(id); }
        } else msg('nurse', oname(id) + (p.mgkg ? `: ${p.mgkg} ${L.f.mgkg} = ${r1(p.mgkg * w)} mg` : p.mlkg ? `: ${Math.round(p.mlkg * w * 10) / 10} ${L.ml}` : ' ✓'));
    }
    renderSitu(); renderFlow(); renderStatus();
  }
  /* the tray: with rapid insulin in the last 30 min he eats now; otherwise he eats in 10 min (guided: the nurse asks first) */
  function trayCame(t) {
    const sc = S.log.filter(e => e.id === 'scRapid').pop(), MS = L.msgs;
    if (sc && t - sc.t <= 30) { S.flags.po = true; S.flags.poAt = t; msg('nurse', MS.po); return; }
    if (LEVEL === 'guided') msg('nurse', MS.trayAsk);
    S.later.push({ t: t + 10, kind: 'nurse', text: MS.po, eat: true });
  }
  function objection(id, p, text, who = 'att', chain, dyn) {
    msg(who, text, true);
    const md = modal(`<span class="eyebrow">${esc(who === 'nurse' ? L.nurseSays : L.attSays)} · ${esc(oname(id))}</span><p class="objq">${esc(text)}</p><div class="row"><button class="btn primary" data-cx>${esc(L.objCancel)}</button>${dyn === 'ins01' ? `<button class="btn ghost" data-callatt>${esc(L.callAtt)}</button>` : ''}<button class="btn ghost" data-go>${esc(L.objGo)}</button></div>`);
    md.el.addEventListener('click', e => {
      if (e.target.closest('[data-callatt]')) { md.close(); order('att', { ins: true }); order(id, Object.assign({}, p, { force: true })); return; }
      if (e.target.closest('[data-go]')) { md.close(); if (who === 'att') S.log.push({ t: now(), id: 'overrode', p: { k: id } }); order(id, chain ? p : Object.assign({}, p, { force: true })); }
      else if (e.target.closest('[data-cx]')) { md.close(); S.log.push({ t: now(), id: 'objected', p: { k: id, who, dyn } }); msg('sys', L.objDropped(oname(id), who)); renderSitu(); }
    });
  }
  function procDone(id) {
    const PR = PROC[id], m = S.m, he = LANG === 'he';
    S.flags[PR.flag || id] = true;
    if (id === 'intub') {
      const p = (S.log.filter(e => e.id === 'intub').pop() || {}).p || {};
      m.vent = true; S.flags.intubAt = now(); m.ventSet = p.tv ? { tv: p.tv, rr: p.rr, peep: p.peep, fio2: p.fio2 } : { tv: 7, rr: 22, peep: 5, fio2: 40 };
      if (p.sed === 'propofol' || p.sed === 'thio') m.bpDrop = 25; else if (p.sed === 'midaz') m.bpDrop = 8;
      if (p.par === 'sux') m.kBump = 0.6;
      msg('you', L.msgs.intubDone(ventTxt(m.ventSet)) + (LEVEL === 'guided' ? ' ' + L.msgs.intub : ''));
      if (!S.flags.mon) { S.flags.mon = true; S.flags.monAt = now(); msg('nurse', L.msgs.monVent); }
    }
    else msg(PR.by === 'md' ? 'you' : 'nurse', id === 'iv' ? L.msgs.ivIn : L.youDone(oname(id)));
    if (id === 'lp') addResult('csf', now() + 45, { txt: he ? `נוזל שדרה: לחץ פתיחה ${Math.round(14 + 30 * Math.max(0, m.ce - 0.15))} ס״מ מים. צלול. תאים ⁦2/µL⁩, חלבון 25 מ״ג/ד״ל, גלוקוז ${Math.round(m.G * 0.6)} מ״ג/ד״ל (כ-60% מהסוכר בדם, תקין). צביעת גראם: ללא חיידקים.` : `CSF: opening pressure ${Math.round(14 + 30 * Math.max(0, m.ce - 0.15))} cmH₂O. Clear. Cells 2/µL, protein 25 mg/dL, glucose ${Math.round(m.G * 0.6)} mg/dL (about 60% of blood glucose, normal). Gram stain: no organisms.` }, now());
    renderStatus(); renderSitu();
  }
  /* hemoglobin falls as the dehydration is corrected (hemoconcentration on arrival) */
  const hgb = () => r1(15.1 * (1 - 0.13 * Math.min(1, S.m.io.inTotal / 3000)));
  function drawLab(id, standing) {
    const m = S.m, he = LANG === 'he'; let v;
    if (['poc', 'vbg', 'chem', 'bhb'].includes(id)) v = M.labs(m, id);
    if (id === 'poc' && v.G > 600) v.G = 'HI';
    if (id === 'vbg') v.hb = hgb();
    else if (id === 'abg') { v = Object.assign(M.labs(m, 'vbg'), { arterial: true, hb: hgb() }); v.pCO2 = Math.max(10, v.pCO2 - 5); v.pH = Math.round((v.pH + 0.03) * 100) / 100; }
    else if (id === 'ecg') v = { hr: m.HR, k: m.K, ta: m.K > 6.5 ? 0.7 : m.K > 5.5 ? 0.45 : m.K < 3.2 ? 0.07 : m.K < 3.5 ? 0.15 : undefined, u: m.K < 3.2 ? 0.13 : m.K < 3.5 ? 0.06 : 0 };
    else if (id === 'cbc') v = { WBC: r1(18.2 - 7 * Math.min(1, m.t / 720)), NEU: 86, HGB: hgb(), HCT: Math.round(hgb() * 3), MCV: 82, PLT: 410, CRP: 0.6 };
    else if (id === 'coag') v = { PT: 12.4, INR: 1.0, PTT: 29, FIB: 310 };
    else if (id === 'lipase') v = { LIP: 48, AMY: 118 };
    else if (id === 'lft') v = { ALT: 22, AST: 30, BIL: 0.4, ALB: 4.4 };
    else if (id === 'dmw') { v = { A1C: 12.4, TSH: 2.1, TTG: 2 }; addResult('dmwab', now() + 4320, { txt: he ? 'Anti-GAD: חיובי · נוגדנים לאינסולין: חיובי · IA-2: חיובי · ZnT8: ממתין' : 'Anti-GAD: positive · Insulin autoantibodies: positive · IA-2: positive · ZnT8: pending' }, m.t); }
    else if (id === 'tns') v = { txt: he ? 'סוג דם A Rh+ · סקר נוגדנים שלילי · 2 מנות מוצלבות זמינות' : 'Blood group A Rh+ · antibody screen negative · 2 crossmatched units available' };
    else if (id === 'bcx') v = { txt: he ? 'בינתיים ללא צמיחה (דוח ביניים 24 שעות)' : 'No growth so far (24 h interim report)' };
    else if (id === 'ua') v = { txt: he ? 'צפיפות 1.030 · pH 5.0 · גלוקוז 4+ · קטונים 3+ · חלבון שלילי · דם שלילי · לויקוציטים שלילי · ניטריטים שלילי. תרבית: נשלחה.' : 'SG 1.030 · pH 5.0 · glucose 4+ · ketones 3+ · protein neg · blood neg · leukocytes neg · nitrite neg. Culture: sent.' };
    addResult(id, now() + (LAB_DELAY[id] ?? 30), v, m.t, standing);
  }
  function addResult(kind, ready, v, drawn, st) { const r = { kind, drawn: drawn ?? now(), ready, v, st, loc: S.flags.loc }; S.res.push(r); renderChips(); if (ready <= now()) { r.seen = true; r.at = now(); resultArrived(r); } }

  /* ---------------- time loop ---------------- */
  function stopLoop() { clearInterval(timer); timer = null; }
  function loop() {
    stopLoop();
    timer = setInterval(() => {
      if (!S || S.ended) return;
      if (!S.speed) { renderStatus(); return; }
      S.acc += (S.m.arrestAt != null || (S.m.acidMin || 0) > 8 ? Math.min(S.speed, 0.1) : S.speed) * 0.1;
      let n = Math.floor(S.acc); S.acc -= n;
      while (n-- > 0 && S.speed && !S.ended) minute();
      renderLive();
    }, 100);
  }
  function minute() {
    if (!S || S.ended) return;
    const m = S.m; M.step(m, 1); const t = m.t;
    const due = S.later.filter(x => t >= x.t); S.later = S.later.filter(x => t < x.t);
    due.forEach(x => { if (x.loc) S.flags.loc = x.loc; if (x.eat) { S.flags.po = true; S.flags.poAt = t; } msg(x.kind, x.text, x.crit); if (x.tray) trayCame(t); });
    /* standing orders */
    Object.entries(S.standing).forEach(([k, o]) => {
      if (t < o.next) return; o.next += o.every;
      if (k === 'neuro') addResult('neuro', t + 2, { GCS: m.vent ? `${Math.min(m.GCS, 7)}T` : m.GCS, pupils: m.pupils }, t);
      else if (k === 'io') addResult('io', t + 1, { IN: Math.round(m.io.lastHourIn), OUT: Math.round(m.io.lastHourOut), UO: r1(m.io.lastHourOut / m.wt) }, t);
      else drawLab(k, true);
    });
    /* results arriving */
    S.res.forEach(r => { if (!r.seen && r.ready <= t) { r.seen = true; r.at = t; resultArrived(r); } });
    if (S.flags.mon && !S.nbp.busy && t >= S.nbp.next) nbpStart();
    Object.entries(S.procs).forEach(([id, end]) => { if (t >= end) { delete S.procs[id]; procDone(id); } });
    [['PICU', 'picu'], ['WARD', 'ward']].forEach(([to, k]) => { if (S.flags[k + 'At'] != null && t >= S.flags[k + 'At'] && S.flags.loc !== to && !$('.bedq') && (!S.flags[k + 'Ask'] || t - S.flags[k + 'Ask'] >= 15)) bedReady(to); });
    events();
    if (m.dead) { msg('nurse', m.vent ? L.msgs.diedVent : L.msgs.died, true); endCase(); }
  }
  /* every result is announced; it also goes into the flow sheet */
  const RES_KEYS = ['G', 'pH', 'pCO2', 'HCO3', 'Na', 'K', 'Cl', 'AG', 'BUN', 'Cr', 'Ca', 'P', 'Mg', 'BHB', 'lact'];
  function resultArrived(r) {
    renderFlow(); renderChips();
    /* critical values are phoned by the lab (once per value type every 2 h) */
    if (r.v && r.kind !== 'poc' && r.kind !== 'bhb') {
      const v = r.v, crit = [typeof v.K === 'number' && (v.K < 3 || v.K > 6) && `K ${v.K}`, typeof v.G === 'number' && now() > 30 && (v.G < 50 || v.G > 500) && `${L.flow.G} ${v.G}`, typeof v.pH === 'number' && now() > 30 && v.pH < 7.0 && `pH ${v.pH}`, typeof v.Na === 'number' && (v.Na < 125 || v.Na > 155) && `Na ${v.Na}`].filter(Boolean);
      crit.forEach(c => once('crit' + c.split(' ')[0] + Math.floor(now() / 120), true, () => S.later.push({ t: now() + 1, kind: 'lab', text: L.msgs.critVal(c), crit: true })));
    }
    /* at the guided level the nurse points out the two decisions the protocol turns on */
    if (LEVEL === 'guided' && r.v && S.m.inf.main.rate) {
      const mn = S.m.inf.main;
      if (typeof r.v.K === 'number' && r.v.K > 5.5 && mn.kcl > 0 && !S.fired['gK' + mn.kcl + Math.floor(now() / 120)] && (S.fired['gK' + mn.kcl + Math.floor(now() / 120)] = true)) S.later.push({ t: now() + 1, kind: 'nurse', text: L.msgs.gKhigh(r.v.K, mn.kcl) });
      if (typeof r.v.G === 'number' && r.v.G < 300 && mn.dex === 0 && !S.fired.gD5 && (S.fired.gD5 = true)) S.later.push({ t: now() + 1, kind: 'nurse', text: L.msgs.gD5(r.v.G) });
      else if (typeof r.v.G === 'number' && r.v.G > 300 && mn.dex >= 10 && !S.fired['gDd' + mn.dex] && (S.fired['gDd' + mn.dex] = true)) S.later.push({ t: now() + 1, kind: 'nurse', text: L.msgs.gDdown(r.v.G, mn.dex) });
      else if (typeof r.v.G === 'number' && r.v.G < 180 && mn.dex > 0 && mn.dex < 10 && !S.fired['gD10' + mn.dex] && (S.fired['gD10' + mn.dex] = true)) S.later.push({ t: now() + 1, kind: 'nurse', text: L.msgs.gD10(r.v.G, mn.dex) });
    }
    if (!r.v || r.kind === 'neuro' || r.kind === 'io') return;
    const ix = S.res.indexOf(r), short = r.kind === 'ecg' ? RV.ecgText(r.v, LANG === 'he').interp : r.v.txt != null ? '' : RES_KEYS.filter(k => r.v[k] != null).map(k => `${L.flow[k]} ${r.v[k]}`).join(' · ');
    msg('lab', `${oname(r.kind)}${short ? ': ' + short : ` · ${L.ready}`}`, false, ix);
    if (['poc', 'bhb', 'ecg'].includes(r.kind) && !S.bulk && !r.st && !$('.scrim')) showResult(r);   // bedside tests are shown at the bedside, like the PALS printout
  }
  function once(key, cond, fn) { if (!S.fired[key] && cond) { S.fired[key] = true; fn(); } }
  function events() {
    const m = S.m, MS = L.msgs, t = m.t, clock = (C.startClock + t) % 1440;
    once('thirsty', t >= 300 && m.G > 200 && m.GCS >= 14, () => msg('nurse', MS.thirsty, true));
    if (LEVEL === 'guided' && m.inf.insulin > 0 && m.inf.insulin < 0.045 && m.ce < 0.2 && m.G > 300) { const os = m.mannitol.concat(m.hts).map(d => d.at).pop(); if (os != null && t - os > 120) once('insBack', true, () => msg('nurse', MS.insBack(m.inf.insulin, Math.round(m.G)), true)); }
    if (LEVEL === 'guided' && t >= 45) once('noFluids', !did('bolus') && !did('main'), () => msg('nurse', MS.noFluids, true));
    if (LEVEL === 'guided' && t >= 30) once('labsAsk', !['vbg', 'abg', 'chem', 'poc'].some(did), () => msg('nurse', MS.labsAsk, true));
    once('headache', m.ce > 0.12, () => { S.ceSignAt = S.ceSignAt ?? t; if (!m.vent) msg('nurse', MS.headache, true); });
    { const hr0 = Math.max(...m.hist.filter(h => h.t >= t - 120).map(h => h.HR), m.HR); once('hrDrop', m.ce > 0.32 && (hr0 - m.HR >= 20 || m.ce > 0.5), () => { S.ceCritAt = t; S.ceBase = { hr: m.HR, gcs: m.GCS, t }; msg('nurse', (m.vent ? MS.hrDropVent : m.GCS < 9 ? MS.hrDropComa : MS.hrDrop)(hr0, m.HR), true); }); }
    once('pupils', m.ce > 0.58, () => msg('nurse', m.vent ? MS.pupilsVent : MS.pupils, true));
    if (S.flags.mon) {
      if (m.K < 3.2) once('kLow' + Math.floor(t / 240), true, () => msg('nurse', MS.kLow, true));
      if (m.K > 6.5) once('kHigh', true, () => msg('nurse', MS.kHigh, true));
    }
    if (m.G < 70) once('hypo' + Math.floor(t / (m.G < 50 ? 20 : 120)), true, () => msg('nurse', (m.vent || m.GCS < 9 ? MS.hypoComa : m.G >= 55 && m.GCS >= 15 ? MS.hypoMild : MS.hypo)(Math.round(m.G)), true));
    if (m.G < 40 && !m.vent && t - (S.lastSz ?? -99) >= 30) { S.lastSz = t; msg('nurse', MS.seizure(Math.round(m.G)), true); }
    /* while the brain is swelling: new calls on a further HR fall or a GCS drop, and every 30 min if it is left untreated */
    if (S.ceCritAt != null && m.ce > 0.3) {
      const b = S.ceBase || (S.ceBase = { hr: m.HR, gcs: m.GCS, t });
      if (b.hr - m.HR >= 15 || b.gcs - m.GCS >= 2 || (t - b.t >= 30 && !m.mannitol.concat(m.hts).some(d => t - d.at < 90))) { S.ceBase = { hr: m.HR, gcs: m.GCS, t }; msg('nurse', MS.ceAgain(m.HR, m.vent ? `${Math.min(m.GCS, 7)}T` : m.GCS, L.pupilsV[m.pupils], m.SBP), true); }
    }
    if ((m.vent || m.arrestAt != null || m.GCS <= 8 || m.pupils !== 'normal') && S.flags.loc === 'ED' && !S.flags.picuAt) once('needPicu', true, () => msg('nurse', MS.needPicu, true));
    if (!m.vent && m.arrestAt == null && (m.RR < 9 || m.SpO2 < 92) && S.flags.mon) once('resp' + Math.floor(t / 20), true, () => msg('nurse', MS.respLow(m.RR, m.SpO2), true));
    if (m.vent && m.ventSet && S.flags.mon) {
      const ex = m.pCO2 - m.pCO2tgt;
      if (ex > 8) once('etHi' + Math.floor(t / 30), true, () => msg('nurse', MS.etco2Hi(Math.round(m.pCO2 - 3), m.pH < 7 ? Math.round(m.SBP) : null, S.etLast == null || m.pCO2 - S.etLast > 2, S.etLast = m.pCO2) + (LEVEL === 'guided' ? ' ' + MS.etco2G(Math.round(m.pCO2tgt)) : ''), true));
      else if (ex < -8) once('etLo' + Math.floor(t / 60), true, () => msg('nurse', MS.etco2Lo(Math.round(m.pCO2 - 3))));
    }
    once('parQ1', t >= 20 && !m.vent && !S.flags.parTalked, () => msg('par', MS.parQ1));
    once('parCE', m.ce > 0.07 && !m.vent && m.GCS > 8, () => { S.ceSignAt = S.ceSignAt ?? t; msg('par', MS.parCE, true); });
    once('parThirst', t >= 150 && S.flags.npo && m.ce < 0.07 && !S.flags.po, () => { S.flags.parThirstAt = t; msg('par', MS.parThirst); });
    if ((m.acidMin || 0) > 8) once('acidBrady' + Math.floor(t / 40), true, () => msg('nurse', MS.acidBrady(m.HR, m.SBP), true));
    if (m.arrestAt != null) once('arrest' + m.arrestAt, true, () => msg('nurse', (m.vent ? MS.periArrestVent : MS.periArrest)(m.HR), true));
    if (m.inf.main.dex > 0 && m.G > 400 && S.flags.mon && t - (S.lastHyperG ?? -99) >= 60) once('hyperG' + (S.lastHyperG = t), true, () => msg('nurse', MS.hyperG(Math.round(m.G), m.inf.main.dex), true));
    if (t % 60 === 0) { S.uoLow = m.io.lastHourOut / m.wt < 0.5 ? S.uoLow + 1 : 0; if (S.uoLow >= 2) once('lowUO', true, () => msg('nurse', MS.lowUO, true)); }
    once('breakfast', clock >= 7 * 60 + 30 && clock < 12 * 60 && m.pH > 7.3 && m.HCO3 > 18 && m.GCS >= 14 && !m.vent, () => msg('nurse', MS.breakfast + (LEVEL === 'guided' ? ' ' + MS.breakfastG : ''), true));
    /* the case ends once he is on subcutaneous insulin, the drip is off and he has eaten */
    if (did('scRapid') && m.inf.insulin === 0 && S.flags.po && m.pH > 7.3 && t - Math.max(firstT('scRapid'), firstT('stopDrip') ?? 0) >= 60) endCase();
    if (C.shiftEnd != null && !S.flags.shiftAsked && t > 0 && clock === C.shiftEnd) handover();
    if (t >= 24 * 60) endCase();
  }
  /* a bed being ready is not the move: the nurse asks first, and asks again in 15 min if you wait */
  function bedReady(to) {
    const k = to === 'PICU' ? 'picu' : 'ward', MS = L.msgs; S.flags[k + 'Ask'] = now(); renderClock();
    if (S.bulk) { moveTo(to); return; }
    msg('nurse', MS[k + 'ReadyQ'], true);
    const md = modal(`<span class="eyebrow">${esc(L.nurseSays)} · ${hhmm(C.startClock + now())}</span><p>${esc(MS[k + 'ReadyQ'])}</p><div class="row"><button class="btn primary" data-go>${esc(MS[k + 'Go'])}</button><button class="btn ghost" data-later>${esc(MS.picuLater)}</button></div>`, 'bedq');
    md.el.onclick = e => {
      if (e.target.closest('[data-go]')) { md.close(); moveTo(to); }
      else if (e.target.closest('[data-later]')) { md.close(); msg('nurse', MS.picuWait); }
    };
  }
  function moveTo(to) { if (S.ended) return; S.flags.loc = to; S.flags[to === 'PICU' ? 'picuMovedAt' : 'wardMovedAt'] = now(); msg('sys', to === 'PICU' ? L.msgs.picuIn : L.msgs.wardIn); renderClock(); }
  function parentTalk() {
    const m = S.m, MS = L.msgs, first = !S.flags.parTalked; S.flags.parTalked = true;
    const thirst = S.flags.parThirstAt != null && !S.flags.parThirstAns && !first; if (thirst) S.flags.parThirstAns = true;
    msg('par', m.vent ? MS.parVent : m.ce > 0.07 && m.GCS > 8 ? MS.parTalkCE : first ? MS.parTalk1 : thirst ? MS.parTalkThirst : MS.parTalkLater);
  }
  function handover() {
    S.flags.shiftAsked = true;
    const sp = S.speed, m = S.m, g = S.res.filter(r => r.ready <= now() && typeof (r.v || {}).pH === 'number').pop(), MS = L.msgs;
    const left = [m.inf.insulin > 0 && MS.hoDrip(m.inf.insulin), g && !(g.v.pH > 7.3 && g.v.HCO3 > 18) && MS.hoAcid(g.v.pH, g.v.HCO3), !S.flags.po && MS.hoMeal].filter(Boolean);
    S.speed = 0; $$('.scrim').forEach(x => x.remove());
    const md = modal(`<span class="eyebrow">${hhmm(C.startClock + now())}</span><h2>${esc(MS.hoT)}</h2><p>${esc(MS.hoP)}</p>${left.length ? `<ul class="holeft">${left.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}<div class="row"><button class="btn primary" data-ho>${esc(MS.hoEnd)}</button><button class="btn ghost" data-stay>${esc(MS.hoStay)}</button></div>`);
    md.el.onclick = e => {
      if (e.target.closest('[data-ho]')) { md.close(); S.handover = now(); endCase(); }
      else if (e.target.closest('[data-stay]')) { md.close(); S.speed = sp || 1; msg('sys', MS.hoStayed); renderStatus(); }
    };
  }

  /* ---------------- rendering (the PALS resus-bay look) ---------------- */
  const ICON = (n) => UI.ICA[n] || UI.ICA.drugSyr;
  const zoneOf = w => w < 6 ? ['grey', 'Grey'] : w < 8 ? ['pink', 'Pink'] : w < 10 ? ['red', 'Red'] : w < 12 ? ['purple', 'Purple'] : w < 15 ? ['yellow', 'Yellow'] : w < 19 ? ['white', 'White'] : w < 24 ? ['blue', 'Blue'] : w < 30 ? ['orange', 'Orange'] : w <= 36 ? ['green', 'Green'] : ['adult', 'Adult'];
  const ZONE_HE = { grey: 'אפור', pink: 'ורוד', red: 'אדום', purple: 'סגול', yellow: 'צהוב', white: 'לבן', blue: 'כחול', orange: 'כתום', green: 'ירוק' };
  function renderSim() {
    const m = S.m, he = LANG === 'he';
    app.innerHTML = `<div class="sim">
    <div class="simbar"><div class="in">
      <button class="iconbtn" data-home aria-label="${esc(L.home)}">${he ? '›' : '‹'}</button>
      <div class="ttl"><b>${esc(CT().title)}</b><span><i class="lvtag lv${LEVEL === 'guided' ? 1 : 3}">${esc(L[LEVEL])}</i> ${esc(m.age)}${he ? ' שנים' : 'y'} · <span id="ttlWt">${S.flags.weighed ? m.wt : '?'}</span> ${he ? 'ק״ג' : 'kg'} · <span id="loc"></span></span></div>
      <div class="clock"><small>${esc(L.since)}</small><b id="since">0:00</b></div>
      <div class="clock"><small>${esc(L.clock)}</small><b id="clk"></b></div>
      <button class="clock gasb" id="gasBox" data-gasv hidden><small>${esc(L.gasChip)}</small><b id="gasV">pH</b></button>
      <button class="clock gasb" id="labBox" data-labv hidden><small>${esc(L.labChip)}</small><b id="labV">0</b></button>
      <div class="speed" role="group" aria-label="${esc(L.speed)}">${[0.5, 1, 5, 15].map(x => `<button class="sp" data-sp="${x}" title="${esc(L.perSec(x))}">▶${x === 0.5 ? '½' : x > 1 ? '×' + x : ''}</button>`).join('')}</div>
      <button class="iconbtn" data-snd aria-label="${esc(L.sound)}">${UI.sound ? '🔊' : '🔇'}</button>
      <button class="btn ghost sm" data-lang>${esc(L.lang)}</button><button class="btn ghost sm" data-end>${esc(L.endCase)}</button>
    </div></div>
    <div class="simgrid">
      <section class="bay">
        <div class="monitor imv" id="mon">
          <div class="mhd"><span class="mbed" id="mbed"></span><span class="malm" id="mAlm"></span><span class="mtmp">T <b id="vT">--</b> °C</span><button class="msil" id="mSil" type="button">${esc(L.silence)}</button><span class="mclk" id="mClk"></span></div>
          <div class="mmain">
            <canvas id="cv"></canvas>
            <div class="nums">
              <div class="nb" style="--vc:var(--ecg)"><div class="nl"><span>HR</span><i>160<br>70</i></div><b id="vHR">--</b></div>
              <div class="nb" style="--vc:var(--spo2)"><div class="nl"><span>SpO₂</span><i>100<br>90</i></div><b id="vSp">--</b><span class="pr">Pulse <em id="vPR">--</em></span></div>
              <div class="nb" style="--vc:var(--rr)"><div class="nl"><span>RR</span><i>30<br>12</i></div><b id="vRR">--</b></div>
              <div class="nb co2" style="--vc:var(--co2)"><div class="nl"><span>EtCO₂</span><i>mmHg</i></div><b id="vCO">--</b></div>
            </div>
            <div class="nosignal" id="nosig"><div><b>${esc(L.noMon)}</b>${esc(L.attachHint)}</div></div>
          </div>
          <div class="mnbp" id="wBP" style="--vc:var(--bp)" role="button" tabindex="0"><span class="nl"><span>NBP</span><i id="nbpI">Auto 15 min</i></span><span class="nbpst" id="nbpSt">START</span><b id="vBP">--</b><em id="vMAP"></em></div>
        </div>
        <div class="patient">
          <div class="pt" id="pt">${UI.patientSVG('child')}</div>
          <div class="ptinfo">
            <div id="ptZone"></div>
            <div class="who">${esc(he ? `בן ${m.age}` : `${m.age}-year-old boy`)}</div>
            <div class="look" id="look"></div>
            <div class="flags" id="flags"></div>
          </div>
          <div class="ptacts" id="ptacts">${bedHTML()}</div>
        </div>
      </section>
      <section class="console">
        <div class="situ" id="situ"></div>
        <div class="cart" id="cart">${cartHTML()}</div>
        <details class="recorder" open><summary><span>${esc(L.flowT)}</span><span id="flowN"></span></summary><div class="flow" id="flow"></div></details>
        <details class="recorder" open><summary><span>${esc(L.txT)}</span><span id="txN"></span></summary><ol id="txL"></ol></details>
        <details class="recorder"><summary><span>${esc(L.logT)}</span><span id="logN"></span></summary><ol id="recL"></ol></details>
      </section>
    </div></div>`;
    MON = new UI.Monitor($('#cv'), { sweep: 3.5, full: true, onBeat: k => { if (S && S.flags.mon && S.speed && k === 'pleth') UI.Sound.pulseTone(S.m.SpO2); } });
    app.onclick = onClick;
    const nbpGo = () => { if (S && S.flags.mon && !S.nbp.busy) { UI.Sound.ensure(); nbpStart(); } };
    $('#wBP').addEventListener('click', nbpGo);
    $('#mSil').addEventListener('click', () => { S.silUntil = performance.now() + 120000; renderLive(); });
    setTab(S.tab || 'drug'); renderSitu(); renderFlow(); renderFeed(); renderLive();
  }
  function bedHTML() {
    const btn = (id, cls) => `<button class="pa ${cls}" data-o="${id}"><span class="ai">${ICON(BED_ICON[id])}</span><span class="at"><b>${esc(oname(id))}</b></span></button>`;
    return `<div class="pabig">${BED.big.map(id => btn(id, 'big')).join('')}</div><div class="pasm">${BED.sm.map(id => btn(id, 'sm')).join('')}</div>`;
  }
  function cartHTML() {
    const G = L.groups, F = L.groupsFull;
    return `<div class="cartviz" role="tablist">
    <div class="cartbody">
      <button class="stn stn-pole" role="tab" data-tab="line" aria-label="${esc(F.line)}">${UI.CART_ART.pole}<span class="vh">${esc(G.line)}</span></button>
      <div class="cbody">
        <div class="stn stn-mon" data-tab="mon">${UI.CART_ART.mon}<button class="mhot mscreen" role="tab" data-tab="mon" style="left:5.8%;top:20.6%;width:94%;height:67.4%" aria-label="${esc(F.mon)}"></button><span class="stl">${esc(G.mon)}</span></div>
        <div class="drawers">${['drug', 'line', 'air', 'lab'].map((id, i) => `<button class="stn drawer" role="tab" data-tab="${id}"><span class="dn">${i + 1}</span><span class="dlab">${esc(G[id])}</span>${i === 0 ? '<i class="seal" aria-hidden="true"></i>' : ''}<i class="handle" aria-hidden="true"></i></button>`).join('')}</div>
        <div class="wheels" aria-hidden="true"><i></i><i></i></div>
      </div>
      <button class="stn stn-side" role="tab" data-tab="air" aria-label="${esc(F.air)}">${UI.CART_ART.side}<span class="vh">${esc(G.air)}</span></button>
    </div></div>
    <div class="tray" id="tray"><div class="trayhd" id="trayHd"></div><div id="grid"></div></div>`;
  }
  function setTab(tab) {
    S.tab = tab;
    $$('#cart [data-tab]').forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $('#tray').className = 'tray t-' + tab; $('#trayHd').textContent = L.groupsFull[tab];
    const g = $('#grid');
    if (tab === 'mon') { g.className = 'cartgrid'; g.innerHTML = ITEMS.mon.map(([id, ic]) => `<button class="cbtn" data-o="${id}"><span class="ai">${ICON(ic)}</span><span class="at"><b>${esc(oname(id))}</b></span></button>`).join(''); return; }
    g.className = 'ritems';
    g.innerHTML = ITEMS[tab].map(it => `<button class="ritem k-${it.kind}" data-o="${it.o}" title="${esc(oname(it.o === 'bolusNS' || it.o === 'bolusLR' ? 'bolus' : it.o))}"><span class="rpic">${itemPic(it)}</span><span class="rlabel" dir="ltr" lang="en" style="--cap:${it.cap || '#9aa7ad'}"><b>${esc(it.name)}</b><i>${esc(it.conc)}</i>${it.pack ? `<i>${esc(it.pack)}</i>` : ''}</span>${LEVEL === 'guided' ? `<span class="rcap">${esc(oname(it.o === 'bolusNS' || it.o === 'bolusLR' ? 'bolus' : it.o))}</span>` : ''}</button>`).join('');
  }
  function onClick(e) {
    const sp = e.target.closest('[data-sp]'); if (sp) { S.speed = +sp.dataset.sp; UI.Sound.ensure(); renderClock(); return; }
    if (e.target.closest('[data-snd]')) { UI.sound = !UI.sound; e.target.closest('[data-snd]').textContent = UI.sound ? '🔊' : '🔇'; return; }
    const tb = e.target.closest('[data-tab]'); if (tb) { setTab(tb.dataset.tab); return; }
    if (e.target.closest('[data-home]')) { if (S && !S.ended) { const md = modal(`<p>${esc(L.leaveQ)}</p><div class="row"><button class="btn primary" data-y>${esc(L.yes)}</button><button class="btn ghost" data-n>${esc(L.no)}</button></div>`); md.el.onclick = ev => { if (ev.target.closest('[data-y]')) { md.close(); home(); } else if (ev.target.closest('[data-n]')) md.close(); }; } else home(); return; }
    if (e.target.closest('[data-end]')) { const md = modal(`<p>${esc(L.endQ)}</p><div class="row"><button class="btn primary" data-y>${esc(L.yes)}</button><button class="btn ghost" data-n>${esc(L.no)}</button></div>`); md.el.onclick = ev => { if (ev.target.closest('[data-y]')) { md.close(); endCase(); } else if (ev.target.closest('[data-n]')) md.close(); }; return; }
    const st = e.target.closest('[data-stop]'); if (st) { stopOrder(st.dataset.stop); return; }
    const rs = e.target.closest('[data-res]'); if (rs) { const r = S.res[+rs.dataset.res]; GAS_KINDS.includes(r.kind) ? gasView(gases().indexOf(r)) : RV.CUM_KINDS.includes(r.kind) && !r.v.txt ? labList(+rs.dataset.res) : showResult(r); return; }
    if (e.target.closest('[data-gasv]')) { gasView(); return; }
    if (e.target.closest('[data-labv]')) { labList(); return; }
    const ob = e.target.closest('[data-o]'); if (ob) openForm(ob.dataset.o, ob);
  }
  function renderClock() {
    if (!S) return;
    const c = $('#clk'); if (c) c.textContent = hhmm(C.startClock + now());
    const sn = $('#since'); if (sn) sn.textContent = dur(now());
    $$('[data-sp]').forEach(b => b.classList.toggle('on', +b.dataset.sp === S.speed));
    $$('[data-o="picu"]').forEach(b => { b.disabled = !!S.flags.picuAt || S.flags.loc === 'PICU'; }); $$('[data-o="ward"]').forEach(b => { b.disabled = S.flags.wardAt != null || S.flags.loc === 'WARD'; });
    const lc = $('#loc'); if (lc) { const lo = S.flags.loc; lc.textContent = (lo === 'PICU' ? L.bedPICU : lo === 'WARD' ? L.loc.WARD : L.bedED) + (lo !== 'WARD' && S.flags.wardAt != null ? ' · ' + (S.flags.wardAsk ? L.locWardReady : L.locWard) : lo === 'ED' && S.flags.picuAt ? ' · ' + (S.flags.picuAsk ? L.locReady : L.locWait) : ''); lc.className = 'locp loc-' + lo; }
    const mb = $('#mbed'); if (mb) mb.textContent = S.flags.loc === 'PICU' ? L.bedPICU : S.flags.loc === 'WARD' ? L.loc.WARD : L.bedED;
    const mc = $('#mClk'); if (mc) mc.textContent = hhmm(C.startClock + now());
    renderChips();
  }
  /* top-bar chips: the latest blood gas, and the lab results (ready / ordered); they light up while something new is unread */
  const GAS_KINDS = ['vbg', 'abg'];
  const gases = () => S.res.filter(r => GAS_KINDS.includes(r.kind) && r.ready <= now());
  const labs = () => S.res.filter(r => RV.CUM_KINDS.includes(r.kind) && !GAS_KINDS.includes(r.kind));
  function renderChips() {
    const gb = $('#gasBox'), lb = $('#labBox'); if (!gb || !lb) return;
    const g = gases(), l = labs(), lr = l.filter(r => r.ready <= now());
    gb.hidden = !g.length; lb.hidden = !l.length;
    if (g.length) { $('#gasV').textContent = (+g[g.length - 1].v.pH).toFixed(2); gb.classList.toggle('new', g.some(r => !r.viewed)); }
    if (l.length) { $('#labV').textContent = `${lr.length}/${l.length}`; lb.classList.toggle('new', lr.some(r => !r.viewed)); }
  }
  /* the results list, like the hospital system: every test ordered, newest first; ready ones open */
  /* the cumulative lab window, like the hospital system: one column per sample time, newest first */
  const caseDate = t => { const d = new Date(S.date0 + (C.startClock + t) * 60000), z = n => String(n).padStart(2, '0'); return { d: `${z(d.getDate())}/${z(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`, D: `${z(d.getDate())}/${z(d.getMonth() + 1)}/${d.getFullYear()}`, h: `${z(d.getHours())}:${z(d.getMinutes())}` }; };
  const ptLine = () => { const he = LANG === 'he'; return `${he ? 'ילד' : 'Boy'}, ${S.m.age} ${he ? 'שנים' : 'y'}${S.flags.weighed ? ` · ${S.m.wt} ${he ? 'ק״ג' : 'kg'}` : ''}`; };
  function labList(hlIx, filter) {
    const he = LANG === 'he', t = now(), by = {};
    const ts = [...new Set(S.res.filter(r => RV.CUM_KINDS.includes(r.kind)).map(r => r.drawn))].sort((a, b) => a - b), key = {};
    ts.forEach((x, i) => { key[x] = i && x - ts[i - 1] <= 5 ? key[ts[i - 1]] : x; });   // tubes drawn within a few minutes share a column
    S.res.forEach((r, ix) => { if (!RV.CUM_KINDS.includes(r.kind)) return; (by[key[r.drawn]] = by[key[r.drawn]] || []).push({ kind: r.kind, v: r.v, pend: r.ready > t, ix }); if (r.ready <= t) r.viewed = true; });
    const hlT = hlIx != null ? key[S.res[hlIx].drawn] : null;
    const cols = Object.keys(by).map(Number).sort((a, b) => b - a).map(dt => Object.assign(caseDate(dt), { t: dt, rs: by[dt], hl: dt === hlT }));
    renderChips();
    const ctx = { he, pt: ptLine(), name: oname, filter };
    const md = modal(`${RV.cumulative(cols, ctx)}<div class="row"><button class="btn primary" data-x>${esc(L.back)}</button></div>`, 'chamw');
    $('[data-chf]', md.el).addEventListener('change', e => { const v = +e.target.value; md.close(); labList(hlIx, v < 0 ? undefined : v); });
    md.el.addEventListener('click', e => {
      const tr = e.target.closest('[data-tr]'); if (tr) { const box = $('.ch-trend', md.el); box.innerHTML = RV.trend(cols, tr.dataset.tr, ctx); box.hidden = false; return; }
      if (e.target.closest('[data-trx]')) { $('.ch-trend', md.el).hidden = true; return; }
      const d = e.target.closest('[data-ri]'); if (d) { md.close(); showResult(S.res[+d.dataset.ri], { back: () => labList(hlIx, filter) }); return; }
      if (e.target.closest('[data-x]') || e.target === md.el) md.close();
    });
  }
  function gasView(i) { const g = gases(); if (!g.length) return; i = i ?? g.length - 1; showResult(g[i], { nav: [i, g.length, gasView] }); }
  /* non-invasive BP: measures every 15 minutes of case time and on demand; the cuff cycle runs in real seconds */
  function nbpStart() { const n = S.nbp; n.busy = true; n.t0 = performance.now(); n.peak = Math.round(S.m.SBP + 30); n.step = 0; UI.Sound.cuffPump(3); }
  function nbpTick() {
    const n = S.nbp; if (!n.busy) return;
    const el = (performance.now() - n.t0) / 1000;
    if (el < 3) { n.cuff = Math.round(n.peak * el / 3); return; }
    const k = Math.min(9, Math.floor((el - 3) / 0.6)); if (k > n.step) { n.step = k; UI.Sound.cuffStep(); }
    n.cuff = Math.round(n.peak - (n.peak - S.m.DBP + 10) * k / 9);
    if (el >= 8.5) { n.busy = false; n.v = { s: S.m.SBP + Math.round((Math.random() - 0.5) * 4), d: S.m.DBP + Math.round((Math.random() - 0.5) * 4) }; n.at = hhmm(C.startClock + now()); n.next = now() + 15; UI.Sound.cuffDone(); }
  }
  function renderLive() { renderClock(); renderStatus(); }
  function renderStatus() {
    if (!S || !$('#vHR')) return;
    const m = S.m, on = !!S.flags.mon, n = S.nbp;
    nbpTick();
    $('#nosig').hidden = on;
    $('#mon').classList.toggle('capno', on && !!m.vent);
    const ta = m.K > 6.5 ? 0.7 : m.K > 5.5 ? 0.45 : m.K < 3.2 ? 0.07 : m.K < 3.5 ? 0.15 : undefined, u = m.K < 3.2 ? 0.13 : m.K < 3.5 ? 0.06 : 0;
    MON.set({ monitor: on, rhythm: m.dead ? 'asystole' : m.HR >= 100 ? 'stach' : 'nsr', hr: m.dead ? 0 : m.HR, pulse: !m.dead, cpr: false, co2: m.vent ? Math.round(m.pCO2 - 3) : null, vent: m.vent ? 3 : null, tube: !!m.vent, rp: m.RR ? 60 / m.RR : null, perf: m.perf, ta, u });
    const set = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
    const live = on && !m.dead;
    set('vHR', on ? (m.dead ? 0 : m.HR) : '--'); set('vSp', live ? m.SpO2 : '--'); set('vPR', live ? m.HR : '--'); set('vRR', live ? m.RR : '--'); set('vCO', on && m.vent ? Math.round(m.pCO2 - 3) : '--'); set('vT', on ? m.temp.toFixed(1) : '--');
    const nv = n.v;
    set('vBP', !on ? '--' : n.busy ? String(n.cuff) : nv ? `${nv.s}/${nv.d}` : '--'); set('vMAP', on && nv && !n.busy ? `(${Math.round((nv.s + 2 * nv.d) / 3)})` : '');
    $('#wBP').classList.toggle('meas', on && n.busy);
    set('nbpI', !on ? 'Auto 15 min' : n.busy ? (performance.now() - n.t0 < 3000 ? 'Inflating' : 'Measuring') : n.at ? `Auto 15 min · ${n.at}` : 'Auto 15 min'); set('nbpSt', n.busy ? 'CUFF' : 'START');
    /* alarms: limits only, like the bedside monitor */
    let msgA = '', lvl = '';
    if (on) {
      if (m.SpO2 < 85) { lvl = 'hi'; msgA = '*** SpO₂ Low'; } else if (m.SpO2 < 90) { lvl = 'med'; msgA = '** SpO₂ Low'; }
      else if (nv && nv.s < 90) { lvl = 'med'; msgA = '** NBP Sys Low'; } else if (m.HR > 160) { lvl = 'med'; msgA = '** HR High'; } else if (m.HR < 70) { lvl = 'hi'; msgA = '*** HR Low'; }
    }
    const sil = S.silUntil && performance.now() < S.silUntil, al = $('#mAlm');
    al.textContent = msgA; al.className = 'malm' + (lvl ? ' ' + lvl : '') + (sil && msgA ? ' sil' : ''); $('#mSil').classList.toggle('on', !!sil);
    if (on && lvl === 'hi' && !sil && S.speed && performance.now() - (S.alarmT || 0) > 6000) { S.alarmT = performance.now(); UI.Sound.alarm(); }
    /* the child */
    const skin = m.dead ? 'grey' : m.ce > 0.6 ? 'grey' : m.perf < 0.72 ? 'pale' : 'pink', sk = UI.SKIN[skin] || UI.SKIN.pink, pt = $('#pt');
    pt.style.setProperty('--skin', sk[0]); pt.style.setProperty('--lips', sk[1]); pt.style.setProperty('--skinE', sk[2] || '#a8796a');
    pt.style.setProperty('--br', (m.RR ? Math.max(0.8, Math.min(6, 60 / m.RR)) : 3) + 's');
    pt.className = 'pt skin-' + skin + (m.RR && !m.dead ? ' breathing' : '') + (m.GCS >= 15 ? ' eyes-open' : m.GCS >= 12 ? ' eyes-half' : '')
      + (m.pCO2 < 26 && !m.vent ? ' wob' : '') + (on ? ' has-leads' : '') + (S.flags.io ? ' has-io' : '') + (S.flags.o2 && !m.vent ? ' has-mask' : '') + (m.vent ? ' has-tube' : '');
    const tw = $('#ttlWt'); if (tw) tw.textContent = S.flags.weighed ? m.wt : '?';
    const z = zoneOf(m.wt);
    $('#ptZone').innerHTML = S.flags.weighed ? `<span class="zone" style="--zc:var(--z-${z[0]})">${esc(LANG === 'he' ? ZONE_HE[z[0]] || z[1] : z[1])} · ${m.wt} ${LANG === 'he' ? 'ק״ג' : 'kg'}</span>` : `<span class="zone" style="--zc:var(--dim)">? ${LANG === 'he' ? 'ק״ג' : 'kg'}</span>`;
    const he = LANG === 'he';
    $('#look').textContent = m.dead ? '' : [m.vent ? (he ? 'מונשם ומורדם' : 'Intubated, sedated') : m.GCS >= 15 ? (he ? 'ער' : 'Awake') : m.GCS >= 13 ? (he ? 'ישנוני' : 'Drowsy') : m.GCS >= 9 ? (he ? 'קשה להעיר' : 'Hard to rouse') : (he ? 'לא מגיב' : 'Unresponsive'), m.arrestAt != null && !m.vent ? (he ? 'כמעט לא נושם' : 'barely breathing') : m.pCO2 < 26 && !m.vent ? (he ? 'נשימה עמוקה ומהירה' : 'deep, fast breathing') : '', m.headache && m.GCS >= 13 && !m.vent ? (he ? 'כאב ראש' : 'headache') : '', `CRT ${m.CRT} s`].filter(Boolean).join(' · ');
    const FL = [[he ? 'מוניטור' : 'Monitor', on], ['IV', S.flags.iv], ['IO', S.flags.io], [he ? 'צום' : 'NPO', S.flags.npo], ['O₂', S.flags.o2], [he ? 'ראש 30°' : 'Head 30°', m.headUp], [he ? 'קטטר' : 'Foley', S.flags.foley], ['NG', S.flags.ngt], [he ? 'מונשם' : 'Ventilated', m.vent]];
    $('#flags').innerHTML = FL.map(([n2, v]) => `<span class="flag${v ? ' on' : ''}">${esc(n2)}</span>`).join('');
  }
  function stopOrder(k) {
    const m = S.m;
    if (k === 'main') m.inf.main = Object.assign({}, m.inf.main, { rate: 0 });
    else if (k === 'insDrip') m.inf.insulin = 0;
    else delete S.standing[k];
    S.log.push({ t: now(), id: 'stop', p: { k } }); msg('nurse', L.stopped(oname(k))); renderOrders(); renderStatus();
  }
  /* the situation card: the latest message, then what is running */
  function renderSitu() {
    const el = $('#situ'); if (!el || !S) return;
    const m = S.m, last = S.msgs[S.msgs.length - 1], rows = [];
    if (m.inf.main.rate) rows.push(['main', `${oname('main')}: ${L.fl[m.inf.main.base]}${m.inf.main.dex ? ' + D' + m.inf.main.dex + '%' : ''}${m.inf.main.kcl ? ' + KCl ' + m.inf.main.kcl : ''} · ${m.inf.main.rate} ${L.mlh}`]);
    if (m.inf.insulin) rows.push(['insDrip', `${oname('insDrip')}: ${m.inf.insulin} ${L.f.ukgh} (${r1(m.inf.insulin * dw())} ${L.uh})`]);
    m.inf.boluses.filter(b => b.left > 0).forEach(b => rows.push([null, `${oname('bolus')}: ${L.fl[b.fluid]} · ${Math.round(b.left)} mL`]));
    Object.entries(S.standing).forEach(([k, o]) => rows.push([k, oname(k).includes(L.every(o.every / 60)) ? oname(k) : `${oname(k)} · ${L.every(o.every / 60)}`]));
    const who = { par: L.parSays, nurse: L.nurseSays, att: L.attSays, lab: L.lab, sys: L.sys, you: L.youSays, cons: L.consSays };
    renderTx();
    el.innerHTML = `<div class="hd"><span class="eyebrow">${esc(L.latest)} · ${last ? hhmm(C.startClock + last.t) : ''}</span></div>
      ${last ? `<div class="fb ${last.crit ? 'bad' : last.kind === 'att' ? 'ok' : 'note'}"><b>${esc(who[last.kind])}</b><span>${esc(last.text)}</span>${last.res != null ? `<span><button class="btn sm" data-res="${last.res}">${esc(L.view)}</button></span>` : ''}</div>` : ''}
      <div class="actl"><span class="eyebrow">${esc(L.active)}</span>${rows.length ? rows.map(([k, txt]) => `<div class="act"><span>${esc(txt)}</span>${k ? `<button class="btn sm ghost" data-stop="${k}">${esc(L.stop)}</button>` : ''}</div>`).join('') : `<p class="muted">${esc(L.none)}</p>`}</div>`;
  }
  const renderOrders = () => renderSitu();
  /* ---------------- medication orders, laid out like the ED's order dialog ----------------
     the dose is written as a total (or per kg with the ⟷ button); it is turned into per kg by the weight on file,
     which is the stated 35 kg until he is weighed */
  const MED = {
    bolus: { k: 'mlkg', cat: p => `inf ${p.fluid === 'LR' ? 'RINGER LACTATE' : 'SODIUM CHLORIDE 0.9%'} inf bag (${p.fluid === 'LR' ? 'RINGER LACTATE' : 'SODIUM CHLORIDE'})`, over: true },
    dexBolus: { k: 'mlkg', cat: () => 'inf DEXTROSE 10% inf bag (DEXTROSE)' },
    prbc: { k: 'mlkg', cat: () => 'bld PACKED RED CELLS unit (RBC, LEUKOREDUCED)' }, ffp: { k: 'mlkg', cat: () => 'bld FRESH FROZEN PLASMA unit (PLASMA)' },
    plt: { k: 'mlkg', cat: () => 'bld PLATELETS apheresis unit (PLATELETS)' }, albumin: { k: 'mlkg', cat: () => 'inf ALBUMIN 5% inf bag (ALBUMIN HUMAN)' },
    main: { cat: () => 'inf SOLUTION (maintenance + deficit)', cont: true },
    insDrip: { k: 'dose', cat: () => 'vial INSULIN REGULAR (ACTRAPID) 100 u/ml vial (INSULIN HUMAN)', cont: true, kgFirst: true },
    insBolus: { k: 'dose', cat: () => 'vial INSULIN REGULAR (ACTRAPID) 100 u/ml vial (INSULIN HUMAN)' },
    scRapid: { k: 'dose', cat: () => 'pen INSULIN ASPART (NOVORAPID) 100 u/ml pen (INSULIN ASPART)', route: 'S.C' },
    scBasal: { k: 'dose', cat: () => 'pen INSULIN GLARGINE (LANTUS) 100 u/ml pen (INSULIN GLARGINE)', route: 'S.C' },
    mannitol: { k: 'gkg', cat: () => 'inf MANNITOL 20% inf bag (MANNITOL)' }, hts: { k: 'mlkg', cat: () => 'inf SODIUM CHLORIDE 3% inf bag (SODIUM CHLORIDE)' },
    bicarb: { k: 'meqkg', cat: () => 'amp SODIUM BICARBONATE 8.4% amp (SODIUM BICARBONATE)' },
    kpo: { k: 'meqkg', cat: () => 'syr POTASSIUM CHLORIDE (SOPA-K) oral syr (POTASSIUM CHLORIDE)', route: 'P.O' },
    kphos: { k: 'mmolkg', cat: () => 'vial POTASSIUM PHOSPHATE 3 mmol/ml vial (POTASSIUM PHOSPHATE)' },
    cagluc: { k: 'mlkg', cat: () => 'amp CALCIUM GLUCONATE 10% amp (CALCIUM GLUCONATE)' },
    ondan: { k: 'mgkg', cat: () => 'amp ONDANSETRON 4mg/2ml amp (ONDANSETRON)' }, paracet: { k: 'mgkg', cat: () => 'inf PARACETAMOL 10mg/ml inf bag (PARACETAMOL)' },
    morphine: { k: 'mgkg', cat: () => 'amp MORPHINE 10mg/ml amp (MORPHINE)' }, midaz: { k: 'mgkg', cat: () => 'amp MIDAZOLAM 5mg/ml amp (MIDAZOLAM)' },
    ceftriax: { k: 'mgkg', cat: () => 'vial CEFTRIAXONE 1g vial (CEFTRIAXONE)' }
  };
  const MU = { mlkg: ['ml', 'ml/kg'], gkg: ['g', 'g/kg'], meqkg: ['mEq', 'mEq/kg'], mmolkg: ['mmol', 'mmol/kg'], mgkg: ['mg', 'mg/kg'] };
  const DIL = { insDrip: 'INSULIN REGULAR 10 units in 100 ml NaCl 0.9% (0.1 units/ml). Flush the line with 20 ml first.', insBolus: 'Not given as a bolus in DKA.', mannitol: 'Mannitol 20% undiluted, through a filter, over 20 min.', hts: 'NaCl 3% undiluted.', kphos: 'Dilute in D5W; max 0.06 mmol/kg/h.', cagluc: 'Dilute 1:1, slowly over 10 min, on a monitor.', bicarb: 'Dilute 1:1 with sterile water; never with calcium.', paracet: 'Undiluted over 15 min.', ceftriax: 'Reconstitute; IV over 30 min.', main: 'KCl 14.9% concentrate goes into the bag (max 60 mEq/L peripheral). Never as a push.' };
  function medForm(id, preset, btn) {
    const m = S.m, w = dw(), g = LEVEL === 'guided', he = LANG === 'he', D = MED[id], cont = !!D.cont;
    const cur = id === 'main' && m.inf.main.rate ? Object.assign({}, m.inf.main) : id === 'insDrip' && m.inf.insulin ? { dose: m.inf.insulin } : Object.assign({}, preset);
    const def = (FORMS[id] || []).reduce((a, [k, , d]) => (a[k] = d, a), {});
    const unitsOf = () => id === 'insDrip' ? ['units/h', 'units/kg/h'] : D.k === 'dose' ? ['units', 'units/kg'] : MU[D.k];
    let perKg = !!D.kgFirst;
    const doseV = () => { const pk = cur[D.k] ?? (g ? def[D.k] : ''); return pk === '' || pk == null ? '' : perKg ? pk : ['scRapid', 'scBasal', 'insBolus'].includes(id) ? Math.round(pk * w * 2) / 2 : r1(pk * w); };
    const sel = (n, opts, v, lab) => `<select name="${n}">${opts.map(o => `<option value="${o}"${String(v) === String(o) ? ' selected' : ''}>${esc(lab ? lab(o) : o)}</option>`).join('')}</select>`;
    const date = caseDate(now()), route = D.route || 'I.V';
    const card = id === 'main'
      ? `<div class="mo-drug"><b>inf ${sel('base', ['NS', 'HALF', 'LR'], cur.base || 'NS', v => ({ NS: 'SODIUM CHLORIDE 0.9%', HALF: 'SODIUM CHLORIDE 0.45%', LR: 'RINGER LACTATE' })[v])} + ${sel('dex', [0, 5, 10, 12.5], cur.dex ?? 0, v => v ? `DEXTROSE ${v}%` : 'NO DEXTROSE')} inf bag</b>
          <div class="mo-add">+ amp POTASSIUM CHLORIDE (KCL) 14.9% amp ${sel('kcl', [0, 20, 40, 60], cur.kcl ?? 0)} <span>mEq/L</span></div>
          <div class="mo-dose"><span>Rate:</span><input name="rate" type="number" step="any" inputmode="decimal" value="${cur.rate ?? ''}"><span class="mo-u">ml/hr</span></div></div>`
      : `<div class="mo-drug"><b>${esc(D.cat(Object.assign({}, def, cur)))}</b>${id === 'bolus' ? `<div class="mo-add">${sel('fluid', ['NS', 'LR'], cur.fluid || 'NS', v => L.fl[v])}</div>` : ''}
          <div class="mo-dose"><span>${id === 'bolus' || D.k === 'mlkg' ? 'Volume:' : 'Dose:'}</span><input name="dv" type="number" step="any" inputmode="decimal" value="${doseV()}"><select name="du" class="mo-u">${unitsOf().map((u, i) => `<option value="${i}"${+perKg === i ? ' selected' : ''}>${u}</option>`).join('')}</select><button type="button" class="mo-sw" data-sw title="${he ? 'סה״כ / לק״ג' : 'Total / per kg'}">⟷</button></div>
          ${D.over ? `<div class="mo-dose"><span>Infuse over:</span><input name="over" type="number" step="any" inputmode="decimal" value="${cur.over ?? def.over ?? ''}"><span class="mo-u">min</span></div>` : ''}</div>`;
    const curOrders = [m.inf.main.rate && `inf ${{ NS: 'SODIUM CHLORIDE 0.9%', HALF: 'SODIUM CHLORIDE 0.45%', LR: 'RINGER LACTATE' }[m.inf.main.base]}${m.inf.main.dex ? '+DEXTROSE ' + m.inf.main.dex + '%' : ''}${m.inf.main.kcl ? ' + KCL ' + m.inf.main.kcl + ' mEq/L' : ''} Rate: ${m.inf.main.rate}ml/hr CONTINUOUS`,
      m.inf.insulin && `inf INSULIN REGULAR ${m.inf.insulin} units/kg/h (${r1(m.inf.insulin * w)} units/h) CONTINUOUS`,
      ...m.inf.boluses.filter(b => b.left > 1).map(b => `inf ${b.fluid === 'LR' ? 'RINGER LACTATE' : 'SODIUM CHLORIDE 0.9%'} ${Math.round(b.left)} ml left ONCE`)].filter(Boolean);
    const nb = S.nbp && S.nbp.v, at = `${hhmm(C.startClock + Math.floor(now() / 15) * 15)}:00 ${date.D}`;
    const meas = [[m.temp.toFixed(1), he ? 'חום' : 'Temp'], [S.flags.mon ? m.HR : m.hist[0] ? m.hist[0].HR : m.HR, he ? 'דופק' : 'Pulse'], [nb ? `${nb.s} / ${nb.d}` : `${m.SBP} / ${m.DBP}`, he ? 'לחץ דם' : 'BP'], [m.SpO2, he ? 'סטורציה באויר חדר' : 'SpO₂ room air'], [0, he ? 'כאב' : 'Pain']];
    const wtTxt = S.flags.weighed ? m.wt : m.wt0;
    const md = modal(`<div class="mo" dir="ltr"><div class="mo-title"><span>▤ Medication Orders -- Webpage Dialog</span><button type="button" class="mo-x" data-x aria-label="${esc(L.back)}">✕</button></div>
      <form class="mo-body"><div class="mo-main">
        <section class="mo-box"><div class="mo-hd"><span><i>?</i>Medications</span><label class="mo-chk"><input type="checkbox" disabled> Daily Dose</label><span class="mo-tools"><button type="button" class="mo-b" data-dil>Dilution Instructions</button><button type="button" class="mo-b" disabled>+ Add Solution</button><button type="button" class="mo-b" disabled>+ Add Drug</button></span></div>
          <div class="mo-card">${card}<label class="mo-chk"><input type="checkbox" disabled> Duration:</label><div class="mo-warn" id="hlp"></div></div></section>
        <section class="mo-box"><div class="mo-hd"><span><i>?</i>Order Details <b class="mo-po">(PoOthers)</b></span></div>
          <div class="mo-row"><span class="mo-l"><i>?</i>Route</span><select class="mo-route" disabled><option>${route}</option></select><span class="mo-ti">Taken independently <span class="mo-tog">✕ OFF</span></span></div>
          <div class="mo-row"><span class="mo-l"><i>?</i>Type</span><span class="mo-seg">${['Continuous', 'Periodically', 'Once', 'SOS'].map(t => `<span class="${(cont ? 'Continuous' : 'Once') === t ? 'on' : ''}">${t}</span>`).join('')}</span></div>
          <div class="mo-row mo-sep"><span class="mo-l"><i>?</i>Start at</span><span class="mo-fld">${date.D}<em>📅</em></span><span class="mo-fld sm">${hhmm(C.startClock + now())}<em>◷</em></span><span>for</span><span class="mo-fld xs"></span><span class="mo-fld sm">Days ▾</span></div>
          <div class="mo-row"><span class="mo-l"><i>?</i>Order Expire at</span><span class="mo-fld"><em>📅</em></span><span class="mo-fld sm"><em>◷</em></span><span class="mo-green">Clear Stop Date</span></div>
          <div class="mo-row"><span class="mo-l"><i>?</i>Hold</span><input type="checkbox" disabled></div>
          <div class="mo-row mo-sep"><span class="mo-l"><i>?</i>Instructions</span><input name="instr" class="mo-in" autocomplete="off"></div>
          <div class="mo-row"><button type="submit" class="mo-ok">✔ OK</button></div></section></div>
        <aside class="mo-side">
          <section class="mo-box"><div class="mo-hd"><span><i>?</i>Patient Details</span></div><div class="mo-pt" dir="rtl"><span class="mo-av">👤</span><div><b>${he ? 'בן ' + m.age : 'Boy, ' + m.age + 'y'}</b><div>${he ? 'גיל' : 'Age'}: ${m.age} ${he ? 'שנים' : 'y'}, ${he ? 'משקל' : 'Weight'}: ${wtTxt} ${he ? 'ק״ג' : 'kg'}</div><div>${esc(he ? { ED: 'מיון ילדים', PICU: 'טיפול נמרץ ילדים', WARD: 'מחלקת ילדים' }[S.flags.loc || 'ED'] : { ED: 'Pediatric ED', PICU: 'PICU', WARD: 'Pediatric ward' }[S.flags.loc || 'ED'])}</div></div></div></section>
          <section class="mo-box"><div class="mo-hd"><span><i>?</i>Sensitivities</span></div><p class="mo-none">No Sensitivities</p></section>
          <section class="mo-box"><div class="mo-hd"><span><i>?</i>Current Orders</span></div><div class="mo-cur">${curOrders.length ? curOrders.map(x => `<div>${esc(x)}</div>`).join('') : '<p class="mo-none">No current orders</p>'}</div></section>
          <section class="mo-box"><div class="mo-hd"><span><i>?</i>Measurements</span></div><table class="mo-ms">${meas.map(([v, l]) => `<tr><td>${esc(String(v))}</td><td>${at}</td><td dir="rtl">${esc(l)}</td></tr>`).join('')}</table></section>
          <section class="mo-box"><div class="mo-hd"><span><i>?</i>Diagnoses</span></div><p class="mo-none">No diagnoses</p></section>
        </aside></form></div>`, 'medw');
    const f = $('form', md.el), h = $('#hlp', md.el), mt = M.maint(w); h.dir = 'auto';
    const total = () => { const v = +f.dv.value; return f.dv.value === '' ? null : perKg ? v * w : v; };
    const live = () => {
      h.classList.remove('warn'); let t = '';
      if (id === 'main') t = g ? (S.flags.weighed ? '' : L.help.byHist) + L.help.maint(Math.round(mt), 0, Math.round(1.5 * mt), Math.round(2 * mt)) : '';
      else if (total() != null && g) {
        const u = unitsOf(), tv = total();
        t = perKg ? `= ${+tv.toFixed(2)} ${u[0]}` : `= ${+(tv / w).toFixed(3)} ${u[1]}`;
        t += ` (${wtTxt} kg${S.flags.weighed ? '' : he ? ', לפי המשקל הידוע' : ', weight on file'})`;
        if (g && id === 'insDrip') t += ' · ' + L.help.insProt + ' ' + L.help.ins(r1(tv), r1(tv * 10));
        if (g && id === 'mannitol') t += ' · ' + L.help.man(Math.round(tv * 5));
      }
      h.textContent = t;
    };
    f.addEventListener('input', live); live();
    f.addEventListener('change', e => { if (e.target.name === 'du') { const tv = total(); perKg = e.target.value === '1'; if (tv != null) f.dv.value = perKg ? +(tv / w).toFixed(3) : +tv.toFixed(2); live(); } });
    md.el.addEventListener('click', e => {
      if (e.target.closest('[data-x]')) { md.close(); return; }
      if (e.target.closest('[data-sw]')) { const s = f.du; s.value = s.value === '1' ? '0' : '1'; s.dispatchEvent(new Event('change', { bubbles: true })); return; }
      if (e.target.closest('[data-dil]')) { h.textContent = DIL[id] || 'No dilution instructions for this drug.'; }
    });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const p = {};
      if (id === 'main') { if (f.rate.value === '') { h.textContent = L.needVal; h.classList.add('warn'); return; } Object.assign(p, { base: f.base.value, dex: +f.dex.value, kcl: +f.kcl.value, rate: +f.rate.value }); }
      else {
        const tv = total(); if (tv == null || (D.over && f.over.value === '')) { h.textContent = L.needVal; h.classList.add('warn'); return; }
        p[D.k] = +(tv / w).toFixed(3);
        if (D.over) p.over = +f.over.value;
        if (id === 'bolus') p.fluid = f.fluid.value;
      }
      if (f.instr.value.trim()) p.instr = f.instr.value.trim();
      md.close(); order(id, p); flash(btn);
    });
    const first = $('input[name=dv],input[name=rate]', f); if (first) first.focus();
  }
  /* in the PICU the order screen is the unit's: Hebrew, the drug and its solvent in a table, dose rate and total rate */
  const PVN = { bolus: ['', 'Infusion Bag', 'IV'], dexBolus: ['Dextrose 10%', 'Infusion Bag', 'IV'], prbc: ['Packed Red Cells', 'Blood Unit', 'IV'], ffp: ['Fresh Frozen Plasma', 'Blood Unit', 'IV'], plt: ['Platelets', 'Blood Unit', 'IV'], albumin: ['Albumin 5%', 'Infusion Bag', 'IV'],
    insDrip: ['Insulin Regular - Actrapid', 'Injection', 'IV'], insBolus: ['Insulin Regular - Actrapid', 'Injection', 'IV'], scRapid: ['Insulin Aspart - NovoRapid', 'Pen', 'SC'], scBasal: ['Insulin Glargine - Lantus', 'Pen', 'SC'],
    mannitol: ['Mannitol 20%', 'Infusion Bag', 'IV'], hts: ['Sodium Chloride 3%', 'Infusion Bag', 'IV'], bicarb: ['Sodium Bicarbonate 8.4%', 'Injection', 'IV'], kpo: ['Potassium Chloride oral - Sopa-K', 'Oral Solution', 'PO'],
    kphos: ['Potassium Phosphate', 'Injection', 'IV'], cagluc: ['Calcium Gluconate 10%', 'Injection', 'IV'], ondan: ['Ondansetron - Zofran', 'Injection', 'IV'], paracet: ['Paracetamol IV', 'Infusion Bag', 'IV'],
    morphine: ['Morphine', 'Injection', 'IV'], midaz: ['Midazolam - Dormicum', 'Injection', 'IV'], ceftriax: ['Ceftriaxone - Rocephin', 'Injection', 'IV'], main: ['', 'Infusion Bag', 'IV'] };
  const SOLV = [['NS', 0, 'NaCl 0.9%'], ['NS', 5, 'D5%+NaCl 0.9%'], ['NS', 10, 'D10%+NaCl 0.9%'], ['NS', 12.5, 'D12.5%+NaCl 0.9%'], ['HALF', 0, 'NaCl 0.45%'], ['HALF', 5, 'D5%+NaCl 0.45%'], ['HALF', 10, 'D10%+NaCl 0.45%'], ['LR', 0, 'Ringer Lactate'], ['LR', 5, 'D5%+Ringer Lactate']];
  function picuForm(id, preset, btn) {
    const m = S.m, w = dw(), g = LEVEL === 'guided', D = MED[id], N = PVN[id], cont = !!D.cont, BAG = 500, INS = [10, 100];
    const cur = id === 'main' && m.inf.main.rate ? Object.assign({}, m.inf.main) : id === 'insDrip' && m.inf.insulin ? { dose: m.inf.insulin } : Object.assign({}, preset);
    const def = (FORMS[id] || []).reduce((a, [k, , d]) => (a[k] = d, a), {});
    const unitsOf = () => id === 'insDrip' ? ['units/hr', 'units/kg/hr'] : D.k === 'dose' ? ['units', 'units/kg'] : MU[D.k].map(u => u.replace('ml', 'mL'));
    let perKg = !!D.kgFirst;
    const pk0 = cur[D.k] ?? (g ? def[D.k] : ''), doseV = pk0 === '' || pk0 == null ? '' : perKg ? pk0 : ['scRapid', 'scBasal', 'insBolus'].includes(id) ? Math.round(pk0 * w * 2) / 2 : +(pk0 * w).toFixed(2);
    const sel = (n, opts, v) => `<select name="${n}">${opts.map(([val, t]) => `<option value="${val}"${String(v) === String(val) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
    const d = caseDate(now()), lock = '<i class="pv-lk">🔒</i>', dd = '<span class="pv-dd">▾</span>';
    const solvI = Math.max(0, SOLV.findIndex(x => x[0] === (cur.base || 'NS') && x[1] === (+cur.dex || 0)));
    let rows, rateRow;
    if (id === 'main') {
      rows = `<tr class="on"><td>Potassium Chloride / KCl</td><td class="pv-ic">⚗ ▾ ⏱</td><td><input name="kmeq" type="number" step="any" inputmode="decimal" value="${cur.kcl != null ? Math.round(cur.kcl * BAG / 1000) : ''}"> mEq</td><td id="pvConc">--</td><td>${lock}</td><td class="pv-x">✕</td></tr>
        <tr><td><span class="pv-sv">ממס</span>${sel('solv', SOLV.map((x, i) => [i, x[2]]), solvI)}</td><td class="pv-ic">⚗ ▾ ⏱</td><td>${BAG} mL</td><td>--</td><td>${lock}</td><td class="pv-x">✕</td></tr>`;
      rateRow = `<label>קצב מנה ${lock}<input disabled></label><label>קצב כולל ${lock}<span class="pv-in"><input name="rate" type="number" step="any" inputmode="decimal" value="${cur.rate ?? ''}"><em>mL/hr</em></span></label><label>סה״כ כמות ${lock}<input value="mL ${BAG}" disabled></label><label>לתת במשך ${lock}<input disabled></label>`;
    } else if (id === 'insDrip') {
      rows = `<tr class="on"><td>${N[0]}</td><td class="pv-ic">⚗ ▾ ⏱</td><td>${INS[0]} units</td><td>${INS[0] / INS[1]} units / mL</td><td>${lock}</td><td class="pv-x">✕</td></tr>
        <tr><td><span class="pv-sv">ממס</span>NaCl 0.9%</td><td class="pv-ic">⚗ ▾ ⏱</td><td>${INS[1]} mL</td><td>--</td><td>${lock}</td><td class="pv-x">✕</td></tr>`;
      rateRow = `<label>קצב מנה ${lock}<span class="pv-in"><input name="dv" type="number" step="any" inputmode="decimal" value="${doseV}">${sel('du', unitsOf().map((u, i) => [i, u]), +perKg)}</span></label><label>קצב כולל ${lock}<input id="pvTot" disabled></label><label>סה״כ כמות ${lock}<input value="mL ${INS[1]}" disabled></label><label>לתת במשך ${lock}<input disabled></label>`;
    } else {
      const name = id === 'bolus' ? sel('fluid', [['NS', 'NaCl 0.9%'], ['LR', 'Ringer Lactate']], cur.fluid || 'NS') : esc(N[0]);
      rows = `<tr class="on"><td>${id === 'bolus' ? '<span class="pv-sv">ממס</span>' : ''}${name}</td><td class="pv-ic">⚗ ▾ ⏱</td><td><span class="pv-in"><input name="dv" type="number" step="any" inputmode="decimal" value="${doseV}">${sel('du', unitsOf().map((u, i) => [i, u]), +perKg)}</span></td><td>--</td><td>${lock}</td><td class="pv-x">✕</td></tr>`;
      rateRow = `<label>קצב מנה ${lock}<input disabled></label><label>קצב כולל ${lock}<input disabled></label><label>סה״כ כמות ${lock}<input id="pvTot" disabled></label><label>לתת במשך ${lock}<span class="pv-in"><input name="over" type="number" step="any" inputmode="decimal" value="${D.over ? cur.over ?? def.over ?? '' : ''}"${D.over ? '' : ' disabled'}><em>min</em></span></label>`;
    }
    const md = modal(`<div class="pv" dir="rtl"><div class="pv-title"><span>👤 צור הוראה עבור: <b>ישראלי ישראל, מספר אשפוז ${String(81000000 + (S.date0 / 86400000 | 0) % 999999)}</b></span><button type="button" class="pv-xx" data-x aria-label="${esc(L.back)}">✕</button></div>
      <div class="pv-ban"><span class="pv-al">לא ידועה רגישות לתרופות</span><span>${m.age}Y</span><span>משקל לתרופות: ${w} Kg</span><span class="pv-tabs"><b>מידע נוסף</b><b>אלרגיות</b></span></div>
      <form class="pv-body"><div class="pv-top"><section><h5>הוראה למתן</h5><div class="pv-srch"><span class="pv-tag">🏷</span><span class="pv-drug">${id === 'main' ? 'Potassium Chloride / KCl' : esc(N[0] || 'Sodium Chloride 0.9%')}</span>${dd}<span class="pv-sq">🔍</span><span class="pv-sq">📋</span></div>
          <div class="pv-g3"><label>צורת מינון<span class="pv-f">${N[1]}${dd}</span></label><label>דרך מתן<span class="pv-f">${N[2]}${dd}</span></label><label>מיקום<span class="pv-f">בחר/י מיקום${dd}</span></label></div></section>
        <section><div class="pv-sos"><b class="pv-sb">SOS</b><span class="pv-f pv-ph">התנאי למתן SOS</span><label>מקסימום מנה ל-24 שעות<span class="pv-f"></span></label></div>
          <div class="pv-g3"><label>מצב דוגמה<span class="pv-f">ללא</span></label><label>תדירות<span class="pv-f">${cont ? 'מתמשך' : 'פעם אחת'}${dd}</span></label><label>&nbsp;<span class="pv-f"></span></label></div></section></div>
        <div class="pv-mid"><span class="pv-f pv-mode">${D.over ? 'ציין הזרמה במשך' : 'הגדר/הגדירי מנה וקצב'}${dd}</span><span class="pv-add"><b>＋</b>תוספים</span><span class="pv-add"><b>＋</b>ממס</span></div>
        <table class="pv-t"><thead><tr><th>תרופה</th><th></th><th>כמות/נפח</th><th>ריכוז</th><th></th><th></th></tr></thead><tbody>${rows}</tbody></table>
        <div class="pv-rates">${rateRow}</div>
        <div class="pv-when"><div><label>התחלה<span class="pv-f">עכשיו${dd}</span></label><label>סיים<span class="pv-f">${cont ? 'ללא הגבלת זמן' : 'אחרי מנה אחת'}${dd}</span></label></div><label class="pv-note">ראה מידע נוסף<textarea name="instr" rows="3"></textarea></label></div>
        <div class="pv-help" id="hlp"></div>
        <div class="pv-foot"><span class="pv-wt">משקל לחישוב מינון: <span class="pv-f">${S.flags.weighed ? 'משקל בפועל' : 'משקל ראשוני'}${dd}</span> ${w} Kg</span><span>החל מ ${hhmm(C.startClock + now())} ${d.D}</span></div>
        <div class="pv-btns"><button type="button" class="pv-b" data-x>ביטול</button><button type="submit" class="pv-b">שמור</button><button type="button" class="pv-b ghost" disabled>שמור וצור חדש</button></div></form></div>`, 'pvw');
    const f = $('form', md.el), h = $('#hlp', md.el);
    const total = () => f.dv && f.dv.value !== '' ? (perKg ? +f.dv.value * w : +f.dv.value) : null;
    const live = () => {
      h.classList.remove('warn'); let t = '';
      if (id === 'main') { const k = f.kmeq.value === '' ? 0 : +f.kmeq.value; $('#pvConc', md.el).textContent = k ? `${+(k / BAG).toFixed(3)} mEq / mL` : '--'; t = `KCl ${Math.round(k * 1000 / BAG)} mEq/L`; if (g) t += ' · ' + (S.flags.weighed ? '' : L.help.byHist) + L.help.maint(Math.round(M.maint(w)), 0, Math.round(1.5 * M.maint(w)), Math.round(2 * M.maint(w))); }
      else if (total() != null) {
        const u = unitsOf(), tv = total();
        t = g ? (perKg ? `= ${+tv.toFixed(2)} ${u[0]}` : `= ${+(tv / w).toFixed(3)} ${u[1]}`) : '';
        if (id === 'insDrip') { $('#pvTot', md.el).value = `${+(tv * INS[1] / INS[0]).toFixed(1)} mL/hr`; if (g) t += ' · ' + L.help.insProt; }
        else { const tot = $('#pvTot', md.el); if (tot) tot.value = `${+tv.toFixed(2)} ${u[0]}`; }
        if (g && id === 'mannitol') t += ' · ' + L.help.man(Math.round(tv * 5));
      }
      h.textContent = t;
    };
    f.addEventListener('input', live); live();
    f.addEventListener('change', e => { if (e.target.name === 'du') { const tv = perKg ? +f.dv.value * w : +f.dv.value, had = f.dv.value !== ''; perKg = e.target.value === '1'; if (had) f.dv.value = perKg ? +(tv / w).toFixed(3) : +tv.toFixed(2); live(); } });
    md.el.addEventListener('click', e => { if (e.target.closest('[data-x]')) md.close(); });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const p = {}, need = () => { h.textContent = L.needVal; h.classList.add('warn'); };
      if (id === 'main') { if (f.rate.value === '') return need(); const sv = SOLV[+f.solv.value]; Object.assign(p, { base: sv[0], dex: sv[1], kcl: Math.round((+f.kmeq.value || 0) * 1000 / BAG), rate: +f.rate.value }); }
      else {
        const tv = total(); if (tv == null || (D.over && f.over.value === '')) return need();
        p[D.k] = +(tv / w).toFixed(3);
        if (D.over) p.over = +f.over.value;
        if (id === 'bolus') p.fluid = f.fluid.value;
      }
      if (f.instr.value.trim()) p.instr = f.instr.value.trim();
      md.close(); order(id, p); flash(btn);
    });
    const first = $('input[name=dv],input[name=kmeq]', f); if (first) first.focus();
  }
  /* rapid-sequence intubation and the ventilator. Doses from Nelson's intubation table; the protocol's rule for DKA:
     ventilate to the (low) pCO2 he had before he deteriorated */
  const RSI = {
    sed: { ket: ['Ketamine', 1, 2, 3, 'mg/kg'], midaz: ['Midazolam', 0.1, 0.2, 0.3, 'mg/kg'], fent: ['Fentanyl', 1, 3, 5, 'mcg/kg'], propofol: ['Propofol', 1, 3, 4, 'mg/kg'], thio: ['Thiopental', 3, 5, 7, 'mg/kg'] },
    par: { roc: ['Rocuronium', 0.6, 1.2, 1.5, 'mg/kg'], sux: ['Succinylcholine', 1, 2, 2.5, 'mg/kg'], none: ['—', 0, 0, 0, ''] }
  };
  const vExp = (tv, rr) => tv && rr ? Math.round(40 * 96 / Math.max(10, (tv - 2.2) * rr)) : null;
  const ventTxt = v => `VC · TV ${v.tv} mL/kg · RR ${v.rr} · PEEP ${v.peep} · FiO₂ ${v.fio2}%`;
  function ventFields(cur) {
    const f = (n, lab, v, u) => `<label>${lab}<span class="inp"><input name="${n}" type="number" step="any" inputmode="decimal" value="${v ?? ''}" dir="ltr"><small>${u}</small></span></label>`;
    return `<div class="vgrid"><label>${esc(L.rsi.mode)}<span class="inp"><input value="VC (volume control)" disabled dir="ltr"></span></label>${f('tv', esc(L.rsi.tv), cur.tv, 'mL/kg')}${f('rr', esc(L.rsi.rr), cur.rr, '/min')}${f('peep', 'PEEP', cur.peep, 'cmH₂O')}${f('fio2', 'FiO₂', cur.fio2, '%')}</div>`;
  }
  function ventLive(md, f) {
    const h = $('#hlp', md.el), w = dw(), tv = +f.tv.value, rr = +f.rr.value, last = S.res.filter(r => r.ready <= now() && typeof (r.v || {}).pCO2 === 'number').pop();
    let t = tv ? `TV ${Math.round(tv * w)} mL` : '';
    if (LEVEL === 'guided') { t += (t ? ' · ' : '') + L.rsi.goal + (last ? ' ' + L.rsi.lastGas(last.v.pCO2, hhmm(C.startClock + last.drawn)) : ''); if (vExp(tv, rr)) t += ' · ' + L.rsi.expect(vExp(tv, rr)); }
    h.textContent = t; h.classList.remove('warn');
  }
  function intubForm(btn) {
    const g = LEVEL === 'guided', w = dw(), opt = (grp, v) => Object.entries(RSI[grp]).map(([k, d]) => `<option value="${k}"${k === v ? ' selected' : ''}>${esc(d[0])}${d[1] ? ` (${d[1]}–${d[2]} ${d[4]})` : ''}</option>`).join('');
    const md = modal(`<span class="eyebrow">${esc(L.order)} · ${hhmm(C.startClock + now())}</span><h2>${esc(oname('intub'))}</h2><form class="oform">
      <h4 class="fh">${esc(L.rsi.ind)}</h4>
      <div class="vgrid"><label>${esc(L.rsi.sed)}<select name="sed">${opt('sed', g ? 'ket' : '')}</select></label><label>${esc(L.f.dose)}<span class="inp"><input name="sedD" type="number" step="any" inputmode="decimal" value="${g ? 1.5 : ''}" dir="ltr"><small id="sedU">mg/kg</small></span></label>
        <label>${esc(L.rsi.par)}<select name="par">${opt('par', g ? 'roc' : '')}</select></label><label>${esc(L.f.dose)}<span class="inp"><input name="parD" type="number" step="any" inputmode="decimal" value="${g ? 1 : ''}" dir="ltr"><small id="parU">mg/kg</small></span></label></div>
      <h4 class="fh">${esc(L.rsi.vent)}</h4>${ventFields(g ? { tv: 7, rr: 20, peep: 5, fio2: 40 } : {})}
      <p class="rule" id="hlp"></p>
      <div class="row"><button class="btn primary" type="submit">${esc(L.order)}</button><button class="btn ghost" type="button" data-x>${esc(L.back)}</button></div></form>`);
    const f = $('form', md.el);
    if (!g) { f.sed.insertAdjacentHTML('afterbegin', '<option value="" selected>—</option>'); f.par.insertAdjacentHTML('afterbegin', '<option value="" selected>—</option>'); }
    const live = () => { $('#sedU', md.el).textContent = (RSI.sed[f.sed.value] || [])[4] || ''; $('#parU', md.el).textContent = (RSI.par[f.par.value] || [])[4] || ''; ventLive(md, f); };
    f.addEventListener('input', live); f.addEventListener('change', live); live();
    md.el.addEventListener('click', e => { if (e.target.closest('[data-x]')) md.close(); });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const p = { sed: f.sed.value, sedD: +f.sedD.value, par: f.par.value, parD: f.par.value === 'none' ? 0 : +f.parD.value, tv: +f.tv.value, rr: +f.rr.value, peep: +f.peep.value, fio2: +f.fio2.value };
      if (!p.sed || !p.par || !p.sedD || (p.par !== 'none' && !p.parD) || !p.tv || !p.rr || f.peep.value === '' || !p.fio2) { const h = $('#hlp', md.el); h.textContent = L.needVal; h.classList.add('warn'); return; }
      { const bad = [['sed', p.sed, p.sedD], ['par', p.par, p.parD]].find(([gr, k, d]) => RSI[gr][k] && RSI[gr][k][3] && d > RSI[gr][k][3]); if (bad) { const D = RSI[bad[0]][bad[1]], h = $('#hlp', md.el); h.textContent = L.msgs.tooMuch(D[0], `${bad[2]} ${D[4]}`, `${D[3]} ${D[4]}`); h.classList.add('warn'); return; } }
      md.close(); order('intub', p); flash(btn);
    });
  }
  function ventForm(btn) {
    const v = S.m.ventSet || {}, md = modal(`<span class="eyebrow">${esc(L.order)} · ${hhmm(C.startClock + now())}</span><h2>${esc(oname('ventSet'))}</h2><p class="muted" dir="ltr">${esc(ventTxt(v))} · ETCO₂ ${Math.round(S.m.pCO2 - 3)}</p><form class="oform">${ventFields(v)}<p class="rule" id="hlp"></p>
      <div class="row"><button class="btn primary" type="submit">${esc(L.order)}</button><button class="btn ghost" type="button" data-x>${esc(L.back)}</button></div></form>`);
    const f = $('form', md.el);
    f.addEventListener('input', () => ventLive(md, f)); ventLive(md, f);
    md.el.addEventListener('click', e => { if (e.target.closest('[data-x]')) md.close(); });
    f.addEventListener('submit', e => { e.preventDefault(); const p = { tv: +f.tv.value, rr: +f.rr.value, peep: +f.peep.value, fio2: +f.fio2.value }; if (!p.tv || !p.rr || !p.fio2) { const h = $('#hlp', md.el); h.textContent = L.needVal; h.classList.add('warn'); return; } md.close(); order('ventSet', p); flash(btn); });
  }
  function openForm(id, btn) {
    if (id === 'intub') { (S.m.vent ? ventForm : intubForm)(btn); return; }
    const m = S.m, w = S.flags.weighed ? m.wt : m.wt0, g = LEVEL === 'guided';
    if (id === 'insulinVial') {
      const md = modal(`<h2>${esc(oname('insulinVial'))}</h2><div class="opts">${['insDrip', 'insBolus'].concat(m.inf.insulin ? ['stopDrip'] : []).map(k => `<button class="opt" data-k="${k}">${esc(oname(k))}</button>`).join('')}</div><div class="row"><button class="btn ghost" data-x>${esc(L.back)}</button></div>`);
      md.el.onclick = e => { const k = e.target.closest('[data-k]'); if (k) { md.close(); openForm(k.dataset.k); } else if (e.target.closest('[data-x]')) md.close(); };
      return;
    }
    if (id === 'kclConc') { msg('sys', EXTRA[LANG].kclWhere); openForm('main'); return; }
    let preset = {};
    if (id === 'bolusNS' || id === 'bolusLR') { preset.fluid = id === 'bolusNS' ? 'NS' : 'LR'; id = 'bolus'; }
    if (MED[id]) { (S.flags.loc === 'PICU' ? picuForm : medForm)(id, preset, btn); return; }
    const fields = FORMS[id];
    if (!fields && PROC[id] && id !== 'iv') {
      const PR = PROC[id], cm = modal(`<span class="eyebrow">${esc(L.order)} · ${hhmm(C.startClock + now())}</span><h2>${esc(oname(id))}</h2><p class="muted">${esc(L.procInfo(PR.by === 'md', PR.min))}</p><div class="row"><button class="btn primary" data-ok>${esc(L.order)}</button><button class="btn ghost" data-x>${esc(L.back)}</button></div>`);
      cm.el.addEventListener('click', e => { if (e.target.closest('[data-ok]')) { cm.close(); order(id); flash(btn); } else if (e.target.closest('[data-x]') || e.target === cm.el) cm.close(); });
      return;
    }
    if (!fields) { order(id); flash(btn); return; }
    const cur = id === 'main' && m.inf.main.rate ? m.inf.main : id === 'insDrip' && m.inf.insulin ? { dose: m.inf.insulin } : preset;
    const fieldHTML = ([k, kind, opt]) => {
      const lbl = esc({ mlkg: L.f.vol, mgkg: L.f.dose, gkg: L.f.dose, meqkg: L.f.dose, mmolkg: L.f.dose }[k] || L.f[k] || k), val = cur[k];
      if (kind === 'sel') return `<label>${lbl}<select name="${k}">${opt.map(v => `<option value="${v}"${String(val) === String(v) ? ' selected' : ''}>${esc(k === 'fluid' || k === 'base' ? L.fl[v] : k === 'mode' ? EXTRA[LANG].modes[v] : k === 'dex' ? (v ? 'D' + v + '%' : '—') : v)}</option>`).join('')}</select></label>`;
      if (kind === 'freq') return `<label>${esc(L.f.freq)}<select name="freq"><option value="0">${esc(L.once)}</option>${[1, 2, 4].map(h => `<option value="${h}">${esc(L.every(h))}</option>`).join('')}</select></label>`;
      const unit = { mlkg: L.f.mlkg, mgkg: L.f.mgkg, over: '', rate: L.mlh, dose: id === 'insDrip' ? L.f.ukgh : L.f.ukg, gkg: L.f.gkg, meqkg: L.f.meqkg, mmolkg: L.f.mmolkg }[k] || '';
      return `<label>${lbl}<span class="inp"><input name="${k}" type="number" step="any" inputmode="decimal" value="${val ?? opt}" dir="ltr"><small>${esc(unit)}</small></span></label>`;
    };
    const mt = M.maint(w), lo = Math.round(1.5 * mt), hi = Math.round(2 * mt);
    const md = modal(`<span class="eyebrow">${esc(L.order)} · ${hhmm(C.startClock + now())}</span><h2>${esc(oname(id))}</h2><form class="oform">${fields.map(fieldHTML).join('')}<p class="rule" id="hlp">${g && id === 'main' ? esc((S.flags.weighed ? '' : L.help.byHist) + L.help.maint(mt, 0, lo, hi)) : ''}</p>
      <div class="row"><button class="btn primary" type="submit">${esc(L.order)}</button><button class="btn ghost" type="button" data-x>${esc(L.back)}</button></div></form>`);
    const f = $('form', md.el);
    const live = () => {
      if (!g) return; const fd = Object.fromEntries(new FormData(f)), h = $('#hlp', md.el);
      if (id === 'insDrip' && +fd.dose) h.textContent = L.help.insProt + ' ' + L.help.ins(r1(fd.dose * w), r1(fd.dose * w * 10));
      if (id === 'mannitol') h.textContent = L.help.man(Math.round(fd.gkg * 5 * w));
      if (['scRapid', 'scBasal', 'insBolus'].includes(id) && +fd.dose) h.textContent = `= ${r1(fd.dose * w)} ${L.u}`;
      if (fd.mgkg && +fd.mgkg) h.textContent = `= ${r1(fd.mgkg * w)} mg`;
      if (['bolus', 'hts', 'dexBolus', 'prbc', 'ffp', 'plt', 'albumin'].includes(id)) h.textContent = L.help.bol(Math.round(fd.mlkg * w));
    };
    f.addEventListener('input', live); live();
    f.addEventListener('submit', e => { e.preventDefault(); const fd = Object.fromEntries(new FormData(f)); Object.keys(fd).forEach(k => { if (!isNaN(+fd[k]) && fd[k] !== '' && !['fluid', 'base', 'mode'].includes(k)) fd[k] = +fd[k]; }); if (Object.values(fd).some(v => v === '')) { const h = $('#hlp', md.el); if (h) { h.textContent = L.needVal; h.classList.add('warn'); } return; } md.close(); order(id, fd); flash(btn); });
    md.el.addEventListener('click', e => { if (e.target.closest('[data-x]')) md.close(); });
    const first = $('input,select', f); if (first) first.focus();
  }
  function showResult(r, o = {}) {
    if (!r || r.ready > now()) return;
    r.viewed = true; renderChips();
    const he = LANG === 'he', ctx = { he, pt: ptLine(), ptEn: `M, ${S.m.age}y${S.flags.weighed ? ', ' + S.m.wt + ' kg' : ''}`, unit: { PICU: 'PICU', WARD: 'PEDS WARD' }[r.loc] || 'PEDS ED', unitName: he ? { ED: 'מיון ילדים', PICU: 'טיפול נמרץ ילדים', WARD: 'מחלקת ילדים' }[r.loc || 'ED'] : { ED: 'Pediatric ED', PICU: 'PICU', WARD: 'Pediatric ward' }[r.loc || 'ED'], date: caseDate(r.drawn).D, dateReady: caseDate(r.ready).D, time: hhmm(C.startClock + r.drawn), ready: hhmm(C.startClock + r.ready), seed: r.drawn, arterial: r.v.arterial, hb: r.v.hb, age: S.m.age, adm: caseDate(0).D, seed0: Math.floor(S.date0 / 86400000) % 997 };
    let body, cls = 'wide';
    if (r.kind === 'ecg') { const tx = RV.ecgText(r.v, he); body = `<span class="eyebrow">${esc(oname('ecg'))} · ${ctx.time}</span><div class="ecghd" dir="ltr"><b>${esc(tx.head)}</b><span>${esc(tx.interp)}</span><small dir="auto">${esc(tx.note)}</small></div><div class="ecgpaper"><canvas id="ecgc"></canvas></div><p class="muted small" dir="ltr">25 mm/s · 10 mm/mV · 0.05–150 Hz</p>`; }
    else if (r.kind === 'vbg' || r.kind === 'abg') { body = RV.gasSlip(r.v, ctx); cls = 'gasp'; }
    else if (r.kind === 'poc' || r.kind === 'bhb') { body = `<span class="eyebrow">${esc(oname(r.kind))} · ${ctx.time}</span>${RV.meter(r.kind, r.v, he)}`; cls = 'meterw'; }
    else body = RV.report(r.kind, r.v, ctx);
    const nv = o.nav, prevNext = nv && nv[1] > 1 ? `<button class="btn ghost" data-nv="${nv[0] - 1}"${nv[0] ? '' : ' disabled'}>${he ? '→ קודם' : '← Earlier'}</button><span class="nvc">${nv[0] + 1} / ${nv[1]}</span><button class="btn ghost" data-nv="${nv[0] + 1}"${nv[0] < nv[1] - 1 ? '' : ' disabled'}>${he ? 'הבא ←' : 'Later →'}</button>` : '';
    const md = modal(`${body}<div class="row">${prevNext}${o.back ? `<button class="btn ghost" data-bk>${he ? 'לרשימה' : 'All results'}</button>` : ''}<button class="btn primary" data-x>${esc(L.back)}</button></div>`, cls);
    md.el.addEventListener('click', e => {
      const n = e.target.closest('[data-nv]'); if (n && !n.disabled) { md.close(); nv[2](+n.dataset.nv); return; }
      if (e.target.closest('[data-bk]')) { md.close(); o.back(); return; }
      if (e.target.closest('[data-x]') || e.target === md.el) md.close();
    });
    /* drawn straight away (the modal is already laid out); retried with timers, since animation frames stall in background tabs */
    if (r.kind === 'ecg') { let n = 0; const draw = () => { const cv = $('#ecgc', md.el); if (cv && cv.isConnected && RV.ecg12(cv, r.v) === false && n++ < 25) setTimeout(draw, 120); }; draw(); }
  }
  function flash(btn) { if (!btn) return; btn.classList.add('flashok'); setTimeout(() => btn.classList.remove('flashok'), 500); UI.Sound.ok && UI.Sound.ok(); }
  const ROWS = ['G', 'pH', 'pCO2', 'HCO3', 'Na', 'NaC', 'K', 'eOsm', 'BHB', 'GCS', 'pupils', 'UO', 'IN', 'OUT'];
  const FLOW_KINDS = ['poc', 'vbg', 'abg', 'chem', 'bhb', 'neuro', 'io'];
  function renderFlow() {
    const el = $('#flow'); if (!el || !S) return;
    const t = now(), cols = {};
    S.res.forEach(r => {
      if (!FLOW_KINDS.includes(r.kind)) return;
      const key = r.drawn; (cols[key] = cols[key] || { t: r.drawn, v: {}, src: {}, pend: false });
      if (r.ready > t) cols[key].pend = true; else { Object.assign(cols[key].v, r.v); Object.keys(r.v).forEach(k => { cols[key].src[k] = S.res.indexOf(r); }); }
    });
    const cs = Object.values(cols).sort((a, b) => a.t - b.t).slice(-12);
    cs.forEach(c => { const v = c.v; if (v.Na != null && v.G != null) { v.NaC = r1(v.Na + 1.6 * Math.max(0, v.G - 100) / 100); v.eOsm = Math.round(2 * v.Na + v.G / 18); } });
    const rows = ROWS.filter(k => cs.some(c => c.v[k] != null));
    const flag = (k, v) => ({ G: v < 70 || v > 250, pH: v < 7.3, HCO3: v < 18, K: v < 3.5 || v > 5.5, Na: v < 135 || v > 145, NaC: v < 135 || v > 150, P: v < 2 }[k] ? 'hi' : '');
    el.innerHTML = (cs.length ? `<div class="tw"><table><thead><tr><th>${esc(L.flow.time)}</th>${cs.map(c => `<th>${hhmm(C.startClock + c.t)}</th>`).join('')}</tr></thead><tbody>${rows.map(k => `<tr><th>${esc(L.flow[k])}</th>${cs.map(c => c.v[k] == null ? `<td>${c.pend ? '…' : ''}</td>` : (c.src[k] != null && !['neuro', 'io'].includes(S.res[c.src[k]].kind) ? `<td class="${flag(k, c.v[k])} go" data-res="${c.src[k]}">${esc(c.v[k])}</td>` : `<td class="${flag(k, c.v[k])}">${esc(k === 'pupils' ? L.pupilsV[c.v[k]] || c.v[k] : c.v[k])}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>` : `<p class="muted">${esc(L.none)}</p>`)
;
    const fn = $('#flowN'); if (fn) fn.textContent = cs.length ? hhmm(C.startClock + cs[cs.length - 1].t) : '';
  }
  /* treatments given, newest first, with the dose per kg and the amount it came to */
  const TX = ['o2', 'bolus', 'main', 'insDrip', 'insBolus', 'stopDrip', 'scRapid', 'scBasal', 'mannitol', 'hts', 'bicarb', 'kpo', 'kphos', 'dexBolus', 'prbc', 'ffp', 'plt', 'albumin', 'cagluc', 'ondan', 'paracet', 'morphine', 'midaz', 'ceftriax', 'intub', 'ventSet'];
  const TX_U = { mlkg: ['mlkg', 'ml'], gkg: ['gkg', 'g'], meqkg: ['meqkg', 'meq'], mmolkg: ['mmolkg', 'mmol'], mgkg: ['mgkg', 'mg'] };
  function txText(e) {
    const p = e.p || {}, w = e.w || dw(), U = L.txU, amt = (v, u) => `${v} ${L.f[u]} (${r1(v * w)} ${U[TX_U[u][1]]})`;
    if (e.id === 'o2') return EXTRA[LANG].modes[p.mode] || p.mode || '';
    if (e.id === 'intub') return p.sed ? `${RSI.sed[p.sed][0]} ${p.sedD} ${RSI.sed[p.sed][4]} · ${p.par === 'none' ? (LANG === 'he' ? 'ללא משתק' : 'no paralytic') : `${RSI.par[p.par][0]} ${p.parD} mg/kg`} · ${ventTxt(p)}` : '';
    if (e.id === 'ventSet') return ventTxt(p);
    if (e.id === 'bolus') return `${L.fl[p.fluid]} · ${amt(+p.mlkg, 'mlkg')} · ${p.over} ${L.min}`;
    if (e.id === 'main') return `${L.fl[p.base]}${+p.dex ? ' + D' + p.dex + '%' : ''}${+p.kcl ? ' + KCl ' + p.kcl : ''} · ${p.rate} ${L.mlh}`;
    if (e.id === 'insDrip') return `${p.dose} ${L.f.ukgh} (${r1(p.dose * w)} ${L.uh})`;
    if (['insBolus', 'scRapid', 'scBasal'].includes(e.id)) return `${p.dose} ${L.f.ukg} (${r1(p.dose * w)} ${L.u})`;
    const k = Object.keys(TX_U).find(k => p[k] != null);
    return k ? amt(+p[k], k) : '';
  }
  function renderTx() {
    const el = $('#txL'); if (!el || !S) return;
    const lg = S.log.filter(e => TX.includes(e.id) || (e.id === 'stop' && TX.includes(e.p.k)));
    el.innerHTML = lg.length ? lg.slice().reverse().map(e => `<li class="${e.id === 'stop' || e.id === 'stopDrip' ? '' : 'ok'}"><span>${hhmm(C.startClock + e.t)}</span><span><b>${esc(e.id === 'stop' ? L.stopped(oname(e.p.k)) : oname(e.id))}</b>${e.id === 'stop' ? '' : (t => t ? `<small class="txd">${esc(t)}</small>` : '')(txText(e))}</span></li>`).join('') : `<li><span></span><span>${esc(L.none)}</span></li>`;
    const n = $('#txN'); if (n) n.textContent = lg.length || '';
  }
  function renderFeed() {
    const el = $('#recL'); if (!el || !S) return;
    const who = { par: L.parSays, nurse: L.nurseSays, att: L.attSays, lab: L.lab, sys: L.sys, you: L.youSays, cons: L.consSays };
    el.innerHTML = S.msgs.slice().reverse().map(x => `<li class="${x.crit ? 'bad' : ''}"><span>${hhmm(C.startClock + x.t)}</span><span><b>${esc(who[x.kind])}</b> · ${esc(x.text)}${x.res != null ? ` <button class="rlink" data-res="${x.res}">${esc(L.view)}</button>` : ''}</span></li>`).join('');
    const ln = $('#logN'); if (ln) ln.textContent = S.msgs.length;
    renderSitu();
  }

  /* ---------------- scoring ---------------- */
  function rubric() {
    const m = S.m, w = m.wt, mt = M.maint(w), lg = S.log, R = [], he = LANG === 'he';
    const add = (key, wt, ok, en, heTxt, src, part) => R.push({ key, wt, got: part != null ? wt * part : ok ? wt : 0, ok: part != null ? part >= 0.99 : ok, txt: he ? heTxt : en, src });
    /* what the learner actually did, shown under each item */
    const why = (en, heTxt) => { R[R.length - 1].why = he ? heTxt : en; }, at = t => t == null ? (he ? 'לא בוצע' : 'not done') : `${hhmm(C.startClock + t)} (+${dur(t)})`;
    const T = id => firstT(id), within = (id, lim) => T(id) != null && T(id) <= lim;
    const res = S.res.filter(r => r.v && !r.v.txt && r.ready <= m.t).sort((a, b) => a.ready - b.ready);
    const firstRes = f => res.find(r => f(r.v));
    const mainAt = (t) => { let cur = null; lg.forEach(e => { if (e.t <= t && (e.id === 'main' || (e.id === 'stop' && e.p.k === 'main'))) cur = e.id === 'main' ? e.p : null; }); return cur; };
    const insAt = (t) => { let cur = 0; lg.forEach(e => { if (e.t <= t) { if (e.id === 'insDrip') cur = e.p.dose; if (e.id === 'stopDrip' || (e.id === 'stop' && e.p.k === 'insDrip')) cur = 0; } }); return cur; };
    const mains = lg.filter(e => e.id === 'main');
    const fluidStart = Math.min(...['bolus', 'main'].map(T).filter(x => x != null), Infinity);
    add('weigh', 4, within('weigh', 30), 'Weigh on arrival (doses and the deficit depend on it).', 'שקילה בקבלה (המינונים והחסר תלויים בה).', 'prot');
    why(`Weighed: ${at(T('weigh'))}; target within 30 min.`, `נשקל: ${at(T('weigh'))}; יעד תוך 30 דק׳.`);
    add('monitor', 4, (T('monitor') ?? S.flags.monAt ?? Infinity) <= 30, 'Full monitoring from the start (heart rhythm for potassium changes).', 'ניטור מלא מההתחלה (קצב הלב לשינויי אשלגן).', 'prot');
    why(`Monitor: ${at(T('monitor') ?? S.flags.monAt)}; target within 30 min.`, `מוניטור: ${at(T('monitor') ?? S.flags.monAt)}; יעד תוך 30 דק׳.`);
    add('labs0', 5, (within('vbg', 30) || within('chem', 30)) && (within('poc', 30) || within('bhb', 30) || within('ua', 30)), 'First bloods within 30 min: gas, electrolytes, glucose, ketones.', 'בדיקות ראשונות תוך 30 דקות: גזים, אלקטרוליטים, סוכר, קטונים.', 'prot');
    { const g = Math.min(...['vbg', 'chem'].map(T).filter(x => x != null), Infinity), k = Math.min(...['poc', 'bhb', 'ua'].map(T).filter(x => x != null), Infinity); why(`Gas/electrolytes: ${at(isFinite(g) ? g : null)}; glucose/ketones: ${at(isFinite(k) ? k : null)}.`, `גזים/אלקטרוליטים: ${at(isFinite(g) ? g : null)}; סוכר/קטונים: ${at(isFinite(k) ? k : null)}.`); }
    const attBefore = t => S.att.some(a => a <= t && a >= t - 30);
    /* was a potassium result (at least lo) back before time t? */
    const kKnownBy = (t, lo) => res.some(r => r.ready <= t && typeof r.v.K === 'number' && r.v.K >= lo);
    const bol = lg.filter(e => e.id === 'bolus' && e.t <= 240), bolKg = bol.reduce((a, e) => a + e.p.mlkg, 0);
    add('bolus', 8, null, `First hour: NaCl 0.9% 10 mL/kg over an hour (20 mL/kg only for severe dehydration with instability, with the attending). You gave ${r1(bolKg)} mL/kg.`, `שעה ראשונה: NaCl 0.9% 10 מ״ל/ק״ג במשך שעה (20 מ״ל/ק״ג רק בדהידרציה קשה עם חוסר יציבות, באישור כונן). ניתן: ${r1(bolKg)} מ״ל/ק״ג.`, 'prot',
      !bol.length || bol.some(e => e.p.over < 20 && e.p.mlkg > 10) ? 0 : (bol[0].t > 30 ? 0.4 : 1) * (bolKg >= 9 && bolKg <= 11 ? 1 : bolKg > 11 && bolKg <= 21 ? (attBefore(bol[bol.length - 1].t) ? 0.8 : 0.5) : bolKg < 9 ? 0.5 : 0) * (bol.every(e => e.p.fluid === 'NS') ? 1 : 0.7) * (bol.every(e => e.p.over >= 30) ? 1 : 0.4));
    why((bol.length && bol[0].t > 30 ? (he ? 'באיחור (יעד: תוך 30 דק׳). ' : 'Late (target: within 30 min). ') : '') + (bol.length ? bol.map(e => `${e.p.mlkg} ${he ? 'מ״ל/ק״ג' : 'mL/kg'} ${L.fl[e.p.fluid]} ${he ? 'במשך' : 'over'} ${e.p.over} ${L.min} @ ${hhmm(C.startClock + e.t)}`).join('; ') : 'No bolus in the first 4 h.'), (bol.length && bol[0].t > 30 ? 'באיחור (יעד: תוך 30 דק׳). ' : '') + (bol.length ? bol.map(e => `${e.p.mlkg} מ״ל/ק״ג ${L.fl[e.p.fluid]} במשך ${e.p.over} ${L.min} @ ${hhmm(C.startClock + e.t)}`).join('; ') : 'לא ניתן בולוס ב-4 השעות הראשונות.'));
    const ceCut = S.ceSignAt != null ? (lg.find(e => e.id === 'main' && e.t >= S.ceSignAt - 10 && mainAt(e.t - 1) && e.p.rate < mainAt(e.t - 1).rate * 0.9) || {}).t : undefined, offT = (lg.find(e => e.id === 'scRapid' || (e.id === 'stop' && e.p.k === 'main')) || {}).t;
    const endT = Math.min(m.t, 12 * 60, S.ceCritAt ?? Infinity, (lg.find(e => e.id === 'mannitol' || e.id === 'hts') || {}).t ?? Infinity, ceCut ?? Infinity, offT ?? Infinity);
    let rs = 0, rn = 0; for (let t = 120; t <= endT; t += 10) { const c = mainAt(t); rs += c ? c.rate : 0; rn++; }
    const avg = rn ? rs / rn : 0, ratio = avg / mt;
    add('fluids', 10, null, `From hour 2: deficit over 48 h + maintenance ≈ 1.5–2× maintenance (${Math.round(1.5 * mt)}–${Math.round(2 * mt)} mL/h), NaCl 0.9%; never above 2× unless in shock. Your average: ${Math.round(avg)} mL/h (${r1(ratio)}×).`, `משעה שנייה: חסר על פני 48 שעות + אחזקה ≈ פי 1.5–2 מהאחזקה (${Math.round(1.5 * mt)}–${Math.round(2 * mt)} מ״ל/שע׳), NaCl 0.9%; לא יותר מפי 2 אלא בשוק. הממוצע שלך: ${Math.round(avg)} מ״ל/שע׳ (פי ${r1(ratio)}).`, 'prot',
      !mains.length ? 0 : (mains[0].t > 120 ? 0.5 : 1) * (ratio >= 1.4 && ratio <= 2.05 ? 0.8 : ratio > 2.05 && ratio <= 2.5 ? 0.3 : ratio < 1.4 ? 0.3 : 0) + (mains.every(e => e.p.base === 'NS') && ratio <= 2.5 ? 0.2 : 0));
    why(`${mains.length ? `Maintenance fluids from ${at(mains[0].t)}` : 'No maintenance fluids'} (target by hour 2); average from hour 2: ${Math.round(avg)} mL/h (${r1(ratio)}× maintenance)${mains.length && !mains.every(e => e.p.base === 'NS') ? '; not NaCl 0.9% throughout' : ''}${!mains.length ? '; no maintenance fluids ordered' : ''}.`, `${mains.length ? `נוזלי אחזקה מ-${at(mains[0].t)}` : 'לא ניתנו נוזלי אחזקה'} (יעד עד שעה 2); ממוצע משעה 2: ${Math.round(avg)} מ״ל/שע׳ (${r1(ratio)}× אחזקה)${mains.length && !mains.every(e => e.p.base === 'NS') ? '; לא NaCl 0.9% לאורך כל הדרך' : ''}${!mains.length ? '; לא הוזמנו נוזלי אחזקה' : ''}.`);
    const ins = lg.filter(e => e.id === 'insDrip'), ins0 = ins[0];
    add('insStart', 10, did('insBolus') ? false : null, 'Insulin infusion after the first hour of fluids, 0.05 units/kg/h (0.1 only with the attending), never as a bolus; not before potassium is at least 3.3.', 'עירוי אינסולין אחרי שעת הנוזלים הראשונה, 0.05 יח׳/ק״ג/שע׳ (0.1 רק באישור כונן), אף פעם לא בבולוס; לא לפני שהאשלגן לפחות 3.3.', 'prot',
      !ins0 ? 0 : ((ins0.t - fluidStart >= 45 && ins0.t - fluidStart <= 150 ? 0.5 : 0.15) + (Math.abs(ins0.p.dose - 0.05) < 0.011 || (Math.abs(ins0.p.dose - 0.1) < 0.011 && attBefore(ins0.t)) ? 0.3 : 0) + (kKnownBy(ins0.t, 3.3) ? 0.2 : 0)) * (did('insBolus') ? 0 : 1));
    why(ins0 ? `Drip started ${at(ins0.t)}, ${ins0.t >= fluidStart ? `${Math.round(ins0.t - fluidStart)} min after fluids` : `${Math.round(fluidStart - ins0.t)} min before the fluids`}, ${ins0.p.dose} units/kg/h${Math.abs(ins0.p.dose - 0.1) < 0.011 ? (attBefore(ins0.t) ? ' (attending called)' : ' without calling the attending') : ''}${did('insBolus') ? '; an IV insulin bolus was given' : ''}${!kKnownBy(ins0.t, 3.3) ? '; started without a potassium result ≥ 3.3' : ''}.` : 'No insulin drip.', ins0 ? `העירוי התחיל ${at(ins0.t)}, ${ins0.t >= fluidStart ? `${Math.round(ins0.t - fluidStart)} דק׳ אחרי הנוזלים` : `${Math.round(fluidStart - ins0.t)} דק׳ לפני הנוזלים`}, ${ins0.p.dose} יח׳/ק״ג/שע׳${Math.abs(ins0.p.dose - 0.1) < 0.011 ? (attBefore(ins0.t) ? ' (אחרי שיחה לכונן)' : ' בלי שיחה לכונן') : ''}${did('insBolus') ? '; ניתן בולוס אינסולין IV' : ''}${!kKnownBy(ins0.t, 3.3) ? '; הותחל בלי תוצאת אשלגן ≥ 3.3' : ''}.` : 'לא הותחל עירוי אינסולין.');
    const maxIns = Math.max(0, ...ins.map(e => e.p.dose));
    let offAcid = 0; for (let t = ins0 ? ins0.t : m.t; t < m.t; t += 10) if (insAt(t) === 0 && (m.hist.find(h => h.t >= t) || {}).pH < 7.3) offAcid += 10;
    add('insMgmt', 6, maxIns <= 0.1 + 1e-9 && offAcid <= 60, 'Keep the drip at 0.05–0.1 units/kg/h until the acidosis is over; do not leave it off for long while still acidotic.', 'להשאיר עירוי 0.05–0.1 יח׳/ק״ג/שע׳ עד תיקון החמצת; לא להשאיר אותו כבוי זמן רב כשעדיין יש חמצת.', 'prot');
    { const hi = ins.find(e => e.p.dose >= 0.099); why(`Highest dose ${maxIns} units/kg/h${hi ? (attBefore(hi.t) ? ' (attending called)' : ' without calling the attending in the 30 min before') : ''}; after it started, the drip was off while still acidotic for ${offAcid} min (allowed ≤ 60).`, `מינון מרבי ${maxIns} יח׳/ק״ג/שע׳${hi ? (attBefore(hi.t) ? ' (אחרי שיחה לכונן)' : ' בלי שיחה לכונן בחצי השעה שלפני') : ''}; אחרי שהותחל, העירוי היה כבוי בזמן חמצת ${offAcid} דק׳ (מותר עד 60).`); }
    /* potassium against the results the learner had */
    let kOk = 1; const kNotes = [];
    /* potassium goes in with the maintenance fluids: judged from the later of the first K below 5 and the start of those fluids */
    const hK = th => m.hist.find(h => h.K < th), hit = (r, h) => r && h ? Math.min(r.ready, h.t + 150) : r ? r.ready : h ? h.t + 150 : null;   // the patient counts too, allowing for q2h checks
    const k50 = hit(firstRes(v => v.K != null && v.K < 5.5), hK(5.5)), mStart = mains.length ? mains[0].t : null;
    if (k50 != null && mStart != null) { const t0 = Math.max(k50, mStart); const c = lg.find(e => e.t >= t0 - 5 && e.t <= t0 + 60 && ((e.id === 'main' && e.p.kcl >= 40) || e.id === 'kpo')) || (mainAt(t0 + 60) && mainAt(t0 + 60).kcl >= 40); if (!c) { kOk -= 0.5; kNotes.push(he ? 'K<5.5 → KCl 40 מא״ק/ל׳' : 'K<5.5 → KCl 40'); } }
    const k35 = hit(firstRes(v => v.K != null && v.K < 3.5), hK(3.45));
    if (k35 != null) { const up = e => (e.id === 'main' && e.p.kcl >= 60) || e.id === 'kpo', c = (mainAt(k35) && mainAt(k35).kcl >= 60) || lg.find(e => e.t >= k35 && e.t <= k35 + 60 && up(e)), late = !c && lg.find(e => e.t > k35 + 60 && e.t <= k35 + 360 && up(e));
      if (late) { kOk -= 0.15; kNotes.push(he ? `K<3.5 → 60 באיחור (${Math.round(late.t - k35)} דק׳)` : `K<3.5 → 60 late (${Math.round(late.t - k35)} min)`); }
      else if (!c) { kOk -= 0.4; kNotes.push(he ? 'K<3.5 → 60 מא״ק/ל׳ או פומי' : 'K<3.5 → 60/L or PO'); } }
    if (res.some(r => r.v.K > 5.5 && mainAt(r.ready) && mainAt(r.ready).kcl > 0)) { kOk -= 0.3; kNotes.push(he ? 'K>5.5 עם KCl רץ' : 'K>5.5 with KCl running'); }
    if (Math.min(...m.hist.map(h => h.K)) < 2.8) kOk -= 0.3;
    { const kl = res.filter(r => typeof r.v.K === 'number').pop();
      if (kl && kl.v.K < 3.5 && !(mainAt(kl.ready) && mainAt(kl.ready).kcl >= 60) && !lg.some(e => e.t >= kl.ready && e.t <= kl.ready + 60 && ((e.id === 'main' && e.p.kcl >= 60) || e.id === 'kpo'))) { kOk -= 0.35; kNotes.push(he ? `אשלגן אחרון ${kl.v.K} לא תוקן` : `last K ${kl.v.K} not corrected`); }
      if (m.K < 3) { kOk -= 0.2; kNotes.push(he ? 'אשלגן מתחת ל-3 בסוף' : 'K below 3 at the end'); } }
    const kGiven = mains.some(e => e.p.kcl > 0) || did('kpo') || did('kphos'), kFirst = mains.find(e => e.p.kcl > 0);
    if (kFirst && !kKnownBy(kFirst.t, 0)) { kOk -= 0.3; kNotes.push(he ? 'KCl הותחל בלי תוצאת אשלגן' : 'KCl started without a potassium result'); } if (!kGiven && m.t > 180) kOk = 0;
    add('potassium', 10, null, 'Potassium: K above 5.5 → wait for urine and K below 5; 3.5–5.5 → KCl 40 mEq/L; below 3.5 → 60 mEq/L (or add oral potassium); peripheral line up to 40–60 mEq/L.', 'אשלגן: מעל 5.5 → להמתין למתן שתן ולירידה מתחת ל-5; 3.5–5.5 → KCl 40 מא״ק/ל׳; מתחת ל-3.5 → 60 מא״ק/ל׳ (או תוספת פומית); בווריד פריפרי עד 40–60 מא״ק/ל׳.', 'prot', Math.max(0, kOk));
    { const kmin = Math.min(...res.filter(r => typeof r.v.K === 'number').map(r => r.v.K), 99) < 99 ? Math.min(...res.filter(r => typeof r.v.K === 'number').map(r => r.v.K)) : Math.min(...m.hist.map(h => h.K)), km = mains.filter(e => e.p.kcl > 0); why(`${kGiven ? `KCl started ${at(km.length ? km[0].t : null)}` : 'No potassium given'}; lowest K ${r1(kmin)}${kNotes.length ? ` · missed: ${kNotes.join(', ')}` : ''}.`, `${kGiven ? `KCl הותחל ${at(km.length ? km[0].t : null)}` : 'לא ניתן אשלגן'}; האשלגן הנמוך ביותר ${r1(kmin)}${kNotes.length ? ` · הוחמץ: ${kNotes.join(', ')}` : ''}.`); }
    let dOk = 1; const hG = th => m.hist.find(h => h.G < th), g300 = hit(firstRes(v => v.G != null && v.G < 300), hG(300)), g180 = hit(firstRes(v => v.G != null && v.G < 180), hG(180));
    const exT = (lg.find(e => e.id === 'scRapid') || {}).t ?? Infinity;
    if (g300 != null && g300 < exT && !(mainAt(g300 + 60) && mainAt(g300 + 60).dex >= 5)) dOk -= 0.5;
    if (g180 != null && g180 < exT && !(mainAt(g180 + 60) && mainAt(g180 + 60).dex >= 10)) dOk -= 0.5;
    { const d0 = mains.find(e => e.p.dex > 0); if (d0 && m.hist.some(h => h.t > d0.t + 60 && h.G > 450)) dOk -= 0.5; }
    add('dextrose', 10, null, 'Add dextrose as glucose falls: below 300 → NaCl 0.9% + D5; below 180 → D10; target 150–250 mg/dL.', 'להוסיף גלוקוז כשהסוכר יורד: מתחת ל-300 → NaCl 0.9% + D5; מתחת ל-180 → D10; יעד 150–250 מ״ג/ד״ל.', 'prot', Math.max(0, dOk));
    { dn = e => e ? `D${e.p.dex} ` : '', h3 = hG(300), h18 = hG(180), d5 = mains.find(e => e.p.dex >= 5 && e.t >= (h3 ? h3.t - 30 : 0)), d10 = mains.find(e => e.p.dex >= 10 && e.t >= (h18 ? h18.t - 30 : 0)), d0 = mains.find(e => e.p.dex > 0), gmaxD = d0 ? Math.max(0, ...m.hist.filter(h => h.t > d0.t + 60).map(h => h.G)) : 0;
      why(`${h3 ? `Glucose < 300 from ${at(h3.t)} → ${dn(d5) || 'D5 '}${at(d5 ? d5.t : null)}` : 'Glucose never fell below 300'}${h18 ? `; < 180 from ${at(h18.t)} → D10 ${at(d10 ? d10.t : null)}` : ''}${gmaxD > 450 ? `; on dextrose glucose rose to ${Math.round(gmaxD)} (too much dextrose)` : ''}.`,
        `${h3 ? `סוכר < 300 מ-${at(h3.t)} → ${dn(d5) || 'D5 '}${at(d5 ? d5.t : null)}` : 'הסוכר לא ירד מתחת ל-300'}${h18 ? `; < 180 מ-${at(h18.t)} → D10 ${at(d10 ? d10.t : null)}` : ''}${gmaxD > 450 ? `; על גלוקוז הסוכר עלה עד ${Math.round(gmaxD)} (יותר מדי גלוקוז)` : ''}.`); }
    const gmin = Math.min(...m.hist.map(h => h.G));
    add('hypo', 6, gmin >= 70, `No hypoglycemia (lowest glucose ${Math.round(gmin)} mg/dL). Below 60: call the attending.`, `ללא היפוגליקמיה (הסוכר הנמוך ביותר ${Math.round(gmin)} מ״ג/ד״ל). מתחת ל-60: ייעוץ כונן.`, 'prot');
    { const lowT = m.hist.filter(h => h.G < 60).length * 5, first = m.hist.find(h => h.G < 70); why(first ? `Glucose under 70 from ${at(first.t)}; under 60 for ${lowT} min; lowest ${Math.round(gmin)}.` : '', first ? `סוכר מתחת ל-70 מ-${at(first.t)}; מתחת ל-60 במשך ${lowT} דק׳; הנמוך ביותר ${Math.round(gmin)}.` : ''); }
    const fastH = m.hourly.filter(h => h.dG > 100).length;
    add('gfall', 5, fastH <= 1, `Glucose falls by no more than 100 mg/dL per hour (${fastH === 0 ? 'never faster' : fastH === 1 ? 'one faster hour, allowed' : 'in ' + fastH + ' hours it fell faster'}).`, `הסוכר יורד לא יותר מ-100 מ״ג/ד״ל בשעה (${fastH === 0 ? 'אף שעה לא מהר יותר' : fastH === 1 ? 'שעה אחת מהר יותר, מותר' : 'ב-' + fastH + ' שעות הירידה הייתה מהירה יותר'}).`, 'prot');
    const st = k => lg.find(e => e.id === k && e.p && e.p.freq);
    const pocQ = lg.find(e => e.id === 'poc' && e.p.freq === 1 && e.t <= 60), labQ = lg.find(e => ['vbg', 'chem'].includes(e.id) && e.p.freq && e.p.freq <= 4 && e.t <= 120), neuQ = lg.find(e => e.id === 'neuro' && e.t <= 60);
    add('monitoring', 6, null, 'Standing orders: glucose every hour, neuro checks every hour, gases and electrolytes every 2–4 hours, hourly input/output.', 'הוראות קבועות: סוכר כל שעה, אומדן נוירולוגי כל שעה, גזים ואלקטרוליטים כל 2–4 שעות, מאזן נוזלים כל שעה.', 'prot', (pocQ ? 0.35 : 0) + (labQ ? 0.3 : 0) + (neuQ ? 0.25 : 0) + (did('io') ? 0.1 : 0));
    { const late = [[pocQ, lg.find(e => e.id === 'poc' && e.p.freq === 1), he ? 'סוכר כל שעה (תוך שעה מההגעה)' : 'hourly glucose (within the first hour)'], [labQ, lg.find(e => ['vbg', 'chem'].includes(e.id) && e.p.freq && e.p.freq <= 4), he ? 'גזים/אלקטרוליטים כל 2–4 שעות (תוך שעתיים)' : 'gas/electrolytes every 2–4 h (within 2 h)'], [neuQ, lg.find(e => e.id === 'neuro'), he ? 'אומדן נוירולוגי (תוך שעה)' : 'neuro checks (within the first hour)'], [did('io'), null, he ? 'מאזן נוזלים' : 'fluid balance']].filter(x => !x[0]).map(x => x[1] ? `${x[2]} — ${he ? 'באיחור' : 'late'}, ${at(x[1].t)}` : `${x[2]} — ${he ? 'חסר' : 'missing'}`);
      why(late.length ? late.join('; ') : 'All standing orders in time.', late.length ? late.join('; ') : 'כל ההוראות הקבועות נרשמו בזמן.'); }
    add('nobicarb', 4, !did('bicarb'), 'No bicarbonate: it raises the risk of hypokalemia and cerebral edema.', 'ללא ביקרבונט: מעלה סיכון להיפוקלמיה ולבצקת מוחית.', 'nelson');
    { const b = lg.find(e => e.id === 'bicarb'); if (b) why(`Bicarbonate ${b.p.meqkg} mEq/kg at ${at(b.t)}.`, `ביקרבונט ${b.p.meqkg} מא״ק/ק״ג ב-${at(b.t)}.`); }
    const poE = lg.find(e => e.id === 'po' && !e.refused);
    add('npo', 3, within('npo', 60) && (!poE || res.some(r => r.ready <= poE.t && r.v.pH > 7.3 && r.v.HCO3 > 18)), 'Nothing by mouth until the acidosis has resolved.', 'צום עד תיקון החמצת.', 'prot');
    why(`NPO: ${at(T('npo'))} (target within 1 h)${poE ? `; first drink ${at(poE.t)}${poE.fail ? ' while still acidotic' : ''}` : ''}.`, `צום: ${at(T('npo'))} (יעד תוך שעה)${poE ? `; שתייה ראשונה ${at(poE.t)}${poE.fail ? ' עוד בזמן חמצת' : ''}` : ''}.`);
    add('picu', 4, within('picu', 120), 'Severe DKA (pH below 7.1) is treated in the PICU.', 'DKA קשה (pH מתחת ל-7.1) מטופל בטיפול נמרץ.', 'prot');
    why(`PICU requested: ${at(T('picu'))}; target within 2 h.`, `בקשה לטיפול נמרץ: ${at(T('picu'))}; יעד תוך שעתיים.`);
    const osmEarly = S.ceCritAt == null && S.ceSignAt != null && lg.find(e => (e.id === 'mannitol' || e.id === 'hts') && e.t >= S.ceSignAt);
    if (S.ceCritAt != null || osmEarly) {
      const c0 = S.ceCritAt ?? S.ceSignAt, osm30 = lg.find(e => (e.id === 'mannitol' || e.id === 'hts') && e.t >= c0 - 30 && e.t <= c0 + 30), osm = osm30 || lg.find(e => (e.id === 'mannitol' || e.id === 'hts') && e.t > c0 + 30 && e.t <= c0 + 60);
      const osmT = (lg.find(e => (e.id === 'mannitol' || e.id === 'hts') && e.t >= c0 - 30) || {}).t ?? c0, before = mainAt(c0 - 1), cut = before && lg.find(e => e.id === 'main' && e.t >= c0 - 30 && e.t <= Math.max(c0 + 45, osmT + 30) && e.p.rate <= before.rate * 0.75 + 1);
      const part = (osm30 ? 0.55 : osm ? 0.3 : 0) + (cut ? 0.15 : 0) + (m.headUp && T('headUp') <= c0 + 45 ? 0.1 : 0) + (lg.some(e => e.id === 'insDrip' && e.t >= c0 - 30 && e.t <= c0 + 60 && e.p.dose <= 0.03) ? 0.1 : 0) + (S.att.some(a => a >= c0 - 30 && a <= c0 + 45) ? 0.1 : 0);
      add('ce', 11, null, 'Cerebral edema (headache, vomiting, heart rate falling >20, drowsy): within 30 min mannitol 0.5–1 g/kg over 20 min (or NaCl 3% 5–10 mL/kg), cut fluids by a third, head up 30°, insulin 0.025 units/kg/h, call the attending; CT only after stabilizing.', 'בצקת מוחית (כאב ראש, הקאה, ירידת דופק מעל 20, ישנוניות): תוך 30 דקות מניטול 0.5–1 גר׳/ק״ג במשך 20 דקות (או NaCl 3% 5–10 מ״ל/ק״ג), הורדת נוזלים בשליש, ראש 30°, אינסולין 0.025 יח׳/ק״ג/שע׳, שיחה לכונן; CT רק אחרי ייצוב.', 'prot', part);
      { const os = lg.find(e => (e.id === 'mannitol' || e.id === 'hts') && e.t >= (S.ceSignAt ?? c0) - 30), s0 = S.ceSignAt, cut0 = cut ? (he ? `; נוזלים ${before.rate}→${cut.p.rate} (−${Math.round(100 - 100 * cut.p.rate / before.rate)}%)` : `; fluids ${before.rate}→${cut.p.rate} (−${Math.round(100 - 100 * cut.p.rate / before.rate)}%)`) : (he ? '; הנוזלים לא הופחתו בשליש (תוך 45 דק׳ מהאבחנה או 30 מהטיפול האוסמוטי)' : '; fluids not cut by a third (within 45 min of the alarm or 30 of osmotherapy)'), ins0x = lg.some(e => e.id === 'insDrip' && e.t >= c0 - 30 && e.t <= c0 + 60 && e.p.dose <= 0.03) ? '' : (he ? '; האינסולין לא הופחת ל-0.025' : '; insulin not lowered to 0.025'), att0 = S.att.some(a => a >= c0 - 30 && a <= c0 + 45) ? '' : (he ? '; לא הייתה שיחה לכונן' : '; attending not called');
        why(`First signs (headache/vomiting) ${at(s0)}${S.ceCritAt != null ? `; diagnostic sign (HR fall) ${at(S.ceCritAt)}` : ''}; osmotherapy ${os ? `${at(os.t)} = ${Math.round(os.t - c0)} min after ${S.ceCritAt != null ? 'the HR fall' : 'the first signs'}` : 'not given'}${cut0}${ins0x}${att0}.`, `סימנים ראשונים (כאב ראש/הקאה) ${at(s0)}${S.ceCritAt != null ? `; סימן אבחנתי (ירידת דופק) ${at(S.ceCritAt)}` : ''}; טיפול אוסמוטי ${os ? `${at(os.t)} = ${Math.round(os.t - c0)} דק׳ אחרי ${S.ceCritAt != null ? 'ירידת הדופק' : 'הסימנים הראשונים'}` : 'לא ניתן'}${cut0}${ins0x}${att0}.`); }
    }
    const sc = lg.find(e => e.id === 'scRapid'), clock = t => (C.startClock + t) % 1440;
    const mealOk = sc && S.flags.poAt != null && S.flags.poAt >= sc.t - 5 && S.flags.poAt <= sc.t + 45;
    const exitOk = mealOk && res.some(r => r.ready <= sc.t && r.v.pH > 7.3 && r.v.HCO3 > 18) && S.flags.po && lg.some(e => (e.id === 'stopDrip' || (e.id === 'stop' && e.p.k === 'insDrip')) && e.t >= sc.t - 5 && e.t <= sc.t + 60) && !(clock(sc.t) >= 23 * 60 || clock(sc.t) < 6 * 60);
    const handedOver = S.handover != null && !sc && !res.some(r => r.ready <= S.handover && r.v.pH > 7.3 && r.v.HCO3 > 18);
    add('exit', handedOver ? 0 : 6, !!exitOk, 'Leaving DKA: pH above 7.3 and HCO₃ above 18, eating without nausea; rapid insulin SC right before a meal, then stop the drip. Not in the middle of the night.', 'יציאה מ-DKA: pH מעל 7.3 ו-HCO₃ מעל 18, אוכל בלי בחילה; אינסולין מהיר תת-עורי מיד לפני ארוחה, ואז להפסיק את העירוי. לא באמצע הלילה.', 'prot');
    why(sc ? `Rapid SC insulin ${at(sc.t)}${S.flags.po ? '' : '; he did not eat'}${!res.some(r => r.ready <= sc.t && r.v.pH > 7.3 && r.v.HCO3 > 18) ? '; no gas showing pH > 7.3 and HCO₃ > 18 before it' : ''}.` : 'He never left DKA care (no SC insulin before a meal).', sc ? `אינסולין מהיר תת-עורי ${at(sc.t)}${S.flags.po ? '' : '; לא אכל'}${!res.some(r => r.ready <= sc.t && r.v.pH > 7.3 && r.v.HCO3 > 18) ? '; לא היה גז עם pH מעל 7.3 ו-HCO₃ מעל 18 לפני כן' : ''}.` : 'לא הגיע ליציאה מ-DKA (אין אינסולין תת-עורי לפני ארוחה).');
    if (handedOver) { R[R.length - 1].ho = true; R[R.length - 1].why = he ? `נמסר למשמרת הבוקר ב-${hhmm(C.startClock + S.handover)} לפני סיום החמצת: היציאה מ-DKA לא נשפטת.` : `Handed over to the morning team at ${hhmm(C.startClock + S.handover)} before the acidosis resolved: the exit is not scored.`; }
    if (sc) { const stop = lg.find(e => (e.id === 'stopDrip' || (e.id === 'stop' && e.p.k === 'insDrip')) && e.t >= sc.t - 5), night = clock(sc.t) >= 23 * 60 || clock(sc.t) < 6 * 60;
      R[R.length - 1].why += (!stop ? (he ? ' העירוי לא הופסק.' : ' The drip was not stopped.') : stop.t > sc.t + 60 ? (he ? ` העירוי הופסק ${Math.round(stop.t - sc.t)} דק׳ אחרי האינסולין (יעד: עד 60).` : ` The drip was stopped ${Math.round(stop.t - sc.t)} min after the insulin (target: within 60).`) : '') + (night ? (he ? ' באמצע הלילה.' : ' In the middle of the night.') : ''); }
    if (sc && S.flags.poAt != null && !mealOk) R[R.length - 1].why += he ? ` הוא אכל ב-${at(S.flags.poAt)}, לפני האינסולין: האינסולין המהיר ניתן מיד לפני הארוחה.` : ` He ate at ${at(S.flags.poAt)}, before the insulin: rapid insulin goes right before the meal.`;
    const ceMin = m.hist.filter(h => h.ce > 0.35).length * 5;
    add('brain', 8, ceMin <= 60 && !(m.injury > 0) && !m.dead, `Neurological outcome: ${m.dead ? 'death' : m.injury > 0 ? 'lasting brain injury' : ceMin ? `signs of raised intracranial pressure for about ${ceMin} min` : 'no lasting signs of raised intracranial pressure'}.`, `תוצאה נוירולוגית: ${m.dead ? 'מוות' : m.injury > 0 ? 'נזק מוחי מתמשך' : ceMin ? `סימני לחץ תוך-גולגולתי מוגבר במשך כ-${ceMin} דק׳` : 'ללא סימנים ממושכים של לחץ תוך-גולגולתי מוגבר'}.`, 'prot');
    why(m.dead ? (m.deadCause === 'acid' ? `He died of severe acidosis on the ventilator (pH below 6.9) at ${at(m.deadAt)}.` : `He died of cerebral herniation at ${at(m.deadAt)}.`) : m.injury > 0 ? `Lasting brain injury (${m.hypoMin ? `${m.hypoMin} min of glucose < 40` : 'herniation'}).` : `Signs of raised pressure for ${ceMin} min.`, m.dead ? (m.deadCause === 'acid' ? `נפטר מחמצת קשה בהנשמה (pH מתחת ל-6.9) ב-${at(m.deadAt)}.` : `נפטר מהרניאציה מוחית ב-${at(m.deadAt)}.`) : m.injury > 0 ? `נזק מוחי מתמשך (${m.hypoMin ? `${m.hypoMin} דק׳ של סוכר מתחת ל-40` : 'הרניאציה'}).` : `סימני לחץ תוך-גולגלתי במשך ${ceMin} דק׳.`);
    { const ib = lg.find(e => e.id === 'intub');
      if (ib && S.flags.intubAt != null && ((ib.ce ?? 0) >= 0.55 || (ib.gcs ?? 15) <= 8)) {
        const ip = ib.p || {}, hh = m.hist.filter(x => x.t <= S.flags.intubAt).pop() || m.hist[0], tgt = Math.round(1.5 * hh.HCO3 + 8), ex = vExp(ip.tv, ip.rr);
        const kAt = res.filter(r => r.ready <= ib.t && typeof r.v.K === 'number').pop(), sedOk = !!ip.sed && !['propofol', 'thio'].includes(ip.sed), parOk = ip.par === 'roc' || (ip.par === 'sux' && !!kAt && kAt.v.K < 5.5);
        const vOk = ex != null && Math.abs(ex - tgt) <= 7, gas = res.some(r => ['vbg', 'abg'].includes(r.kind) && r.drawn >= S.flags.intubAt && r.drawn <= S.flags.intubAt + 30);
        add('vent', 6, null, 'Intubation in DKA: induction that keeps the blood pressure, a paralytic, and a ventilator set to the low pCO₂ he had before he deteriorated (high minute ventilation); a gas within 30 min.', 'אינטובציה ב-DKA: אינדוקציה ששומרת על לחץ הדם, משתק, ומנשם שמכוון ל-pCO₂ הנמוך שהיה לו לפני ההידרדרות (נפח דקה גבוה); גז תוך 30 דקות.', 'prot', 0.25 * sedOk + 0.25 * parOk + 0.3 * vOk + 0.2 * gas);
        const sedN = ip.sed ? `${RSI.sed[ip.sed][0]} ${ip.sedD} ${RSI.sed[ip.sed][4]}` : '?', parN = !ip.par || ip.par === 'none' ? (he ? 'ללא משתק' : 'no paralytic') : `${RSI.par[ip.par][0]} ${ip.parD} mg/kg`;
        why(`Induction: ${sedN}${sedOk ? '' : ' (drops the blood pressure in a dehydrated child)'}; ${parN}${ip.par === 'sux' && !parOk ? ' (succinylcholine raises K; no K below 5.5 on record)' : ip.par === 'none' ? ' (failed first attempt)' : ''}. Ventilator TV ${ip.tv} × RR ${ip.rr} → expected pCO₂ ≈ ${ex}; his pre-deterioration pCO₂ ≈ ${tgt}. ${gas ? 'Gas checked within 30 min.' : 'No gas within 30 min.'}`,
          `אינדוקציה: ${sedN}${sedOk ? '' : ' (מוריד לחץ דם בילד מיובש)'}; ${parN}${ip.par === 'sux' && !parOk ? ' (סוקסינילכולין מעלה אשלגן; אין K מתחת ל-5.5 בתיק)' : ip.par === 'none' ? ' (ניסיון ראשון נכשל)' : ''}. מנשם TV ${ip.tv} × RR ${ip.rr} → pCO₂ צפוי ≈ ${ex}; ה-pCO₂ שלו לפני ההידרדרות ≈ ${tgt}. ${gas ? 'נבדק גז תוך 30 דק׳.' : 'לא נבדק גז תוך 30 דק׳.'}`);
      } }
    { const par = T('parents');
      add('family', 3, par != null && par <= 120, 'Talk with the parents early: the diagnosis, the plan, and what to tell you (headache, confusion, vomiting).', 'שיחה עם ההורים מוקדם: האבחנה, התוכנית, ומה לדווח (כאב ראש, בלבול, הקאות).', 'gen');
      why(`First talk with the parents: ${at(par)}; target within 2 h.`, `שיחה ראשונה עם ההורים: ${at(par)}; יעד: תוך שעתיים.`); }
    const extra = lg.filter(e => UNNEEDED[e.id] != null && !(['intub', 'midaz', 'foley'].includes(e.id) && ((e.ce ?? 0) >= 0.55 || (e.gcs ?? 15) <= 8))).map(e => e.id), pen = [...new Set(extra)].reduce((a, k) => a + UNNEEDED[k], 0);
    const stopped = [...new Set(lg.filter(e => e.id === 'objected' && !extra.includes(e.p.k) && e.p.who !== 'nurse').map(e => e.p.k))], byNurse = lg.some(e => e.id === 'objected' && e.p.who === 'nurse' && !['dupLab', 'bolusRunning'].includes(e.p.dyn)), pen2 = stopped.reduce((a, k) => a + Math.ceil((UNNEEDED[k] || 2) / 2), 0);
    const sAtt = stopped.filter(k => lg.some(e => e.id === 'objected' && e.p.k === k && e.p.who !== 'nurse')), sNur = stopped.filter(k => !sAtt.includes(k));
    if (stopped.length) add('stopped', 0, false, `Stopped before they happened (−${pen2}): ${[sAtt.length && 'attending: ' + sAtt.map(oname).join(', '), sNur.length && 'nurse: ' + sNur.map(oname).join(', ')].filter(Boolean).join('; ')}. Think it through before ordering.`, `נעצרו לפני ביצוע (מינוס ${pen2}): ${[sAtt.length && 'כונן: ' + sAtt.map(oname).join(', '), sNur.length && 'אחות: ' + sNur.map(oname).join(', ')].filter(Boolean).join('; ')}. לחשוב לפני שמזמינים.`, 'nelson');
    const overAll = [...new Set(lg.filter(e => e.id === 'overrode').map(e => e.p.k))], over = overAll.filter(k => !extra.includes(k)), pen3 = over.length * 2;
    if (overAll.length) add('overrode', 0, false, `Done against the attending's objection (−${pen3}${over.length < overAll.length ? '; the rest are counted as unnecessary' : ''}): ${overAll.map(oname).join(', ')}.`, `בוצע בניגוד להתנגדות הכונן (מינוס ${pen3}${over.length < overAll.length ? '; השאר נספרו כמיותרים' : ''}): ${overAll.map(oname).join(', ')}.`, 'nelson');
    if (extra.length) add('extra', 0, false, `Unnecessary interventions: ${[...new Set(extra)].map(oname).join(', ')} (−${pen}).`, `התערבויות מיותרות: ${[...new Set(extra)].map(oname).join(', ')} (מינוס ${pen}).`, 'nelson');
    { const naK = (k, en, heT) => { const r = R.find(x => x.key === k); if (r) { r.wt = 0; r.got = 0; r.ok = false; r.ho = true; r.why = he ? heT : en; } }, noIns = !ins.length && !did('scRapid') && !did('insBolus');
      if (!ins.length) naK('insMgmt', 'Not scored: the insulin drip never started.', 'לא נשפט: עירוי האינסולין לא התחיל.');
      if (!kGiven && m.t <= 180) naK('potassium', 'Not scored: no fluids with potassium ran before the case ended.', 'לא נשפט: לא רצו נוזלים עם אשלגן לפני סוף המקרה.');
      if (g300 == null) naK('dextrose', 'Not scored: glucose never fell below 300.', 'לא נשפט: הסוכר לא ירד מתחת ל-300.');
      if (noIns) { naK('hypo', 'Not scored: no insulin was given.', 'לא נשפט: לא ניתן אינסולין.'); naK('gfall', 'Not scored: no insulin was given.', 'לא נשפט: לא ניתן אינסולין.'); } }
    const max = R.reduce((a, r) => a + r.wt, 0); let got = R.reduce((a, r) => a + r.got, 0) - pen - pen2 - pen3;
    if (m.dead) got *= 0.3;
    return { R, pct: Math.max(0, Math.round(got / max * 100)) };
  }

  /* ---------------- debrief ---------------- */
  /* debrief timeline: everything that was done, what came back and what happened, in order; treatments also mark the charts */
  const TL_CATS = ['tx', 'proc', 'call', 'res', 'alert', 'obj'];
  function tlEvents() {
    const he = LANG === 'he', end = S.m.t, E = [], add = (t, cat, txt, sub) => { if (t != null && t <= end) E.push({ t, cat, txt, sub }); };
    const NURS = ['weigh', 'npo', 'headUp', 'monitor', 'neuro', 'io', 'po', 'examQ', 'historyQ', 'ecg'], CALL = ['att', 'endo', 'surg', 'picu', 'ward', 'parents'];
    const seen = {};
    S.log.forEach(e => {
      if (TX.includes(e.id)) add(e.t, 'tx', oname(e.id), [txText(e), e.p && e.p.instr].filter(Boolean).join(' · '));
      else if (e.id === 'stop') add(e.t, 'tx', L.stopped(oname(e.p.k)));
      else if (PROC[e.id]) add(e.t, 'proc', oname(e.id), L.procInfo(PROC[e.id].by === 'md', PROC[e.id].min));
      else if (NURS.includes(e.id)) { if ((e.id === 'examQ' || e.id === 'historyQ') && seen[e.id]) return; seen[e.id] = 1; add(e.t, 'proc', oname(e.id)); }
      else if (CALL.includes(e.id)) add(e.t, 'call', oname(e.id));
      else if (e.id === 'objected') add(e.t, 'obj', `${L.tl.stoppedBy[e.p.who === 'nurse' ? 1 : 0]}: ${oname(e.p.k)}`);
      else if (e.id === 'overrode') add(e.t, 'obj', `${L.tl.overrode}: ${oname(e.p.k)}`);
    });
    const K = [['pH', 'pH', 2], ['HCO3', 'HCO₃', 1], ['K', 'K', 1], ['Na', 'Na', 0], ['G', he ? 'סוכר' : 'Glu', 0], ['BHB', he ? 'קטונים' : 'BHB', 1]];
    S.res.forEach(r => {
      if (r.ready > end) return;
      const v = r.v || {}, nums = K.filter(([k]) => typeof v[k] === 'number').map(([k, n, dp]) => `${n} ${(+v[k]).toFixed(dp)}`);
      if (nums.length) add(r.ready, 'res', oname(r.kind), nums.join(' · '));
      else if (r.kind === 'ecg') add(r.ready, 'res', oname(r.kind), RV.ecgText(v, he).interp);
      else if (v.txt != null) add(r.ready, 'res', oname(r.kind), L.tl.reported);
    });
    S.msgs.forEach(x => { if (x.crit && x.kind !== 'sys' && !/[?？]$/.test(x.text.trim())) add(x.t, 'alert', x.text); });
    if (S.flags.picuMovedAt != null) add(S.flags.picuMovedAt, 'call', L.tl.inPicu);
    if (S.flags.wardMovedAt != null) add(S.flags.wardMovedAt, 'call', L.tl.inWard);
    if (S.flags.poAt != null) add(S.flags.poAt, 'proc', L.tl.ate);
    if (S.handover != null) add(S.handover, 'call', L.msgs.hoDone);
    if (S.m.dead) add(S.m.deadAt ?? end, 'alert', L.outDied);
    const order = { alert: 0, call: 1, tx: 2, proc: 3, obj: 4, res: 5 };
    return E.sort((a, b) => a.t - b.t || order[a.cat] - order[b.cat]);
  }
  function timelineHTML(E) {
    const cnt = c => E.filter(e => e.cat === c).length;
    return `<h3>${esc(L.tl.title)}</h3><div class="tlf">${TL_CATS.filter(cnt).map(c => `<button class="tlc on c-${c}" data-tlc="${c}">${esc(L.tl.cats[c])} <small>${cnt(c)}</small></button>`).join('')}</div>
      <ol class="tl">${E.map(e => `<li class="c-${e.cat}"><time>${hhmm(C.startClock + e.t)}<small>+${dur(e.t)}</small></time><i></i><span><b>${esc(e.txt)}</b>${e.sub ? `<em>${esc(e.sub)}</em>` : ''}</span></li>`).join('')}</ol>`;
  }
  function chart(key, lab, lo, hi, color, a0, a1) {
    const H = S.m.hist; if (!H.length) return '';
    const W = 320, Ht = 110, t1 = H[H.length - 1].t || 1, vs = H.map(h => h[key]), mn = Math.min(a0 ?? lo, ...vs), mx = Math.max(a1 ?? hi, ...vs);
    const x = t => 30 + (W - 36) * t / t1, y = v => 8 + (Ht - 26) * (1 - (v - mn) / (mx - mn || 1));
    const path = H.map((h, i) => `${i ? 'L' : 'M'}${x(h.t).toFixed(1)},${y(h[key]).toFixed(1)}`).join('');
    return `<figure class="ch"><figcaption>${esc(lab)}</figcaption><svg viewBox="0 0 ${W} ${Ht}"><rect x="30" y="${y(hi)}" width="${W - 36}" height="${Math.max(0, y(lo) - y(hi))}" fill="rgba(62,240,143,.08)"/>${(S.tlTx || []).filter(e => e.t <= t1).map(e => `<line x1="${x(e.t).toFixed(1)}" x2="${x(e.t).toFixed(1)}" y1="8" y2="${Ht - 18}" stroke="#7aa7ff" stroke-opacity=".22"><title>${hhmm(C.startClock + e.t)} ${esc(e.txt)}${e.sub ? ' · ' + esc(e.sub) : ''}</title></line><path d="M${x(e.t).toFixed(1)},${Ht - 18} l-3,-5 h6z" fill="#7aa7ff" opacity=".75"><title>${hhmm(C.startClock + e.t)} ${esc(e.txt)}${e.sub ? ' · ' + esc(e.sub) : ''}</title></path>`).join('')}<path d="${path}" fill="none" stroke="${color}" stroke-width="1.8"/>
      <text x="27" y="${y(mx) + 4}" text-anchor="end" fill="#8aa4ae" font-size="9">${mx >= 20 ? Math.round(mx) : r1(mx)}</text><text x="27" y="${y(mn)}" text-anchor="end" fill="#8aa4ae" font-size="9">${mn >= 20 ? Math.round(mn) : r1(mn)}</text>${Array.from({ length: Math.floor(t1 / 120) + 1 }, (_, i) => i * 120).map(tt => `<line x1="${x(tt)}" x2="${x(tt)}" y1="${Ht - 18}" y2="${Ht - 14}" stroke="#4d6772"/><text x="${x(tt)}" y="${Ht - 4}" text-anchor="${x(tt) > W - 24 ? 'end' : 'middle'}" fill="#8aa4ae" font-size="9">${hhmm(C.startClock + tt)}</text>`).join('')}<text x="${W - 4}" y="${y(hi) + 9}" text-anchor="end" fill="#3ef08f" font-size="8.5" opacity=".8">${lo >= 20 ? Math.round(lo) : r1(lo)}–${hi >= 20 ? Math.round(hi) : r1(hi)}</text></svg></figure>`;
  }
  function endCase() {
    if (!S || S.ended) return;
    S.ended = true; S.speed = 0; stopLoop(); $$('.scrim,.redeb').forEach(x => x.remove());
    const { R, pct } = rubric(), SRC = C.src, TLE = tlEvents(); S.tlTx = TLE.filter(e => e.cat === 'tx');
    const prev = histGet().filter(x => x.c === C.id), prevBest = prev.length ? Math.max(...prev.map(x => x.pct)) : null;
    if (!S.saved) { S.saved = { n: prev.length + 1, best: prevBest, G: award(R, pct, prev.length ? prev[prev.length - 1].pct : null) }; ls('psim-hist', JSON.stringify(prev.concat({ c: C.id, d: Date.now(), pct, lv: LEVEL, o: S.m.dead ? 'd' : S.m.injury > 0 ? 'i' : 'ok', t: S.m.t, ho: S.handover != null }).concat(histGet().filter(x => x.c !== C.id)).slice(-80))); }
    const PN = C.notes || {};
    const md = modal(`<h2>${esc(L.debrief)} · ${esc(CT().title)}</h2>
      <div class="score"><b>${pct}%</b><span>${esc(S.m.dead ? L.outDied : S.m.injury > 0 ? L.outInjury : L.outOk)}${S.handover != null ? ' · ' + esc(L.msgs.hoDone) : ''} · +${esc(dur(S.m.t))}</span><small class="hline">${esc(L.hist.line(S.saved.n, S.saved.best))}</small></div>
      ${gamHTML(S.saved.G)}
      <h3>${esc(L.rubric)}</h3><ul class="rub">${R.map(r => `<li class="${r.ho ? 'na' : r.ok ? 'ok' : r.got > 0 ? 'part' : 'bad'}"><span class="mk">${r.ho ? '–' : r.ok ? '✓' : r.got > 0 ? '◐' : '✗'}</span><span>${esc(r.txt)}${r.why && !r.ok ? `<em class="why">${esc(r.why)}</em>` : ''}${!r.ok && PN[r.key] ? `<details class="pn"><summary>${esc(L.pnT)}</summary><p>${esc(PN[r.key][LANG])}</p></details>` : ''} <small>${esc((SRC[r.src] || {})[LANG] || '')}</small></span></li>`).join('')}</ul>
      <h3>${esc(L.charts)}</h3><div class="charts">${chart('G', L.flow.G, 150, 250, '#ffd84a')}${chart('K', L.flow.K, 4, 5, '#3ef08f')}${chart('pH', 'pH', 7.3, 7.45, '#4fc3ff')}${chart('NaC', L.flow.NaC, 135, 145, '#ff8a4c')}${chart('eOsm', L.flow.eOsm, 280, 300, '#c39bff')}${chart('GCS', 'GCS', 14, 15, '#ff6b7a', 3, 15)}</div><p class="tlk">${esc(L.tl.marks)}</p>
      ${timelineHTML(TLE)}
      <div class="row"><button class="btn primary" data-again>${esc(L.again)}</button><button class="btn ghost" data-home2>${esc(L.home)}</button><button class="btn ghost" data-lang>${esc(L.lang)}</button><button class="btn ghost" data-chart>${esc(L.toChart)}</button></div>`, 'wide');
    md.el.addEventListener('click', e => { const tc = e.target.closest('[data-tlc]'); if (tc) { tc.classList.toggle('on'); $('.tl', md.el).classList.toggle('h-' + tc.dataset.tlc, !tc.classList.contains('on')); return; } });
    md.el.addEventListener('click', e => { if (e.target.closest('[data-chart]')) { md.close(); const b = document.createElement('button'); b.className = 'btn primary redeb'; b.textContent = L.debrief; b.onclick = () => { b.remove(); S.ended = false; endCase(); }; document.body.appendChild(b); return; } if (e.target.closest('[data-again]')) { md.close(); startCase(); } else if (e.target.closest('[data-home2]')) { md.close(); home(); } });
  }

  /* test hook (?debug) */
  if (/[?&]debug/.test(location.search)) window.__sim = { get S() { return S; }, order, minute, endCase, rubric, startCase };
  home();
})();
