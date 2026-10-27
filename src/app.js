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
  /* f: form fields [key, kind, options|default]; kinds: num (with unit), sel (options), freq */
  const LABS = ['poc', 'vbg', 'abg', 'chem', 'bhb', 'cbc', 'coag', 'tns', 'bcx', 'ua', 'lipase', 'lft', 'ecg', 'dmw'];
  const CATALOG = {
    care: [
      ['historyQ'], ['examQ'], ['weigh'], ['monitor'], ['iv'], ['io_access'], ['npo'], ['headUp'], ['neuro', 'standing'], ['io', 'standing'],
      ['o2', { f: [['mode', 'sel', ['nc', 'mask', 'nrb', 'hfnc']]] }], ['foley'], ['ngt'], ['aline'], ['cvc'], ['lp'], ['intub'], ['att'], ['endo'], ['surg'], ['picu'], ['ward']
    ],
    labs: LABS.map(k => [k, { lab: true }]).concat([['cxr'], ['usabd'], ['ct']]),
    fluids: [
      ['bolus', { f: [['fluid', 'sel', ['NS', 'LR']], ['mlkg', 'num', 10], ['over', 'num', 60]] }],
      ['main', { f: [['base', 'sel', ['NS', 'HALF', 'LR']], ['dex', 'sel', [0, 5, 10, 12.5]], ['kcl', 'sel', [0, 20, 40, 60]], ['rate', 'num', '']] }],
      ['dexBolus', { f: [['mlkg', 'num', 2]] }], ['prbc', { f: [['mlkg', 'num', 10]] }], ['ffp', { f: [['mlkg', 'num', 10]] }], ['plt', { f: [['mlkg', 'num', 10]] }], ['albumin', { f: [['mlkg', 'num', 10]] }]
    ],
    insulin: [['insDrip', { f: [['dose', 'num', '']] }], ['insBolus'], ['scRapid', { f: [['dose', 'num', 0.1]] }], ['scBasal', { f: [['dose', 'num', 0.2]] }], ['stopDrip']],
    meds: [
      ['mannitol', { f: [['gkg', 'num', 0.5]] }], ['hts', { f: [['mlkg', 'num', 5]] }], ['bicarb', { f: [['meqkg', 'num', 1]] }], ['kpo', { f: [['meqkg', 'num', 0.5]] }], ['kphos', { f: [['mmolkg', 'num', 0.25]] }],
      ['cagluc'], ['ondan'], ['paracet'], ['morphine'], ['midaz'], ['ceftriax'], ['po']
    ]
  };
  /* catalog labels beyond the DKA-specific ones in i18n */
  const EXTRA = {
    en: { io_access: 'Intraosseous (IO) access', o2: 'Oxygen', foley: 'Urinary catheter', ngt: 'Nasogastric tube', aline: 'Arterial line', cvc: 'Central venous line', lp: 'Lumbar puncture', endo: 'Endocrinology consult', surg: 'Surgical consult', ward: 'Admit to the pediatric ward',
      abg: 'Arterial blood gas', coag: 'Coagulation (PT/INR, PTT)', tns: 'Type and screen / crossmatch', bcx: 'Blood culture', ua: 'Urinalysis + urine culture', lipase: 'Lipase / amylase', lft: 'Liver function tests', cxr: 'Chest X-ray', usabd: 'Abdominal ultrasound',
      dexBolus: 'Dextrose 10% IV bolus', prbc: 'Packed red cells', ffp: 'Fresh frozen plasma', plt: 'Platelets', albumin: 'Albumin 5%', cagluc: 'Calcium gluconate 10% IV', paracet: 'Paracetamol IV', morphine: 'Morphine IV', midaz: 'Midazolam IV', ceftriax: 'Ceftriaxone IV',
      modes: { nc: 'Nasal cannula', mask: 'Face mask', nrb: 'Non-rebreather', hfnc: 'High-flow' } },
    he: { io_access: 'גישה תוך-גרמית (IO)', o2: 'חמצן', foley: 'קטטר בשלפוחית', ngt: 'זונדה (NG)', aline: 'קו עורקי', cvc: 'צנתר ורידי מרכזי', lp: 'ניקור מותני', endo: 'ייעוץ אנדוקרינולוג', surg: 'ייעוץ כירורג', ward: 'אשפוז במחלקת ילדים',
      abg: 'גזים עורקיים', coag: 'תפקודי קרישה (PT/INR, PTT)', tns: 'סוג והצלבה', bcx: 'תרבית דם', ua: 'בדיקת שתן + תרבית', lipase: 'ליפאז / עמילאז', lft: 'תפקודי כבד', cxr: 'צילום חזה', usabd: 'US בטן',
      dexBolus: 'בולוס גלוקוז 10% IV', prbc: 'מנות דם (PRBC)', ffp: 'פלזמה (FFP)', plt: 'טסיות', albumin: 'אלבומין 5%', cagluc: 'קלציום גלוקונט 10% IV', paracet: 'פרצטמול IV', morphine: 'מורפין IV', midaz: 'מידזולם IV', ceftriax: 'צפטריאקסון IV',
      modes: { nc: 'משקפי חמצן', mask: 'מסכה', nrb: 'מסכה עם שקית', hfnc: 'זרימה גבוהה' } }
  };
  const oname = id => L.o[id] || EXTRA[LANG][id] || id;
  const LAB_DELAY = { poc: 2, vbg: 10, abg: 10, chem: 40, bhb: 5, cbc: 40, coag: 50, tns: 60, bcx: 1440, ua: 30, lipase: 45, lft: 45, ecg: 5, dmw: 2880, cxr: 30, usabd: 60, ct: 40 };
  /* invasive or costly orders this case does not need: shown in the debrief as unnecessary */
  const UNNEEDED = { cvc: 3, prbc: 4, ffp: 3, plt: 3, albumin: 2, lp: 4, intubE: 0, ceftriax: 1, morphine: 1, midaz: 2, usabd: 1, surg: 0 };

  /* ---------------- shell ---------------- */
  function setLang(l) { LANG = l; L = I18N[l]; ls('psim-lang', l); document.documentElement.lang = l; document.documentElement.dir = l === 'he' ? 'rtl' : 'ltr'; }
  setLang(LANG);
  function modal(html, cls = '') {
    const el = document.createElement('div'); el.className = 'scrim'; el.innerHTML = `<div class="sheet ${cls}">${html}</div>`; document.body.appendChild(el);
    return { el, close() { el.remove(); } };
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-lang]')) { setLang(LANG === 'he' ? 'en' : 'he'); S ? renderSim() : home(); } });

  function home() {
    stopLoop(); S = null;
    app.innerHTML = `<div class="home"><header class="top"><h1>${esc(L.appTitle)}</h1><button class="btn ghost" data-lang>${esc(L.lang)}</button></header>
      <p class="sub">${esc(L.appSub)}</p>
      <div class="lv"><span>${esc(L.level)}:</span>${['guided', 'indep'].map(k => `<label class="pill ${LEVEL === k ? 'on' : ''}"><input type="radio" name="lv" value="${k}" ${LEVEL === k ? 'checked' : ''}>${esc(L[k])}</label>`).join('')}<small>${esc(L[LEVEL + 'D'])}</small></div>
      <div class="cards"><button class="case" data-case><b>${esc(CT().title)}</b><span>${esc(CT().tag)}</span><span class="brief">${esc(CT().brief)}</span></button></div></div>`;
    $$('input[name=lv]').forEach(r => r.addEventListener('change', () => { LEVEL = r.value; ls('psim-level', LEVEL); home(); }));
    $('[data-case]').addEventListener('click', briefing);
  }
  function briefing() {
    const m = modal(`<h2>${esc(CT().title)}</h2><p>${esc(CT().brief)}</p><p class="muted">${esc(CT().triage)}</p><div class="row"><button class="btn primary" data-go>${esc(L.start)}</button><button class="btn ghost" data-x>${esc(L.back)}</button></div>`);
    m.el.addEventListener('click', e => { if (e.target.closest('[data-go]')) { m.close(); startCase(); } else if (e.target.closest('[data-x]')) m.close(); });
  }

  /* ---------------- session ---------------- */
  function startCase() {
    S = { m: M.create(C.model), log: [], msgs: [], res: [], standing: {}, flags: { loc: 'ED' }, speed: 0, acc: 0, ended: false, fired: {}, att: [], tab: 'care', pane: 'mon', lastHr: null, uoLow: 0 };
    msg('sys', CT().triage);
    renderSim(); loop();
  }
  const now = () => S.m.t;
  function msg(kind, text, crit) {
    S.msgs.push({ t: now(), kind, text, crit: !!crit });
    if (crit) { pause(); Snd.alert(); }
    renderFeed();
  }
  const did = id => S.log.some(e => e.id === id);
  const firstT = id => { const e = S.log.find(x => x.id === id); return e ? e.t : null; };

  /* ---------------- orders ---------------- */
  function order(id, p = {}) {
    if (S.ended) return;
    const m = S.m, w = m.wt, needIV = ['bolus', 'main', 'insDrip', 'insBolus', 'mannitol', 'hts', 'bicarb', 'kphos', 'dexBolus', 'prbc', 'ffp', 'plt', 'albumin', 'cagluc', 'ondan', 'paracet', 'morphine', 'midaz', 'ceftriax'];
    if (needIV.includes(id) && !S.flags.iv && !S.flags.io) { msg('nurse', L.msgs.noIV); return; }
    S.log.push({ t: now(), id, p: JSON.parse(JSON.stringify(p)) });
    const MS = L.msgs;
    switch (id) {
      case 'historyQ': msg('sys', `${L.history}: ${CT().history}`); break;
      case 'examQ': msg('sys', `${L.exam}: ${now() < 20 ? CT().exam : L.examNow(Object.assign({}, m, { pupilsTxt: L.pupilsV[m.pupils], kuss: m.RR > 26 }))}`); break;
      case 'weigh': S.flags.weighed = true; msg('nurse', MS.weighed(w)); break;
      case 'monitor': S.flags.mon = true; msg('nurse', MS.monOn); break;
      case 'iv': S.flags.iv = true; msg('nurse', MS.ivIn); break;
      case 'io_access': S.flags.io = true; msg('nurse', oname(id) + ' ✓'); break;
      case 'npo': S.flags.npo = true; msg('nurse', MS.npo); break;
      case 'headUp': m.headUp = true; msg('nurse', MS.headUp); break;
      case 'neuro': case 'io': S.standing[id] = { every: 60, next: now() + 60 }; break;
      case 'att': S.att.push(now()); msg('att', m.ce > 0.25 ? MS.attCE : p.ins ? MS.attIns : MS.attGen); break;
      case 'picu': S.flags.picuAt = now() + 30; msg('sys', MS.picuReq); break;
      case 'ward': case 'endo': case 'surg': case 'o2': case 'foley': case 'ngt': case 'aline': case 'cvc': case 'lp': msg('nurse', oname(id) + (p.mode ? ` (${EXTRA[LANG].modes[p.mode]})` : '') + ' ✓'); break;
      case 'intub': m.vent = true; msg('att', MS.intub); break;
      case 'ct': if (m.ce > 0.3 && !(m.mannitol.concat(m.hts)).some(d => now() - d.at < 120)) { msg('att', MS.ctEarly); S.log[S.log.length - 1].early = true; } else addResult('ct', now() + LAB_DELAY.ct, { txt: m.ce > 0.2 ? MS.ctDone : MS.ctNormal }); break;
      case 'cxr': case 'usabd': addResult(id, now() + LAB_DELAY[id], { txt: LANG === 'he' ? 'תקין' : 'Normal' }); break;
      case 'bolus': m.inf.boluses.push({ fluid: p.fluid, left: p.mlkg * w, mlMin: p.mlkg * w / Math.max(5, p.over) }); msg('nurse', `${oname(id)}: ${L.fl[p.fluid]} ${Math.round(p.mlkg * w)} mL / ${p.over}′`); break;
      case 'main': m.inf.main = { base: p.base, dex: +p.dex, kcl: +p.kcl, rate: +p.rate }; S.mainHist = (S.mainHist || []).concat({ t: now(), rate: +p.rate }); msg('nurse', `${oname(id)}: ${L.fl[p.base]}${+p.dex ? ` + D${p.dex}%` : ''}${+p.kcl ? ` + KCl ${p.kcl}` : ''} · ${p.rate} mL/h`); break;
      case 'insDrip': m.inf.insulin = +p.dose; msg('nurse', `${oname(id)}: ${p.dose} u/kg/h = ${r1(p.dose * w)} u/h`); break;
      case 'insBolus': m.Ieff += 0.1; m.ceRisk += 1.5; msg('nurse', MS.insBolus); break;
      case 'scRapid': case 'scBasal': m.scAt = m.scAt ?? now(); msg('nurse', MS.scGiven); break;
      case 'stopDrip': m.inf.insulin = 0; msg('nurse', MS.dripStopped); break;
      case 'mannitol': case 'hts': {
        const vol = id === 'mannitol' ? p.gkg * 5 * w : p.mlkg * w;
        (id === 'mannitol' ? m.mannitol : m.hts).push({ at: now() });
        if (id === 'mannitol') { m.manVol = vol; m.manUntil = now() + 120; } else { m.htsVol = vol; m.NaC += vol * 0.513 / (0.6 * m.wt0); }
        if (m.ceOn != null) m.ceDrive = (m.ceDrive ?? 1) * (m.ceRisk < 1.5 ? 0.15 : 0.5);
        msg('nurse', id === 'mannitol' ? MS.man : MS.hts); break;
      }
      case 'bicarb': m.bicarbNow = 2 * p.meqkg; m.ceRisk += 1.2; msg('nurse', MS.bicarb); break;
      case 'kpo': m.kPO = p.meqkg * w; msg('nurse', MS.kpo); break;
      case 'kphos': m.kPO = 0.37 * p.mmolkg / 0.25 * w * 0.4; m.Pdef = Math.max(0, m.Pdef - p.mmolkg * w); msg('nurse', MS.kphos); break;
      case 'dexBolus': m.G += p.mlkg * 50; msg('nurse', oname(id) + ` ${Math.round(p.mlkg * w)} mL ✓`); break;
      case 'prbc': case 'ffp': case 'plt': case 'albumin': m.deficit -= p.mlkg * w; msg('nurse', oname(id) + ` ${Math.round(p.mlkg * w)} mL ✓`); break;
      case 'ondan': msg('nurse', MS.ondan); break;
      case 'po': S.flags.po = true; if (m.pH > 7.3 && m.HCO3 > 18) msg('nurse', MS.po); else { msg('nurse', MS.poEarly); m.ceRisk += 0.3; } break;
      default:
        if (LABS.includes(id)) {
          if (p.freq && +p.freq) S.standing[id] = { every: p.freq * 60, next: now() };
          else drawLab(id);
        } else msg('nurse', oname(id) + ' ✓');
    }
    renderOrders(); renderFlow(); renderStatus();
  }
  function drawLab(id) {
    const m = S.m; let v;
    if (['poc', 'vbg', 'chem', 'bhb'].includes(id)) v = M.labs(m, id);
    else if (id === 'abg') v = M.labs(m, 'vbg');
    else if (id === 'ecg') v = { txt: m.K > 6 ? (LANG === 'he' ? 'טכיקרדיה סינוסית, גלי T מחודדים' : 'Sinus tachycardia, peaked T waves') : m.K < 3 ? (LANG === 'he' ? 'טכיקרדיה סינוסית, גלי T שטוחים, גלי U' : 'Sinus tachycardia, flat T waves, U waves') : (LANG === 'he' ? 'טכיקרדיה סינוסית, ללא שינויי ST-T' : 'Sinus tachycardia, no ST-T changes') };
    else if (id === 'cbc') v = { txt: 'WBC 18.2 · Hb 15.1 · PLT 410 · CRP 0.6' };
    else if (id === 'coag') v = { txt: 'INR 1.0 · PTT 29' };
    else if (id === 'tns') v = { txt: 'A+ · screen −' };
    else if (id === 'bcx') v = { txt: LANG === 'he' ? 'ללא צמיחה' : 'No growth' };
    else if (id === 'ua') v = { txt: LANG === 'he' ? 'גלוקוז 4+, קטונים 3+, ללא לויקוציטים' : 'Glucose 4+, ketones 3+, no leukocytes' };
    else if (id === 'lipase') v = { txt: 'Lipase 42 · Amylase 120' };
    else if (id === 'lft') v = { txt: 'ALT 22 · AST 30 · Bili 0.4' };
    else if (id === 'dmw') v = { txt: 'HbA1c 12.4% · GAD +' };
    addResult(id, now() + (LAB_DELAY[id] || 30), v, m.t);
  }
  function addResult(kind, ready, v, drawn) { S.res.push({ kind, drawn: drawn ?? now(), ready, v }); }

  /* ---------------- time loop ---------------- */
  function pause() { if (S) { S.speed = 0; renderClock(); } }
  function stopLoop() { clearInterval(timer); timer = null; }
  function loop() {
    stopLoop();
    timer = setInterval(() => {
      if (!S || S.ended || !S.speed) return;
      S.acc += S.speed * 0.1;
      let n = Math.floor(S.acc); S.acc -= n;
      while (n-- > 0 && S.speed && !S.ended) minute();
      renderLive();
    }, 100);
  }
  function minute() {
    const m = S.m; M.step(m, 1); const t = m.t;
    /* standing orders */
    Object.entries(S.standing).forEach(([k, o]) => {
      if (t < o.next) return; o.next += o.every;
      if (k === 'neuro') addResult('neuro', t + 2, { GCS: m.GCS, pupils: L.pupilsV[m.pupils] }, t);
      else if (k === 'io') addResult('io', t + 1, { IN: Math.round(m.io.lastHourIn), OUT: Math.round(m.io.lastHourOut), UO: r1(m.io.lastHourOut / m.wt) }, t);
      else drawLab(k);
    });
    /* results arriving */
    S.res.forEach(r => { if (!r.seen && r.ready <= t) { r.seen = true; r.at = t; resultArrived(r); } });
    if (S.flags.picuAt && t >= S.flags.picuAt && S.flags.loc !== 'PICU') { S.flags.loc = 'PICU'; msg('sys', L.msgs.picuIn); }
    events();
    if (m.dead) { msg('nurse', L.msgs.died, true); endCase(); }
  }
  function resultArrived(r) {
    renderFlow();
    if (LEVEL === 'guided' && r.v && r.v.K != null && (r.v.K < 3.5 || r.v.K > 5.5)) msg('lab', `${L.flow.K} ${r.v.K}`, false);
  }
  function once(key, cond, fn) { if (!S.fired[key] && cond) { S.fired[key] = true; fn(); } }
  function events() {
    const m = S.m, MS = L.msgs, t = m.t, clock = (C.startClock + t) % 1440;
    once('thirsty', t >= 300, () => msg('nurse', MS.thirsty, true));
    once('headache', m.ce > 0.12, () => msg('nurse', MS.headache, true));
    once('hrDrop', m.ce > 0.32, () => { S.ceCritAt = t; msg('nurse', MS.hrDrop(m.HR), true); });
    once('pupils', m.ce > 0.58, () => msg('nurse', MS.pupils, true));
    if (S.flags.mon) {
      if (m.K < 3) once('kLow' + Math.floor(t / 240), true, () => msg('nurse', MS.kLow, true));
      if (m.K > 6.5) once('kHigh', true, () => msg('nurse', MS.kHigh, true));
    }
    if (m.G < 70) once('hypo' + Math.floor(t / 120), true, () => msg('nurse', MS.hypo(Math.round(m.G)), true));
    if (t % 60 === 0) { S.uoLow = m.io.lastHourOut / m.wt < 0.5 ? S.uoLow + 1 : 0; if (S.uoLow >= 2) once('lowUO', true, () => msg('nurse', MS.lowUO, true)); }
    once('breakfast', clock >= 7 * 60 + 30 && clock < 12 * 60 && m.pH > 7.3 && m.HCO3 > 18, () => msg('nurse', MS.breakfast, true));
    /* the case ends once he is on subcutaneous insulin, the drip is off and he has eaten */
    if (did('scRapid') && m.inf.insulin === 0 && S.flags.po && t - Math.max(firstT('scRapid'), firstT('stopDrip') ?? 0) >= 60) endCase();
    if (t >= 24 * 60) endCase();
  }

  /* ---------------- rendering ---------------- */
  function renderSim() {
    const g = LEVEL === 'guided';
    app.innerHTML = `<div class="sim">
      <header class="bar"><button class="iconbtn" data-home aria-label="${esc(L.home)}">‹</button>
        <div class="ttl"><b>${esc(CT().title)}</b><span id="loc"></span></div>
        <div class="clock"><small>${esc(L.clock)}</small><b id="clk"></b><small id="since"></small></div>
        <div class="speed" role="group" aria-label="${esc(L.speed)}">${[0, 1, 5, 15].map(x => `<button class="sp" data-sp="${x}" title="${x ? esc(L.perSec(x)) : esc(L.paused)}">${x ? '▶' + (x > 1 ? '×' + x : '') : '❚❚'}</button>`).join('')}<button class="sp" data-skip title="${esc(L.next)}">+1h</button></div>
        <button class="btn ghost sm" data-lang>${esc(L.lang)}</button><button class="btn ghost sm" data-end>${esc(L.endCase)}</button></header>
      <nav class="tabsm">${['mon', 'ord', 'res', 'feed'].map(k => `<button data-pane="${k}" class="${S.pane === k ? 'on' : ''}">${esc({ mon: L.monitor, ord: L.orders, res: L.results, feed: L.nurse }[k])}</button>`).join('')}</nav>
      <main class="grid pane-${S.pane}">
        <section class="col cmon"><div class="mon"><canvas id="cv"></canvas><div class="nums" id="nums"></div><div class="nosig" id="nosig">${esc(L.noMon)}<small>${esc(L.attachHint)}</small></div></div>
          <div class="pt" id="ptbox"></div></section>
        <section class="col cord"><div class="tabs">${Object.keys(CATALOG).map(k => `<button data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${esc(L.tabs[k])}</button>`).join('')}</div>
          <div class="cat" id="cat"></div><h3>${esc(L.active)}</h3><div id="active"></div></section>
        <section class="col cres"><h3>${esc(L.results)}</h3><div class="flow" id="flow"></div></section>
        <section class="col cfeed"><h3>${esc(L.nurse)}</h3><ol class="feed" id="feed"></ol></section>
      </main></div>`;
    MON = new Monitor($('#cv'));
    MON.onBeat = () => { if (S && S.flags.mon && S.speed) Snd.beep(S.m.SpO2); };
    app.onclick = e => {
      const sp = e.target.closest('[data-sp]'); if (sp) { S.speed = +sp.dataset.sp; Snd.ensure(); renderClock(); return; }
      if (e.target.closest('[data-skip]')) { const t0 = now(); S.speed = 1; while (now() < t0 + 60 && S.speed && !S.ended) minute(); if (!S.ended) { S.speed = 0; renderLive(); } return; }
      const tb = e.target.closest('[data-tab]'); if (tb) { S.tab = tb.dataset.tab; renderSim(); return; }
      const pn = e.target.closest('[data-pane]'); if (pn) { S.pane = pn.dataset.pane; renderSim(); return; }
      if (e.target.closest('[data-home]')) { home(); return; }
      if (e.target.closest('[data-end]')) { const m = modal(`<p>${esc(L.endQ)}</p><div class="row"><button class="btn primary" data-y>${esc(L.yes)}</button><button class="btn ghost" data-n>${esc(L.no)}</button></div>`); m.el.onclick = ev => { if (ev.target.closest('[data-y]')) { m.close(); endCase(); } else if (ev.target.closest('[data-n]')) m.close(); }; return; }
      const st = e.target.closest('[data-stop]'); if (st) { stopOrder(st.dataset.stop); return; }
      const ob = e.target.closest('[data-o]'); if (ob) { openForm(ob.dataset.o); }
    };
    renderCat(); renderOrders(); renderFlow(); renderFeed(); renderLive();
  }
  function renderClock() {
    if (!S) return;
    const c = $('#clk'); if (c) c.textContent = hhmm(C.startClock + now());
    const sn = $('#since'); if (sn) sn.textContent = `${L.since} ${dur(now())}`;
    $$('[data-sp]').forEach(b => b.classList.toggle('on', +b.dataset.sp === S.speed));
    const lc = $('#loc'); if (lc) lc.textContent = L.loc[S.flags.loc];
  }
  function renderLive() { renderClock(); renderStatus(); }
  function renderStatus() {
    if (!S || !$('#nums')) return;
    const m = S.m, on = !!S.flags.mon;
    $('#nosig').hidden = on;
    MON.set({ hr: m.HR, k: m.K, spo2: m.SpO2, rr: m.RR, deep: m.pCO2 < 28 && !m.vent, irreg: m.ce > 0.6 && !m.vent, perf: m.perf, on });
    const v = (k, val, u, c) => `<div class="nb" style="--c:${c}"><small>${k}</small><b>${on ? val : '--'}</b>${u ? `<i>${u}</i>` : ''}</div>`;
    const bpT = S.lastBP && now() - S.lastBP.t < 15 ? S.lastBP : (S.lastBP = { t: now(), v: `${m.SBP}/${m.DBP}` });
    $('#nums').innerHTML = v('HR', m.HR, '', '#3ef08f') + v('SpO₂', m.SpO2, '%', '#4fc3ff') + v('NIBP', bpT.v, '', '#ff6b7a') + v('RR', m.RR, '', '#ffd84a') + v('T', m.temp.toFixed(1), '°C', '#ffb46b');
    const io = m.io;
    $('#ptbox').innerHTML = `<div class="ptrow"><b>${esc(L.patient)}</b><span>${m.age}y · ${S.flags.weighed ? m.wt + ' kg' : '? kg'}</span><span>${esc(L.loc[S.flags.loc])}</span></div>
      <div class="ptrow"><span>${esc(L.flow.IN)} ${Math.round(io.inTotal)}</span><span>${esc(L.flow.OUT)} ${Math.round(io.out)}</span><span>${esc(L.flow.UO)} ${r1(io.lastHourOut / m.wt)}</span></div>
      <div class="ptrow infs"><span>${esc(oname('main'))}: ${m.inf.main.rate ? `${L.fl[m.inf.main.base]}${m.inf.main.dex ? ' D' + m.inf.main.dex + '%' : ''}${m.inf.main.kcl ? ' KCl ' + m.inf.main.kcl : ''} · ${m.inf.main.rate} mL/h` : '—'}</span><span>${esc(L.o.insDrip.split(' (')[0])}: ${m.inf.insulin ? m.inf.insulin + ' u/kg/h' : '—'}</span></div>`;
  }
  function renderCat() {
    const g = LEVEL === 'guided';
    $('#cat').innerHTML = CATALOG[S.tab].map(([id, o]) => `<button class="ord" data-o="${id}">${esc(oname(id))}${o === 'standing' ? ` <small>⟳</small>` : ''}</button>`).join('');
  }
  function stopOrder(k) {
    const m = S.m;
    if (k === 'main') m.inf.main = Object.assign({}, m.inf.main, { rate: 0 });
    else if (k === 'insDrip') m.inf.insulin = 0;
    else delete S.standing[k];
    S.log.push({ t: now(), id: 'stop', p: { k } }); renderOrders(); renderStatus();
  }
  function renderOrders() {
    const el = $('#active'); if (!el) return;
    const m = S.m, rows = [];
    if (m.inf.main.rate) rows.push(['main', `${oname('main')}: ${L.fl[m.inf.main.base]}${m.inf.main.dex ? ' D' + m.inf.main.dex + '%' : ''}${m.inf.main.kcl ? ' + KCl ' + m.inf.main.kcl : ''} · ${m.inf.main.rate} mL/h`]);
    if (m.inf.insulin) rows.push(['insDrip', `${oname('insDrip')}: ${m.inf.insulin} u/kg/h`]);
    m.inf.boluses.filter(b => b.left > 0).forEach(b => rows.push([null, `${oname('bolus')}: ${L.fl[b.fluid]} · ${Math.round(b.left)} mL`]));
    Object.entries(S.standing).forEach(([k, o]) => rows.push([k, `${oname(k)} · ${L.every(o.every / 60)}`]));
    el.innerHTML = rows.length ? rows.map(([k, txt]) => `<div class="act"><span>${esc(txt)}</span>${k ? `<button class="btn sm ghost" data-stop="${k}">${esc(L.stop)}</button>` : ''}</div>`).join('') : `<p class="muted">${esc(L.none)}</p>`;
  }
  function openForm(id) {
    const o = Object.values(CATALOG).flat().find(x => x[0] === id)[1] || {};
    const m = S.m, w = m.wt, g = LEVEL === 'guided';
    if (!o.f && !o.lab && o !== 'standing') { order(id); return; }
    if (o === 'standing') { order(id); return; }
    const fields = o.lab ? [['freq', 'freq']] : o.f;
    const fieldHTML = ([k, kind, opt]) => {
      const lbl = esc(L.f[k] || k);
      if (kind === 'sel') return `<label>${lbl}<select name="${k}">${opt.map(v => `<option value="${v}">${esc(k === 'fluid' || k === 'base' ? L.fl[v] : k === 'mode' ? EXTRA[LANG].modes[v] : k === 'dex' ? (v ? 'D' + v + '%' : '—') : v)}</option>`).join('')}</select></label>`;
      if (kind === 'freq') return `<label>${esc(L.f.freq)}<select name="freq"><option value="0">${esc(L.once)}</option>${[1, 2, 4].map(h => `<option value="${h}">${esc(L.every(h))}</option>`).join('')}</select></label>`;
      const unit = { mlkg: L.f.mlkg, over: '', rate: '', dose: id === 'insDrip' ? L.f.ukgh : L.f.ukg, gkg: L.f.gkg, meqkg: L.f.meqkg, mmolkg: L.f.mmolkg }[k] || '';
      return `<label>${lbl} <input name="${k}" type="number" step="any" inputmode="decimal" value="${opt}" dir="ltr"> <small>${esc(unit)}</small></label>`;
    };
    const mt = M.maint(w), lo = Math.round(1.5 * mt), hi = Math.round(2 * mt);
    const helper = () => {
      if (!g) return '';
      if (id === 'main') return L.help.maint(mt, 0, lo, hi);
      return '';
    };
    const md = modal(`<h3>${esc(oname(id))}</h3><form class="oform">${fields.map(fieldHTML).join('')}<p class="help" id="hlp">${esc(helper())}</p>
      <div class="row"><button class="btn primary" type="submit">${esc(L.order)}</button><button class="btn ghost" type="button" data-x>${esc(L.back)}</button></div></form>`);
    const f = $('form', md.el);
    const live = () => {
      if (!g) return; const fd = Object.fromEntries(new FormData(f)), h = $('#hlp', md.el);
      if (id === 'insDrip' && +fd.dose) h.textContent = L.help.ins(r1(fd.dose * w), r1(fd.dose * w * 10));
      if (id === 'mannitol') h.textContent = L.help.man(Math.round(fd.gkg * 5 * w));
      if (['bolus', 'hts', 'dexBolus', 'prbc', 'ffp', 'plt', 'albumin'].includes(id)) h.textContent = L.help.bol(Math.round(fd.mlkg * w));
    };
    f.addEventListener('input', live); live();
    f.addEventListener('submit', e => { e.preventDefault(); const fd = Object.fromEntries(new FormData(f)); Object.keys(fd).forEach(k => { if (!isNaN(+fd[k]) && fd[k] !== '' && !['fluid', 'base', 'mode'].includes(k)) fd[k] = +fd[k]; }); if (Object.values(fd).some(v => v === '')) return; md.close(); order(id, fd); });
    md.el.addEventListener('click', e => { if (e.target.closest('[data-x]')) md.close(); });
    const first = $('input,select', f); if (first) first.focus();
  }
  const ROWS = ['G', 'pH', 'pCO2', 'HCO3', 'Na', 'NaC', 'K', 'Cl', 'AG', 'eOsm', 'BUN', 'Cr', 'Ca', 'P', 'Mg', 'BHB', 'lact', 'GCS', 'pupils', 'UO', 'IN', 'OUT'];
  function renderFlow() {
    const el = $('#flow'); if (!el || !S) return;
    const t = now(), cols = {}, txt = [];
    S.res.forEach(r => {
      if (r.v && r.v.txt) { if (r.ready <= t) txt.push(r); return; }
      const key = r.drawn; (cols[key] = cols[key] || { t: r.drawn, v: {}, pend: false });
      if (r.ready > t) cols[key].pend = true; else Object.assign(cols[key].v, r.v);
    });
    const cs = Object.values(cols).sort((a, b) => a.t - b.t).slice(-12);
    cs.forEach(c => { const v = c.v; if (v.Na != null && v.G != null) { v.NaC = r1(v.Na + 1.6 * Math.max(0, v.G - 100) / 100); v.eOsm = Math.round(2 * v.Na + v.G / 18); } });
    const rows = ROWS.filter(k => cs.some(c => c.v[k] != null));
    const flag = (k, v) => ({ G: v < 70 || v > 250, pH: v < 7.3, HCO3: v < 18, K: v < 3.5 || v > 5.5, Na: v < 135 || v > 145, NaC: v < 135 || v > 150, P: v < 2 }[k] ? 'hi' : '');
    el.innerHTML = (cs.length ? `<div class="tw"><table><thead><tr><th>${esc(L.flow.time)}</th>${cs.map(c => `<th>${hhmm(C.startClock + c.t)}</th>`).join('')}</tr></thead><tbody>${rows.map(k => `<tr><th>${esc(L.flow[k])}</th>${cs.map(c => c.v[k] == null ? `<td>${c.pend ? '…' : ''}</td>` : `<td class="${flag(k, c.v[k])}">${esc(c.v[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<p class="muted">${esc(L.none)}</p>`)
      + (txt.length ? `<ul class="txtres">${txt.map(r => `<li><b>${hhmm(C.startClock + r.drawn)} · ${esc(oname(r.kind))}</b> ${esc(r.v.txt)}</li>`).join('')}</ul>` : '');
  }
  function renderFeed() {
    const el = $('#feed'); if (!el || !S) return;
    const who = { nurse: L.nurseSays, att: L.attSays, lab: L.lab, sys: L.sys };
    el.innerHTML = S.msgs.slice().reverse().map(x => `<li class="${x.kind}${x.crit ? ' crit' : ''}"><small>${hhmm(C.startClock + x.t)} · ${esc(who[x.kind])}</small>${esc(x.text)}</li>`).join('');
  }

  /* ---------------- scoring ---------------- */
  function rubric() {
    const m = S.m, w = m.wt, mt = M.maint(w), lg = S.log, R = [], he = LANG === 'he';
    const add = (key, wt, ok, en, heTxt, src, part) => R.push({ key, wt, got: part != null ? wt * part : ok ? wt : 0, ok: part != null ? part >= 0.99 : ok, txt: he ? heTxt : en, src });
    const T = id => firstT(id), within = (id, lim) => T(id) != null && T(id) <= lim;
    const res = S.res.filter(r => r.v && !r.v.txt && r.ready <= m.t).sort((a, b) => a.ready - b.ready);
    const firstRes = f => res.find(r => f(r.v));
    const mainAt = (t) => { let cur = null; lg.forEach(e => { if (e.t <= t && (e.id === 'main' || (e.id === 'stop' && e.p.k === 'main'))) cur = e.id === 'main' ? e.p : null; }); return cur; };
    const insAt = (t) => { let cur = 0; lg.forEach(e => { if (e.t <= t) { if (e.id === 'insDrip') cur = e.p.dose; if (e.id === 'stopDrip' || (e.id === 'stop' && e.p.k === 'insDrip')) cur = 0; } }); return cur; };
    const mains = lg.filter(e => e.id === 'main');
    const fluidStart = Math.min(...['bolus', 'main'].map(T).filter(x => x != null), Infinity);
    add('weigh', 4, within('weigh', 15), 'Weigh on arrival (doses and the deficit depend on it).', 'שקילה בקבלה (המינונים והחסר תלויים בה).', 'prot');
    add('monitor', 4, within('monitor', 15), 'Full monitoring from the start (heart rhythm for potassium changes).', 'ניטור מלא מההתחלה (קצב הלב לשינויי אשלגן).', 'prot');
    add('labs0', 5, (within('vbg', 30) || within('chem', 30)) && (within('poc', 30) || within('bhb', 30) || within('ua', 30)), 'First bloods within 30 min: gas, electrolytes, glucose, ketones.', 'בדיקות ראשונות תוך 30 דקות: גזים, אלקטרוליטים, סוכר, קטונים.', 'prot');
    const bol = lg.filter(e => e.id === 'bolus' && e.t <= 120), bolKg = bol.reduce((a, e) => a + e.p.mlkg, 0);
    add('bolus', 8, null, `First hour: NaCl 0.9% 10 mL/kg over an hour (20 mL/kg only for severe dehydration with instability, with the attending). You gave ${r1(bolKg)} mL/kg.`, `שעה ראשונה: NaCl 0.9% 10 מ״ל/ק״ג במשך שעה (20 מ״ל/ק״ג רק בדהידרציה קשה עם חוסר יציבות, באישור כונן). ניתן: ${r1(bolKg)} מ״ל/ק״ג.`, 'prot',
      !bol.length || bol[0].t > 30 ? 0 : bolKg >= 9 && bolKg <= 11 && bol.every(e => e.p.fluid === 'NS') ? 1 : bolKg > 11 && bolKg <= 21 ? (S.att.some(a => a <= bol[bol.length - 1].t) ? 0.8 : 0.5) : bolKg < 9 ? 0.5 : 0);
    const endT = Math.min(m.t, 12 * 60);
    let rs = 0, rn = 0; for (let t = 120; t <= endT; t += 10) { const c = mainAt(t); if (c) { rs += c.rate; rn++; } }
    const avg = rn ? rs / rn : 0, ratio = avg / mt;
    add('fluids', 10, null, `From hour 2: deficit over 48 h + maintenance ≈ 1.5–2× maintenance (${Math.round(1.5 * mt)}–${Math.round(2 * mt)} mL/h), NaCl 0.9%; never above 2× unless in shock. Your average: ${Math.round(avg)} mL/h (${r1(ratio)}×).`, `משעה שנייה: חסר על פני 48 שעות + אחזקה ≈ פי 1.5–2 מהאחזקה (${Math.round(1.5 * mt)}–${Math.round(2 * mt)} מ״ל/שע׳), NaCl 0.9%; לא יותר מפי 2 אלא בשוק. הממוצע שלך: ${Math.round(avg)} מ״ל/שע׳ (פי ${r1(ratio)}).`, 'prot',
      !mains.length || mains[0].t > 120 ? 0 : (ratio >= 1.4 && ratio <= 2.05 ? 0.8 : ratio > 2.05 && ratio <= 2.5 ? 0.3 : 0.2) + (mains.every(e => e.p.base === 'NS') ? 0.2 : 0));
    const ins = lg.filter(e => e.id === 'insDrip'), ins0 = ins[0], attBefore = t => S.att.some(a => a <= t);
    add('insStart', 10, null, 'Insulin infusion after the first hour of fluids, 0.05 units/kg/h (0.1 only with the attending), never as a bolus; not before potassium is at least 3.3.', 'עירוי אינסולין אחרי שעת הנוזלים הראשונה, 0.05 יח׳/ק״ג/שע׳ (0.1 רק באישור כונן), אף פעם לא בבולוס; לא לפני שהאשלגן לפחות 3.3.', 'prot',
      !ins0 ? 0 : (ins0.t - fluidStart >= 45 && ins0.t - fluidStart <= 150 ? 0.5 : 0.15) + (Math.abs(ins0.p.dose - 0.05) < 0.011 || (Math.abs(ins0.p.dose - 0.1) < 0.011 && attBefore(ins0.t)) ? 0.3 : 0) + (did('insBolus') ? 0 : 0.2));
    const maxIns = Math.max(0, ...ins.map(e => e.p.dose));
    let offAcid = 0; for (let t = 120; t < m.t; t += 10) if (insAt(t) === 0 && !did('scRapid') && (m.hist.find(h => h.t >= t) || {}).pH < 7.3) offAcid += 10;
    add('insMgmt', 6, maxIns <= 0.1 + 1e-9 && (maxIns < 0.099 || attBefore(ins.find(e => e.p.dose >= 0.099).t)) && offAcid <= 60, 'Keep the drip at 0.05–0.1 units/kg/h until the acidosis is over; do not leave it off for long while still acidotic.', 'להשאיר עירוי 0.05–0.1 יח׳/ק״ג/שע׳ עד תיקון החמצת; לא להשאיר אותו כבוי זמן רב כשעדיין יש חמצת.', 'prot');
    /* potassium against the results the learner had */
    let kOk = 1; const kNotes = [];
    /* potassium goes in with the maintenance fluids: judged from the later of the first K below 5 and the start of those fluids */
    const k50 = firstRes(v => v.K != null && v.K < 5), mStart = mains.length ? mains[0].t : null;
    if (k50 && mStart != null) { const t0 = Math.max(k50.ready, mStart); const c = lg.find(e => e.t >= t0 - 5 && e.t <= t0 + 60 && ((e.id === 'main' && e.p.kcl >= 40) || e.id === 'kpo')) || (mainAt(t0 + 60) && mainAt(t0 + 60).kcl >= 40); if (!c) { kOk -= 0.5; kNotes.push('K<5 → KCl 40'); } }
    const k35 = firstRes(v => v.K != null && v.K < 3.5);
    if (k35) { const c = lg.find(e => e.t >= k35.ready && e.t <= k35.ready + 60 && ((e.id === 'main' && e.p.kcl >= 60) || e.id === 'kpo')) || (mainAt(k35.ready) && mainAt(k35.ready).kcl >= 60); if (!c) { kOk -= 0.4; kNotes.push('K<3.5 → 60/L or PO'); } }
    if (res.some(r => r.v.K > 5.5 && mainAt(r.ready) && mainAt(r.ready).kcl > 0)) { kOk -= 0.3; kNotes.push('K>5.5 with KCl running'); }
    if (Math.min(...m.hist.map(h => h.K)) < 2.8) kOk -= 0.3;
    add('potassium', 10, null, 'Potassium: K above 5.5 → wait for urine and K below 5; 3.5–5.5 → KCl 40 mEq/L; below 3.5 → 60 mEq/L (or add oral potassium); peripheral line up to 40–60 mEq/L.', 'אשלגן: מעל 5.5 → להמתין למתן שתן ולירידה מתחת ל-5; 3.5–5.5 → KCl 40 מא״ק/ל׳; מתחת ל-3.5 → 60 מא״ק/ל׳ (או תוספת פומית); בווריד פריפרי עד 40–60 מא״ק/ל׳.', 'prot', Math.max(0, kOk));
    let dOk = 1; const g300 = firstRes(v => v.G != null && v.G < 300), g180 = firstRes(v => v.G != null && v.G < 180);
    if (g300 && !(mainAt(g300.ready + 60) && mainAt(g300.ready + 60).dex >= 5)) dOk -= 0.5;
    if (g180 && !(mainAt(g180.ready + 60) && mainAt(g180.ready + 60).dex >= 10)) dOk -= 0.5;
    add('dextrose', 10, null, 'Add dextrose as glucose falls: below 300 → NaCl 0.9% + D5; below 180 → D10; target 150–250 mg/dL.', 'להוסיף גלוקוז כשהסוכר יורד: מתחת ל-300 → NaCl 0.9% + D5; מתחת ל-180 → D10; יעד 150–250 מ״ג/ד״ל.', 'prot', Math.max(0, dOk));
    const gmin = Math.min(...m.hist.map(h => h.G));
    add('hypo', 6, gmin >= 70, `No hypoglycemia (lowest glucose ${Math.round(gmin)} mg/dL). Below 60: call the attending.`, `ללא היפוגליקמיה (הסוכר הנמוך ביותר ${Math.round(gmin)} מ״ג/ד״ל). מתחת ל-60: ייעוץ כונן.`, 'prot');
    const fastH = m.hourly.filter(h => h.dG > 100).length;
    add('gfall', 5, fastH <= 1, `Glucose falls by no more than 100 mg/dL per hour (${fastH} hours faster).`, `הסוכר יורד לא יותר מ-100 מ״ג/ד״ל בשעה (${fastH} שעות מהר יותר).`, 'prot');
    const st = k => lg.find(e => e.id === k && e.p && e.p.freq);
    const pocQ = lg.find(e => e.id === 'poc' && e.p.freq === 1 && e.t <= 60), labQ = lg.find(e => ['vbg', 'chem'].includes(e.id) && e.p.freq && e.p.freq <= 4 && e.t <= 120), neuQ = lg.find(e => e.id === 'neuro' && e.t <= 60);
    add('monitoring', 6, null, 'Standing orders: glucose every hour, neuro checks every hour, gases and electrolytes every 2–4 hours, hourly input/output.', 'הוראות קבועות: סוכר כל שעה, אומדן נוירולוגי כל שעה, גזים ואלקטרוליטים כל 2–4 שעות, מאזן נוזלים כל שעה.', 'prot', (pocQ ? 0.35 : 0) + (labQ ? 0.3 : 0) + (neuQ ? 0.25 : 0) + (did('io') ? 0.1 : 0));
    add('nobicarb', 4, !did('bicarb'), 'No bicarbonate: it raises the risk of hypokalemia and cerebral edema.', 'ללא ביקרבונט: מעלה סיכון להיפוקלמיה ולבצקת מוחית.', 'nelson');
    const poE = lg.find(e => e.id === 'po');
    add('npo', 3, within('npo', 60) && (!poE || res.some(r => r.ready <= poE.t && r.v.pH > 7.3 && r.v.HCO3 > 18)), 'Nothing by mouth until the acidosis has resolved.', 'צום עד תיקון החמצת.', 'prot');
    add('picu', 4, within('picu', 120), 'Severe DKA (pH below 7.1) is treated in the PICU.', 'DKA קשה (pH מתחת ל-7.1) מטופל בטיפול נמרץ.', 'prot');
    if (S.ceCritAt != null) {
      const c0 = S.ceCritAt, osm = lg.find(e => (e.id === 'mannitol' || e.id === 'hts') && e.t >= c0 - 30 && e.t <= c0 + 30);
      const before = mainAt(c0 - 1), cut = before && lg.find(e => e.id === 'main' && e.t >= c0 - 30 && e.t <= c0 + 45 && e.p.rate <= before.rate * 0.75);
      const part = (osm ? 0.55 : 0) + (cut ? 0.15 : 0) + (m.headUp && T('headUp') <= c0 + 45 ? 0.1 : 0) + (lg.some(e => e.id === 'insDrip' && e.t >= c0 - 30 && e.t <= c0 + 60 && e.p.dose <= 0.03) ? 0.1 : 0) + (S.att.some(a => a >= c0 - 30 && a <= c0 + 45) ? 0.1 : 0);
      add('ce', 11, null, 'Cerebral edema (headache, vomiting, heart rate falling >20, drowsy): within 30 min mannitol 0.5–1 g/kg over 20 min (or NaCl 3% 5–10 mL/kg), cut fluids by a third, head up 30°, insulin 0.025 units/kg/h, call the attending; CT only after stabilizing.', 'בצקת מוחית (כאב ראש, הקאה, ירידת דופק מעל 20, ישנוניות): תוך 30 דקות מניטול 0.5–1 גר׳/ק״ג במשך 20 דקות (או NaCl 3% 5–10 מ״ל/ק״ג), הורדת נוזלים בשליש, ראש 30°, אינסולין 0.025 יח׳/ק״ג/שע׳, קריאה לכונן; CT רק אחרי ייצוב.', 'prot', part);
    }
    const sc = lg.find(e => e.id === 'scRapid'), clock = t => (C.startClock + t) % 1440;
    const exitOk = sc && res.some(r => r.ready <= sc.t && r.v.pH > 7.3 && r.v.HCO3 > 18) && S.flags.po && lg.some(e => (e.id === 'stopDrip' || (e.id === 'stop' && e.p.k === 'insDrip')) && e.t >= sc.t - 5 && e.t <= sc.t + 60) && !(clock(sc.t) >= 23 * 60 || clock(sc.t) < 6 * 60);
    add('exit', 6, !!exitOk, 'Leaving DKA: pH above 7.3 and HCO₃ above 18, eating without nausea; rapid insulin SC right before a meal, then stop the drip. Not in the middle of the night.', 'יציאה מ-DKA: pH מעל 7.3 ו-HCO₃ מעל 18, אוכל בלי בחילה; אינסולין מהיר תת-עורי מיד לפני ארוחה, ואז להפסיק את העירוי. לא באמצע הלילה.', 'prot');
    const ceMin = m.hist.filter(h => h.ce > 0.35).length * 5;
    add('brain', 8, ceMin <= 60, `Neurological outcome: ${ceMin ? `signs of raised intracranial pressure for about ${dur(ceMin)} h` : 'no lasting signs of raised intracranial pressure'}.`, `תוצאה נוירולוגית: ${ceMin ? `סימני לחץ תוך-גולגולתי מוגבר במשך כ-${dur(ceMin)} שע׳` : 'ללא סימנים ממושכים של לחץ תוך-גולגולתי מוגבר'}.`, 'prot');
    const extra = lg.filter(e => UNNEEDED[e.id] != null).map(e => e.id), pen = [...new Set(extra)].reduce((a, k) => a + UNNEEDED[k], 0);
    if (extra.length) add('extra', 0, false, `Unnecessary interventions: ${[...new Set(extra)].map(oname).join(', ')} (−${pen}).`, `התערבויות מיותרות: ${[...new Set(extra)].map(oname).join(', ')} (מינוס ${pen}).`, 'nelson');
    const max = R.reduce((a, r) => a + r.wt, 0); let got = R.reduce((a, r) => a + r.got, 0) - pen;
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
      <text x="2" y="${y(mx) + 4}" fill="#8aa4ae" font-size="9">${r1(mx)}</text><text x="2" y="${y(mn)}" fill="#8aa4ae" font-size="9">${r1(mn)}</text><text x="${W - 30}" y="${Ht - 2}" fill="#8aa4ae" font-size="9">${dur(t1)}</text></svg></figure>`;
  }
  function endCase() {
    if (!S || S.ended) return;
    S.ended = true; S.speed = 0; stopLoop();
    const { R, pct } = rubric(), SRC = C.src;
    const md = modal(`<h2>${esc(L.debrief)} · ${esc(CT().title)}</h2>
      <div class="score"><b>${pct}%</b><span>${esc(L.survived)}: ${S.m.dead ? '✗' : '✓'} · ${esc(dur(S.m.t))}</span></div>
      <h3>${esc(L.rubric)}</h3><ul class="rub">${R.map(r => `<li class="${r.ok ? 'ok' : r.got > 0 ? 'part' : 'bad'}"><span class="mk">${r.ok ? '✓' : r.got > 0 ? '◐' : '✗'}</span><span>${esc(r.txt)} <small>${esc((SRC[r.src] || {})[LANG] || '')}</small></span></li>`).join('')}</ul>
      <h3>${esc(L.charts)}</h3><div class="charts">${chart('G', L.flow.G, 150, 250, '#ffd84a')}${chart('K', L.flow.K, 4, 5, '#3ef08f')}${chart('pH', 'pH', 7.3, 7.45, '#4fc3ff')}${chart('NaC', L.flow.NaC, 135, 145, '#ff8a4c')}${chart('eOsm', L.flow.eOsm, 280, 300, '#c39bff')}${chart('GCS', 'GCS', 14, 15, '#ff6b7a')}</div>
      <div class="row"><button class="btn primary" data-again>${esc(L.again)}</button><button class="btn ghost" data-home2>${esc(L.home)}</button></div>`, 'wide');
    md.el.addEventListener('click', e => { if (e.target.closest('[data-again]')) { md.close(); startCase(); } else if (e.target.closest('[data-home2]')) { md.close(); home(); } });
  }

  /* test hook (?debug) */
  if (/[?&]debug/.test(location.search)) window.__sim = { get S() { return S; }, order, minute, endCase, rubric, startCase };
  home();
})();
