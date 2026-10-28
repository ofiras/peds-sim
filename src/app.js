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
  const BED = { big: ['examQ', 'historyQ', 'att'], sm: ['weigh', 'npo', 'headUp', 'neuro', 'io', 'po', 'endo', 'surg', 'picu', 'ward'] };
  const BED_ICON = { examQ: 'auscult', historyQ: 'history', att: 'ems', weigh: 'glucose', npo: 'position', headUp: 'position', neuro: 'resp', io: 'fluid', po: 'albuterol', endo: 'ems', surg: 'ems', picu: 'ems', ward: 'ems' };
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
    en: { io_access: 'Intraosseous (IO) access', o2: 'Oxygen', foley: 'Urinary catheter', ngt: 'Nasogastric tube', aline: 'Arterial line', cvc: 'Central venous line', lp: 'Lumbar puncture', endo: 'Endocrinology consult', surg: 'Surgical consult', ward: 'Admit to the pediatric ward',
      abg: 'Arterial blood gas', coag: 'Coagulation (PT/INR, PTT)', tns: 'Type and screen / crossmatch', bcx: 'Blood culture', ua: 'Urinalysis + urine culture', lipase: 'Lipase / amylase', lft: 'Liver function tests', cxr: 'Chest X-ray', usabd: 'Abdominal ultrasound',
      dexBolus: 'Dextrose 10% IV bolus', prbc: 'Packed red cells', ffp: 'Fresh frozen plasma', plt: 'Platelets', albumin: 'Albumin 5%', cagluc: 'Calcium gluconate 10% IV', paracet: 'Paracetamol IV', morphine: 'Morphine IV', midaz: 'Midazolam IV', ceftriax: 'Ceftriaxone IV',
      insulinVial: 'Regular insulin (Actrapid)', csf: 'CSF results', dmwab: 'Diabetes autoantibodies', kclConc: 'Concentrated KCl: goes into the IV bag', kclWhere: 'Potassium is added to the maintenance fluids: set it on the infusion pump.',
      modes: { nc: 'Nasal cannula', mask: 'Face mask', nrb: 'Non-rebreather', hfnc: 'High-flow' } },
    he: { io_access: 'גישה תוך-גרמית (IO)', o2: 'חמצן', foley: 'קטטר בשלפוחית', ngt: 'זונדה (NG)', aline: 'קו עורקי', cvc: 'צנתר ורידי מרכזי', lp: 'ניקור מותני', endo: 'ייעוץ אנדוקרינולוג', surg: 'ייעוץ כירורג', ward: 'אשפוז במחלקת ילדים',
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
  const UNNEEDED = { cvc: 4, prbc: 4, ffp: 3, plt: 3, albumin: 2, lp: 8, intub: 6, ceftriax: 1, morphine: 1, midaz: 2, usabd: 1, surg: 0 };

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

  function home() {
    stopLoop(); S = null; $$('.scrim,.redeb').forEach(x => x.remove());
    app.innerHTML = `<div class="phome"><div class="top"><div><span class="eyebrow">ER · PICU</span><h1>${esc(L.appTitle)}</h1></div><button class="btn ghost" data-lang>${esc(L.lang)}</button></div>
      <p class="sub">${esc(L.appSub)}</p>
      <div class="lvpick"><span class="eyebrow">${esc(L.level)}</span>${['guided', 'indep'].map(k => `<label class="pill ${LEVEL === k ? 'on' : ''}"><input type="radio" name="lv" value="${k}" ${LEVEL === k ? 'checked' : ''}>${esc(L[k])}</label>`).join('')}<small>${esc(L[LEVEL + 'D'])}</small></div>
      <button class="ccard" data-case><span class="tag">${esc(CT().tag)}</span><b>${esc(CT().title)}</b><span class="muted">${esc(CT().brief)}</span></button></div>`;
    $$('input[name=lv]').forEach(r => r.addEventListener('change', () => { LEVEL = r.value; ls('psim-level', LEVEL); home(); }));
    $('[data-case]').addEventListener('click', briefing);
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
    if (['prbc', 'ffp', 'plt'].includes(id) && !S.res.some(r => r.kind === 'tns' && r.ready <= now())) { msg('nurse', L.msgs.noTS); return; }
    /* the attending objects to harmful orders before anything happens: cancel (logged, half the penalty) or insist */
    const vomited = S.log.some(e => e.id === 'po' && (e.fail || e.refused) && now() - e.t < 45);
    const kKnown = S.res.some(r => r.ready <= now() && typeof (r.v || {}).K === 'number'), mt2 = 2.2 * M.maint(w), ceRecent = Math.max(m.ce, ...m.hist.filter(h => h.t >= now() - 15).map(h => h.ce)), gcsWorst = Math.min(m.GCS, ...m.hist.filter(h => h.t >= now() - 15).map(h => h.GCS));
    const W = CT().warn || {}, wk = id === 'intub' ? (ceRecent < 0.55 && gcsWorst > 8 && m.arrestAt == null ? 'intub' : null) : id === 'ward' ? (m.pH < 7.3 ? 'ward' : null) : id;
    const dyn = id === 'bolus' && (p.mlkg > 10 || p.over < 30) ? 'bolusFast'
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
    const dynText = { ctEarly: L.msgs.ctEarly, noK: L.msgs.noK, ins01: L.msgs.ins01, fluidsHigh: L.msgs.fluidsHigh(Math.round(mt2 / 1.1)), scQuery: L.msgs.scQuery(m.vent ? L.msgs.why.vent : m.GCS < 14 ? L.msgs.why.drowsy : m.G < 120 ? L.msgs.why.lowG(Math.round(m.G)) : vomited ? L.msgs.why.vomit : L.msgs.why.acid), bolusRunning: L.msgs.bolusRunning, dupLab: lastLab && L.msgs.dupLab(oname(id), Math.round(now() - lastLab.drawn)) }[dyn];
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
      S.procs[id] = now() + PR.min;
      msg(PR.by === 'md' ? 'you' : 'nurse', PR.by === 'md' ? L.youStart(oname(id), PR.min) : L.nurseStart(oname(id), PR.min));
      renderSitu(); return;
    }
    S.log.push({ t: now(), id, p: JSON.parse(JSON.stringify(p)), ce: m.ce, gcs: m.GCS });
    const MS = L.msgs;
    switch (id) {
      case 'historyQ': msg('sys', `${L.history}: ${CT().history}`); break;
      case 'examQ': msg('sys', `${L.exam}: ${now() < 20 ? CT().exam : (m.vent ? L.examVent(Math.min(m.GCS, 7), L.pupilsV[m.pupils], m.CRT) : L.examNow(Object.assign({}, m, { pupilsTxt: L.pupilsV[m.pupils], kuss: m.pCO2 < 26 && !m.vent, headache: m.headache && m.GCS >= 13 })))}`); break;
      case 'weigh': S.flags.weighed = true; msg('nurse', MS.weighed(m.wt)); break;
      case 'monitor': S.flags.mon = true; msg('nurse', MS.monOn); break;
      case 'npo': S.flags.npo = true; msg('nurse', MS.npo); break;
      case 'headUp': m.headUp = true; msg('nurse', MS.headUp); break;
      case 'neuro': case 'io': S.standing[id] = { every: 60, next: now() + 60 }; msg('nurse', oname(id) + ' ✓'); break;
      case 'att': S.att.push(now()); msg('att', m.ce > 0.25 ? MS.attCE : p.ins ? MS.attIns : MS.attGen); break;
      case 'picu': S.flags.picu = true; S.flags.picuAt = now() + 30; msg('sys', MS.picuReq); break;
      case 'endo': case 'surg': { S.flags[id] = true; const cs = (CT().consult || {})[id]; msg('sys', L.consCalled(oname(id), cs ? cs.min : 30)); if (cs) S.later.push({ t: now() + cs.min, kind: 'cons', text: did('dmw') && cs.textSent ? cs.textSent : cs.text }); break; }
      case 'ward': S.flags.ward = true; S.flags.picuAt = null; S.later.push({ t: now() + 30, kind: 'sys', text: MS.wardIn, loc: 'WARD' }); msg('sys', MS.wardReq); break;
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
        if (m.pH > 7.3 && m.HCO3 > 18) { S.later.push({ t: now() + 20, kind: 'nurse', text: MS.tray, tray: true }); msg('nurse', MS.trayOrdered); } else { S.log[S.log.length - 1].fail = true; msg('nurse', MS.poEarly); m.ceRisk += 0.3; } break;
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
    const md = modal(`<span class="eyebrow">${esc(who === 'nurse' ? L.nurseSays : L.attSays)} · ${esc(oname(id))}</span><p class="objq">${esc(text)}</p><div class="row"><button class="btn primary" data-cx>${esc(L.objCancel)}</button><button class="btn ghost" data-go>${esc(L.objGo)}</button></div>`);
    md.el.addEventListener('click', e => {
      if (e.target.closest('[data-go]')) { md.close(); if (who === 'att') S.log.push({ t: now(), id: 'overrode', p: { k: id } }); order(id, chain ? p : Object.assign({}, p, { force: true })); }
      else if (e.target.closest('[data-cx]')) { md.close(); S.log.push({ t: now(), id: 'objected', p: { k: id, who, dyn } }); msg('sys', L.objDropped(oname(id), who)); renderSitu(); }
    });
  }
  function procDone(id) {
    const PR = PROC[id], m = S.m, he = LANG === 'he';
    S.flags[PR.flag || id] = true;
    if (id === 'intub') { m.vent = true; msg('you', L.msgs.intub); if (!S.flags.mon) { S.flags.mon = true; S.flags.monAt = now(); msg('nurse', L.msgs.monVent); } }
    else msg(PR.by === 'md' ? 'you' : 'nurse', id === 'iv' ? L.msgs.ivIn : L.youDone(oname(id)));
    if (id === 'lp') addResult('csf', now() + 45, { txt: he ? `נוזל שדרה: צלול. תאים ⁦2/µL⁩, חלבון 25 מ״ג/ד״ל, גלוקוז ${Math.round(m.G * 0.6)} מ״ג/ד״ל (כ-60% מהסוכר בדם, תקין). צביעת גראם: ללא חיידקים.` : `CSF: clear. Cells 2/µL, protein 25 mg/dL, glucose ${Math.round(m.G * 0.6)} mg/dL (about 60% of blood glucose, normal). Gram stain: no organisms.` }, now());
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
      S.acc += (S.m.arrestAt != null ? Math.min(S.speed, 0.1) : S.speed) * 0.1;
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
    if (S.flags.picuAt && t >= S.flags.picuAt && S.flags.loc !== 'PICU') { S.flags.loc = 'PICU'; msg('sys', L.msgs.picuIn); }
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
    once('headache', m.ce > 0.12, () => { S.ceSignAt = t; msg('nurse', MS.headache, true); });
    { const hr0 = Math.max(...m.hist.filter(h => h.t >= t - 120).map(h => h.HR), m.HR); once('hrDrop', m.ce > 0.32 && (hr0 - m.HR >= 20 || m.ce > 0.5), () => { S.ceCritAt = t; S.ceBase = { hr: m.HR, gcs: m.GCS, t }; msg('nurse', (m.vent ? MS.hrDropVent : m.GCS < 9 ? MS.hrDropComa : MS.hrDrop)(hr0, m.HR), true); }); }
    once('pupils', m.ce > 0.58, () => msg('nurse', MS.pupils, true));
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
    if (m.arrestAt != null) once('arrest' + m.arrestAt, true, () => msg('nurse', (m.vent ? MS.periArrestVent : MS.periArrest)(m.HR), true));
    if (m.inf.main.dex > 0 && m.G > 400 && S.flags.mon && t - (S.lastHyperG ?? -99) >= 60) once('hyperG' + (S.lastHyperG = t), true, () => msg('nurse', MS.hyperG(Math.round(m.G), m.inf.main.dex), true));
    if (t % 60 === 0) { S.uoLow = m.io.lastHourOut / m.wt < 0.5 ? S.uoLow + 1 : 0; if (S.uoLow >= 2) once('lowUO', true, () => msg('nurse', MS.lowUO, true)); }
    once('breakfast', clock >= 7 * 60 + 30 && clock < 12 * 60 && m.pH > 7.3 && m.HCO3 > 18 && m.GCS >= 14 && !m.vent, () => msg('nurse', MS.breakfast + (LEVEL === 'guided' ? ' ' + MS.breakfastG : ''), true));
    /* the case ends once he is on subcutaneous insulin, the drip is off and he has eaten */
    if (did('scRapid') && m.inf.insulin === 0 && S.flags.po && m.pH > 7.3 && t - Math.max(firstT('scRapid'), firstT('stopDrip') ?? 0) >= 60) endCase();
    if (t >= 24 * 60) endCase();
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
    if (e.target.closest('[data-home]')) { home(); return; }
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
    const lc = $('#loc'); if (lc) lc.textContent = L.loc[S.flags.loc];
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
    MON.set({ monitor: on, rhythm: m.dead ? 'asystole' : m.HR >= 100 ? 'stach' : 'nsr', hr: m.dead ? 0 : m.HR, pulse: !m.dead, cpr: false, co2: m.vent ? 38 : null, vent: m.vent ? 3 : null, tube: !!m.vent, rp: m.RR ? 60 / m.RR : null, perf: m.perf, ta, u });
    const set = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
    const live = on && !m.dead;
    set('vHR', on ? (m.dead ? 0 : m.HR) : '--'); set('vSp', live ? m.SpO2 : '--'); set('vPR', live ? m.HR : '--'); set('vRR', live ? m.RR : '--'); set('vCO', on && m.vent ? 38 : '--'); set('vT', on ? m.temp.toFixed(1) : '--');
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
    const who = { nurse: L.nurseSays, att: L.attSays, lab: L.lab, sys: L.sys, you: L.youSays, cons: L.consSays };
    el.innerHTML = `<div class="hd"><span class="eyebrow">${esc(L.latest)} · ${last ? hhmm(C.startClock + last.t) : ''}</span></div>
      ${last ? `<div class="fb ${last.crit ? 'bad' : last.kind === 'att' ? 'ok' : 'note'}"><b>${esc(who[last.kind])}</b><span>${esc(last.text)}</span>${last.res != null ? `<span><button class="btn sm" data-res="${last.res}">${esc(L.view)}</button></span>` : ''}</div>` : ''}
      <div class="actl"><span class="eyebrow">${esc(L.active)}</span>${rows.length ? rows.map(([k, txt]) => `<div class="act"><span>${esc(txt)}</span>${k ? `<button class="btn sm ghost" data-stop="${k}">${esc(L.stop)}</button>` : ''}</div>`).join('') : `<p class="muted">${esc(L.none)}</p>`}</div>`;
  }
  const renderOrders = () => renderSitu();
  function openForm(id, btn) {
    const m = S.m, w = S.flags.weighed ? m.wt : m.wt0, g = LEVEL === 'guided';
    if (id === 'insulinVial') {
      const md = modal(`<h2>${esc(oname('insulinVial'))}</h2><div class="opts">${['insDrip', 'insBolus'].concat(m.inf.insulin ? ['stopDrip'] : []).map(k => `<button class="opt" data-k="${k}">${esc(oname(k))}</button>`).join('')}</div><div class="row"><button class="btn ghost" data-x>${esc(L.back)}</button></div>`);
      md.el.onclick = e => { const k = e.target.closest('[data-k]'); if (k) { md.close(); openForm(k.dataset.k); } else if (e.target.closest('[data-x]')) md.close(); };
      return;
    }
    if (id === 'kclConc') { msg('sys', EXTRA[LANG].kclWhere); openForm('main'); return; }
    let preset = {};
    if (id === 'bolusNS' || id === 'bolusLR') { preset.fluid = id === 'bolusNS' ? 'NS' : 'LR'; id = 'bolus'; }
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
    const he = LANG === 'he', ctx = { he, pt: ptLine(), ptEn: `M, ${S.m.age}y${S.flags.weighed ? ', ' + S.m.wt + ' kg' : ''}`, unit: { PICU: 'PICU', WARD: 'PEDS WARD' }[r.loc] || 'PEDS ED', unitName: he ? { ED: 'מיון ילדים', PICU: 'טיפול נמרץ ילדים', WARD: 'מחלקת ילדים' }[r.loc || 'ED'] : { ED: 'Pediatric ED', PICU: 'PICU', WARD: 'Pediatric ward' }[r.loc || 'ED'], date: caseDate(r.drawn).D, dateReady: caseDate(r.ready).D, time: hhmm(C.startClock + r.drawn), ready: hhmm(C.startClock + r.ready), seed: r.drawn, arterial: r.v.arterial, hb: r.v.hb };
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
    if (r.kind === 'ecg') { const draw = () => { const cv = $('#ecgc', md.el); if (cv && cv.isConnected && RV.ecg12(cv, r.v) === false) setTimeout(draw, 200); }; requestAnimationFrame(draw); }
  }
  function flash(btn) { if (!btn) return; btn.classList.add('flashok'); setTimeout(() => btn.classList.remove('flashok'), 500); UI.Sound.ok && UI.Sound.ok(); }
  const ROWS = ['G', 'pH', 'pCO2', 'HCO3', 'Na', 'NaC', 'K', 'Cl', 'AG', 'eOsm', 'BUN', 'Cr', 'Ca', 'P', 'Mg', 'BHB', 'lact', 'GCS', 'pupils', 'UO', 'IN', 'OUT'];
  const FLOW_KINDS = ['poc', 'vbg', 'abg', 'chem', 'bhb', 'neuro', 'io'];
  function renderFlow() {
    const el = $('#flow'); if (!el || !S) return;
    const t = now(), cols = {}, txt = [];
    S.res.forEach(r => {
      if (!FLOW_KINDS.includes(r.kind)) { if (r.ready <= t) txt.push(r); return; }
      const key = r.drawn; (cols[key] = cols[key] || { t: r.drawn, v: {}, src: {}, pend: false });
      if (r.ready > t) cols[key].pend = true; else { Object.assign(cols[key].v, r.v); Object.keys(r.v).forEach(k => { cols[key].src[k] = S.res.indexOf(r); }); }
    });
    const cs = Object.values(cols).sort((a, b) => a.t - b.t).slice(-12);
    cs.forEach(c => { const v = c.v; if (v.Na != null && v.G != null) { v.NaC = r1(v.Na + 1.6 * Math.max(0, v.G - 100) / 100); v.eOsm = Math.round(2 * v.Na + v.G / 18); } });
    const rows = ROWS.filter(k => cs.some(c => c.v[k] != null));
    const flag = (k, v) => ({ G: v < 70 || v > 250, pH: v < 7.3, HCO3: v < 18, K: v < 3.5 || v > 5.5, Na: v < 135 || v > 145, NaC: v < 135 || v > 150, P: v < 2 }[k] ? 'hi' : '');
    el.innerHTML = (cs.length ? `<div class="tw"><table><thead><tr><th>${esc(L.flow.time)}</th>${cs.map(c => `<th>${hhmm(C.startClock + c.t)}</th>`).join('')}</tr></thead><tbody>${rows.map(k => `<tr><th>${esc(L.flow[k])}</th>${cs.map(c => c.v[k] == null ? `<td>${c.pend ? '…' : ''}</td>` : (c.src[k] != null && !['neuro', 'io'].includes(S.res[c.src[k]].kind) ? `<td class="${flag(k, c.v[k])} go" data-res="${c.src[k]}">${esc(c.v[k])}</td>` : `<td class="${flag(k, c.v[k])}">${esc(k === 'pupils' ? L.pupilsV[c.v[k]] || c.v[k] : c.v[k])}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>` : `<p class="muted">${esc(L.none)}</p>`)
      + (txt.length ? `<ul class="txtres">${txt.map(r => `<li><button class="rlink" data-res="${S.res.indexOf(r)}"><b>${hhmm(C.startClock + r.drawn)} · ${esc(oname(r.kind))}</b> · ${esc(L.view)}</button></li>`).join('')}</ul>` : '');
    const fn = $('#flowN'); if (fn) fn.textContent = cs.length ? hhmm(C.startClock + cs[cs.length - 1].t) : '';
  }
  function renderFeed() {
    const el = $('#recL'); if (!el || !S) return;
    const who = { nurse: L.nurseSays, att: L.attSays, lab: L.lab, sys: L.sys, you: L.youSays, cons: L.consSays };
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
    why(`Weighed: ${at(T('weigh'))}; target within 30 min.`, `נשקל: ${at(T('weigh'))}; יעד תוך 15 דק׳.`);
    add('monitor', 4, (T('monitor') ?? S.flags.monAt ?? Infinity) <= 30, 'Full monitoring from the start (heart rhythm for potassium changes).', 'ניטור מלא מההתחלה (קצב הלב לשינויי אשלגן).', 'prot');
    why(`Monitor: ${at(T('monitor') ?? S.flags.monAt)}; target within 30 min.`, `מוניטור: ${at(T('monitor'))}; יעד תוך 15 דק׳.`);
    add('labs0', 5, (within('vbg', 30) || within('chem', 30)) && (within('poc', 30) || within('bhb', 30) || within('ua', 30)), 'First bloods within 30 min: gas, electrolytes, glucose, ketones.', 'בדיקות ראשונות תוך 30 דקות: גזים, אלקטרוליטים, סוכר, קטונים.', 'prot');
    { const g = Math.min(...['vbg', 'chem'].map(T).filter(x => x != null), Infinity), k = Math.min(...['poc', 'bhb', 'ua'].map(T).filter(x => x != null), Infinity); why(`Gas/electrolytes: ${at(isFinite(g) ? g : null)}; glucose/ketones: ${at(isFinite(k) ? k : null)}.`, `גזים/אלקטרוליטים: ${at(isFinite(g) ? g : null)}; סוכר/קטונים: ${at(isFinite(k) ? k : null)}.`); }
    const attBefore = t => S.att.some(a => a <= t && a >= t - 30);
    /* was a potassium result (at least lo) back before time t? */
    const kKnownBy = (t, lo) => res.some(r => r.ready <= t && typeof r.v.K === 'number' && r.v.K >= lo);
    const bol = lg.filter(e => e.id === 'bolus' && e.t <= 240), bolKg = bol.reduce((a, e) => a + e.p.mlkg, 0);
    add('bolus', 8, null, `First hour: NaCl 0.9% 10 mL/kg over an hour (20 mL/kg only for severe dehydration with instability, with the attending). You gave ${r1(bolKg)} mL/kg.`, `שעה ראשונה: NaCl 0.9% 10 מ״ל/ק״ג במשך שעה (20 מ״ל/ק״ג רק בדהידרציה קשה עם חוסר יציבות, באישור כונן). ניתן: ${r1(bolKg)} מ״ל/ק״ג.`, 'prot',
      !bol.length || bol.some(e => e.p.over < 20 && e.p.mlkg > 10) ? 0 : (bol[0].t > 30 ? 0.4 : 1) * (bolKg >= 9 && bolKg <= 11 ? 1 : bolKg > 11 && bolKg <= 21 ? (attBefore(bol[bol.length - 1].t) ? 0.8 : 0.5) : bolKg < 9 ? 0.5 : 0) * (bol.every(e => e.p.fluid === 'NS') ? 1 : 0.7) * (bol.every(e => e.p.over >= 30) ? 1 : 0.4));
    why((bol.length && bol[0].t > 30 ? (he ? 'באיחור (יעד: תוך 30 דק׳). ' : 'Late (target: within 30 min). ') : '') + (bol.length ? bol.map(e => `${e.p.mlkg} ${he ? 'מ״ל/ק״ג' : 'mL/kg'} ${L.fl[e.p.fluid]} ${he ? 'במשך' : 'over'} ${e.p.over} ${L.min} @ ${hhmm(C.startClock + e.t)}`).join('; ') : 'No bolus in the first 4 h.'), (bol.length && bol[0].t > 30 ? 'באיחור (יעד: תוך 30 דק׳). ' : '') + (bol.length ? bol.map(e => `${e.p.mlkg} מ״ל/ק״ג ${L.fl[e.p.fluid]} במשך ${e.p.over} ${L.min} @ ${hhmm(C.startClock + e.t)}`).join('; ') : 'לא ניתן בולוס ב-4 השעות הראשונות.'));
    const endT = Math.min(m.t, 12 * 60, S.ceCritAt ?? Infinity, (lg.find(e => e.id === 'mannitol' || e.id === 'hts') || {}).t ?? Infinity);
    let rs = 0, rn = 0; for (let t = 120; t <= endT; t += 10) { const c = mainAt(t); rs += c ? c.rate : 0; rn++; }
    const avg = rn ? rs / rn : 0, ratio = avg / mt;
    add('fluids', 10, null, `From hour 2: deficit over 48 h + maintenance ≈ 1.5–2× maintenance (${Math.round(1.5 * mt)}–${Math.round(2 * mt)} mL/h), NaCl 0.9%; never above 2× unless in shock. Your average: ${Math.round(avg)} mL/h (${r1(ratio)}×).`, `משעה שנייה: חסר על פני 48 שעות + אחזקה ≈ פי 1.5–2 מהאחזקה (${Math.round(1.5 * mt)}–${Math.round(2 * mt)} מ״ל/שע׳), NaCl 0.9%; לא יותר מפי 2 אלא בשוק. הממוצע שלך: ${Math.round(avg)} מ״ל/שע׳ (פי ${r1(ratio)}).`, 'prot',
      !mains.length ? 0 : (mains[0].t > 120 ? 0.5 : 1) * (ratio >= 1.4 && ratio <= 2.05 ? 0.8 : ratio > 2.05 && ratio <= 2.5 ? 0.3 : ratio < 1.4 ? 0.3 : 0) + (mains.every(e => e.p.base === 'NS') && ratio <= 2.5 ? 0.2 : 0));
    why(`Maintenance fluids from ${at(mains.length ? mains[0].t : null)} (target by hour 2); average from hour 2: ${Math.round(avg)} mL/h (${r1(ratio)}× maintenance)${mains.length && !mains.every(e => e.p.base === 'NS') ? '; not NaCl 0.9% throughout' : ''}${!mains.length ? '; no maintenance fluids ordered' : ''}.`, `נוזלי אחזקה מ-${at(mains.length ? mains[0].t : null)} (יעד עד שעה 2); ממוצע משעה 2: ${Math.round(avg)} מ״ל/שע׳ (${r1(ratio)}× אחזקה)${mains.length && !mains.every(e => e.p.base === 'NS') ? '; לא NaCl 0.9% לאורך כל הדרך' : ''}${!mains.length ? '; לא הוזמנו נוזלי אחזקה' : ''}.`);
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
    const k35 = hit(firstRes(v => v.K != null && v.K < 3.5), hK(3.5));
    if (k35 != null) { const up = e => (e.id === 'main' && e.p.kcl >= 60) || e.id === 'kpo', c = (mainAt(k35) && mainAt(k35).kcl >= 60) || lg.find(e => e.t >= k35 && e.t <= k35 + 60 && up(e)), late = !c && lg.find(e => e.t > k35 + 60 && e.t <= k35 + 360 && up(e));
      if (late) { kOk -= 0.15; kNotes.push(he ? `K<3.5 → 60 באיחור (${Math.round(late.t - k35)} דק׳)` : `K<3.5 → 60 late (${Math.round(late.t - k35)} min)`); }
      else if (!c) { kOk -= 0.4; kNotes.push(he ? 'K<3.5 → 60 מא״ק/ל׳ או פומי' : 'K<3.5 → 60/L or PO'); } }
    if (res.some(r => r.v.K > 5.5 && mainAt(r.ready) && mainAt(r.ready).kcl > 0)) { kOk -= 0.3; kNotes.push(he ? 'K>5.5 עם KCl רץ' : 'K>5.5 with KCl running'); }
    if (Math.min(...m.hist.map(h => h.K)) < 2.8) kOk -= 0.3;
    const kGiven = mains.some(e => e.p.kcl > 0) || did('kpo') || did('kphos'), kFirst = mains.find(e => e.p.kcl > 0);
    if (kFirst && !kKnownBy(kFirst.t, 0)) { kOk -= 0.3; kNotes.push(he ? 'KCl הותחל בלי תוצאת אשלגן' : 'KCl started without a potassium result'); } if (!kGiven && m.t > 180) kOk = 0;
    add('potassium', 10, null, 'Potassium: K above 5.5 → wait for urine and K below 5; 3.5–5.5 → KCl 40 mEq/L; below 3.5 → 60 mEq/L (or add oral potassium); peripheral line up to 40–60 mEq/L.', 'אשלגן: מעל 5.5 → להמתין למתן שתן ולירידה מתחת ל-5; 3.5–5.5 → KCl 40 מא״ק/ל׳; מתחת ל-3.5 → 60 מא״ק/ל׳ (או תוספת פומית); בווריד פריפרי עד 40–60 מא״ק/ל׳.', 'prot', Math.max(0, kOk));
    { const kmin = Math.min(...res.filter(r => typeof r.v.K === 'number').map(r => r.v.K), 99) < 99 ? Math.min(...res.filter(r => typeof r.v.K === 'number').map(r => r.v.K)) : Math.min(...m.hist.map(h => h.K)), km = mains.filter(e => e.p.kcl > 0); why(`${kGiven ? `KCl started ${at(km.length ? km[0].t : null)}` : 'No potassium given'}; lowest K ${r1(kmin)}${kNotes.length ? ` · missed: ${kNotes.join(', ')}` : ''}.`, `${kGiven ? `KCl הותחל ${at(km.length ? km[0].t : null)}` : 'לא ניתן אשלגן'}; האשלגן הנמוך ביותר ${r1(kmin)}${kNotes.length ? ` · הוחמץ: ${kNotes.join(', ')}` : ''}.`); }
    let dOk = 1; const hG = th => m.hist.find(h => h.G < th), g300 = hit(firstRes(v => v.G != null && v.G < 300), hG(300)), g180 = hit(firstRes(v => v.G != null && v.G < 180), hG(180));
    if (g300 != null && !(mainAt(g300 + 60) && mainAt(g300 + 60).dex >= 5)) dOk -= 0.5;
    if (g180 != null && !(mainAt(g180 + 60) && mainAt(g180 + 60).dex >= 10)) dOk -= 0.5;
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
    add('exit', 6, !!exitOk, 'Leaving DKA: pH above 7.3 and HCO₃ above 18, eating without nausea; rapid insulin SC right before a meal, then stop the drip. Not in the middle of the night.', 'יציאה מ-DKA: pH מעל 7.3 ו-HCO₃ מעל 18, אוכל בלי בחילה; אינסולין מהיר תת-עורי מיד לפני ארוחה, ואז להפסיק את העירוי. לא באמצע הלילה.', 'prot');
    why(sc ? `Rapid SC insulin ${at(sc.t)}${S.flags.po ? '' : '; he did not eat'}${!res.some(r => r.ready <= sc.t && r.v.pH > 7.3 && r.v.HCO3 > 18) ? '; no gas showing pH > 7.3 and HCO₃ > 18 before it' : ''}.` : 'He never left DKA care (no SC insulin before a meal).', sc ? `אינסולין מהיר תת-עורי ${at(sc.t)}${S.flags.po ? '' : '; לא אכל'}${!res.some(r => r.ready <= sc.t && r.v.pH > 7.3 && r.v.HCO3 > 18) ? '; לא היה גז עם pH מעל 7.3 ו-HCO₃ מעל 18 לפני כן' : ''}.` : 'לא הגיע ליציאה מ-DKA (אין אינסולין תת-עורי לפני ארוחה).');
    if (sc) { const stop = lg.find(e => (e.id === 'stopDrip' || (e.id === 'stop' && e.p.k === 'insDrip')) && e.t >= sc.t - 5), night = clock(sc.t) >= 23 * 60 || clock(sc.t) < 6 * 60;
      R[R.length - 1].why += (!stop ? (he ? ' העירוי לא הופסק.' : ' The drip was not stopped.') : stop.t > sc.t + 60 ? (he ? ` העירוי הופסק ${Math.round(stop.t - sc.t)} דק׳ אחרי האינסולין (יעד: עד 60).` : ` The drip was stopped ${Math.round(stop.t - sc.t)} min after the insulin (target: within 60).`) : '') + (night ? (he ? ' באמצע הלילה.' : ' In the middle of the night.') : ''); }
    if (sc && S.flags.poAt != null && !mealOk) R[R.length - 1].why += he ? ` הוא אכל ב-${at(S.flags.poAt)}, לפני האינסולין: האינסולין המהיר ניתן מיד לפני הארוחה.` : ` He ate at ${at(S.flags.poAt)}, before the insulin: rapid insulin goes right before the meal.`;
    const ceMin = m.hist.filter(h => h.ce > 0.35).length * 5;
    add('brain', 8, ceMin <= 60 && !(m.injury > 0) && !m.dead, `Neurological outcome: ${m.dead ? 'death' : m.injury > 0 ? 'lasting brain injury' : ceMin ? `signs of raised intracranial pressure for about ${ceMin} min` : 'no lasting signs of raised intracranial pressure'}.`, `תוצאה נוירולוגית: ${m.dead ? 'מוות' : m.injury > 0 ? 'נזק מוחי מתמשך' : ceMin ? `סימני לחץ תוך-גולגולתי מוגבר במשך כ-${ceMin} דק׳` : 'ללא סימנים ממושכים של לחץ תוך-גולגולתי מוגבר'}.`, 'prot');
    why(m.dead ? `He died of cerebral herniation at ${at(m.deadAt)}.` : m.injury > 0 ? `Lasting brain injury (${m.hypoMin ? `${m.hypoMin} min of glucose < 40` : 'herniation'}).` : `Signs of raised pressure for ${ceMin} min.`, m.dead ? `נפטר מהרניאציה מוחית ב-${at(m.deadAt)}.` : m.injury > 0 ? `נזק מוחי מתמשך (${m.hypoMin ? `${m.hypoMin} דק׳ של סוכר מתחת ל-40` : 'הרניאציה'}).` : `סימני לחץ תוך-גולגלתי במשך ${ceMin} דק׳.`);
    const extra = lg.filter(e => UNNEEDED[e.id] != null && !(['intub', 'midaz'].includes(e.id) && ((e.ce ?? 0) >= 0.55 || (e.gcs ?? 15) <= 8))).map(e => e.id), pen = [...new Set(extra)].reduce((a, k) => a + UNNEEDED[k], 0);
    const stopped = [...new Set(lg.filter(e => e.id === 'objected' && !extra.includes(e.p.k) && !['dupLab', 'bolusRunning'].includes(e.p.dyn)).map(e => e.p.k))], byNurse = lg.some(e => e.id === 'objected' && e.p.who === 'nurse' && !['dupLab', 'bolusRunning'].includes(e.p.dyn)), pen2 = stopped.reduce((a, k) => a + Math.ceil((UNNEEDED[k] || 2) / 2), 0);
    const sAtt = stopped.filter(k => lg.some(e => e.id === 'objected' && e.p.k === k && e.p.who !== 'nurse')), sNur = stopped.filter(k => !sAtt.includes(k));
    if (stopped.length) add('stopped', 0, false, `Stopped before they happened (−${pen2}): ${[sAtt.length && 'attending: ' + sAtt.map(oname).join(', '), sNur.length && 'nurse: ' + sNur.map(oname).join(', ')].filter(Boolean).join('; ')}. Think it through before ordering.`, `נעצרו לפני ביצוע (מינוס ${pen2}): ${[sAtt.length && 'כונן: ' + sAtt.map(oname).join(', '), sNur.length && 'אחות: ' + sNur.map(oname).join(', ')].filter(Boolean).join('; ')}. לחשוב לפני שמזמינים.`, 'nelson');
    const over = [...new Set(lg.filter(e => e.id === 'overrode').map(e => e.p.k))].filter(k => !extra.includes(k)), pen3 = over.length * 2;
    if (over.length) add('overrode', 0, false, `Done against the attending's objection (−${pen3}): ${over.map(oname).join(', ')}.`, `בוצע בניגוד להתנגדות הכונן (מינוס ${pen3}): ${over.map(oname).join(', ')}.`, 'nelson');
    if (extra.length) add('extra', 0, false, `Unnecessary interventions: ${[...new Set(extra)].map(oname).join(', ')} (−${pen}).`, `התערבויות מיותרות: ${[...new Set(extra)].map(oname).join(', ')} (מינוס ${pen}).`, 'nelson');
    const max = R.reduce((a, r) => a + r.wt, 0); let got = R.reduce((a, r) => a + r.got, 0) - pen - pen2 - pen3;
    if (m.dead) got *= 0.3;
    return { R, pct: Math.max(0, Math.round(got / max * 100)) };
  }

  /* ---------------- debrief ---------------- */
  function chart(key, lab, lo, hi, color) {
    const H = S.m.hist; if (!H.length) return '';
    const W = 320, Ht = 110, t1 = H[H.length - 1].t || 1, vs = H.map(h => h[key]), mn = Math.min(lo, ...vs), mx = Math.max(hi, ...vs);
    const x = t => 30 + (W - 36) * t / t1, y = v => 8 + (Ht - 26) * (1 - (v - mn) / (mx - mn || 1));
    const path = H.map((h, i) => `${i ? 'L' : 'M'}${x(h.t).toFixed(1)},${y(h[key]).toFixed(1)}`).join('');
    return `<figure class="ch"><figcaption>${esc(lab)}</figcaption><svg viewBox="0 0 ${W} ${Ht}"><rect x="30" y="${y(hi)}" width="${W - 36}" height="${Math.max(0, y(lo) - y(hi))}" fill="rgba(62,240,143,.08)"/><path d="${path}" fill="none" stroke="${color}" stroke-width="1.8"/>
      <text x="27" y="${y(mx) + 4}" text-anchor="end" fill="#8aa4ae" font-size="9">${mx >= 20 ? Math.round(mx) : r1(mx)}</text><text x="27" y="${y(mn)}" text-anchor="end" fill="#8aa4ae" font-size="9">${mn >= 20 ? Math.round(mn) : r1(mn)}</text>${Array.from({ length: Math.floor(t1 / 120) + 1 }, (_, i) => i * 120).map(tt => `<line x1="${x(tt)}" x2="${x(tt)}" y1="${Ht - 18}" y2="${Ht - 14}" stroke="#4d6772"/><text x="${x(tt)}" y="${Ht - 4}" text-anchor="${x(tt) > W - 24 ? 'end' : 'middle'}" fill="#8aa4ae" font-size="9">${hhmm(C.startClock + tt)}</text>`).join('')}<text x="${W - 4}" y="${y(hi) + 9}" text-anchor="end" fill="#3ef08f" font-size="8.5" opacity=".8">${lo >= 20 ? Math.round(lo) : r1(lo)}–${hi >= 20 ? Math.round(hi) : r1(hi)}</text></svg></figure>`;
  }
  function endCase() {
    if (!S || S.ended) return;
    S.ended = true; S.speed = 0; stopLoop(); $$('.scrim,.redeb').forEach(x => x.remove());
    const { R, pct } = rubric(), SRC = C.src;
    const md = modal(`<h2>${esc(L.debrief)} · ${esc(CT().title)}</h2>
      <div class="score"><b>${pct}%</b><span>${esc(S.m.dead ? L.outDied : S.m.injury > 0 ? L.outInjury : L.outOk)} · +${esc(dur(S.m.t))}</span></div>
      <h3>${esc(L.rubric)}</h3><ul class="rub">${R.map(r => `<li class="${r.ok ? 'ok' : r.got > 0 ? 'part' : 'bad'}"><span class="mk">${r.ok ? '✓' : r.got > 0 ? '◐' : '✗'}</span><span>${esc(r.txt)}${r.why && !r.ok ? `<em class="why">${esc(r.why)}</em>` : ''} <small>${esc((SRC[r.src] || {})[LANG] || '')}</small></span></li>`).join('')}</ul>
      <h3>${esc(L.charts)}</h3><div class="charts">${chart('G', L.flow.G, 150, 250, '#ffd84a')}${chart('K', L.flow.K, 4, 5, '#3ef08f')}${chart('pH', 'pH', 7.3, 7.45, '#4fc3ff')}${chart('NaC', L.flow.NaC, 135, 145, '#ff8a4c')}${chart('eOsm', L.flow.eOsm, 280, 300, '#c39bff')}${chart('GCS', 'GCS', 14, 15, '#ff6b7a')}</div>
      <div class="row"><button class="btn primary" data-again>${esc(L.again)}</button><button class="btn ghost" data-home2>${esc(L.home)}</button><button class="btn ghost" data-lang>${esc(L.lang)}</button><button class="btn ghost" data-chart>${esc(L.toChart)}</button></div>`, 'wide');
    md.el.addEventListener('click', e => { if (e.target.closest('[data-chart]')) { md.close(); const b = document.createElement('button'); b.className = 'btn primary redeb'; b.textContent = L.debrief; b.onclick = () => { b.remove(); S.ended = false; endCase(); }; document.body.appendChild(b); return; } if (e.target.closest('[data-again]')) { md.close(); startCase(); } else if (e.target.closest('[data-home2]')) { md.close(); home(); } });
  }

  /* test hook (?debug) */
  if (/[?&]debug/.test(location.search)) window.__sim = { get S() { return S; }, order, minute, endCase, rubric, startCase };
  home();
})();
