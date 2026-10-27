/* UI strings, Hebrew and English */
window.I18N = {
  en: {
    appTitle: 'Peds ER & PICU Sim', appSub: 'Pediatric emergency and intensive-care simulations for residents: you write the orders, the patient responds over hours.',
    start: 'Start', back: 'Back', lang: 'עברית', level: 'Level', guided: 'Guided', indep: 'Independent',
    guidedD: 'Calculation helpers in the order forms and a hint when a critical result arrives.', indepD: 'No helpers: calculate rates and doses yourself, like on shift.',
    caseFile: 'Case', triage: 'Triage', history: 'History', exam: 'Examination',
    clock: 'Time', since: 'Since arrival', paused: 'Paused', play: 'Run', next: 'Next hour', loc: { ED: 'ED', PICU: 'PICU' },
    monitor: 'Monitor', orders: 'Orders', results: 'Results', nurse: 'Nurse & events', patient: 'Patient',
    noMon: 'Not connected', attachHint: 'Order a cardiac monitor', active: 'Active orders', none: 'None yet',
    tabs: { care: 'Care', labs: 'Labs', fluids: 'Fluids', insulin: 'Insulin', meds: 'Drugs' },
    order: 'Order', stop: 'Stop', change: 'Change', once: 'Once', every: h => `every ${h} h`,
    o: {
      weigh: 'Weigh the patient', monitor: 'Cardiac monitor + SpO₂ + BP cuff', iv: 'Two IV lines', npo: 'Nothing by mouth (NPO)', headUp: 'Head of bed 30°, midline',
      neuro: 'Neuro checks (GCS, pupils) every hour', io: 'Strict input/output every hour', att: 'Call the attending', picu: 'Admit to PICU', ct: 'Head CT',
      historyQ: 'Take the history', examQ: 'Examine the patient',
      poc: 'Capillary glucose', vbg: 'Venous blood gas + lytes', chem: 'Chemistry (Na, K, Cl, urea, creatinine, Ca, P, Mg)', bhb: 'Blood ketones (β-hydroxybutyrate)', cbc: 'Blood count + CRP', ecg: '12-lead ECG', dmw: 'Diabetes work-up (HbA1c, antibodies, TSH, celiac)',
      bolus: 'Fluid bolus', main: 'IV fluids (continuous)', insDrip: 'Insulin infusion (regular, IV)', insBolus: 'Insulin IV bolus', scRapid: 'Rapid insulin SC before a meal', scBasal: 'Basal insulin SC (glargine)', stopDrip: 'Stop the insulin infusion',
      mannitol: 'Mannitol 20%', hts: 'NaCl 3%', bicarb: 'Sodium bicarbonate 8.4%', kpo: 'Potassium by mouth/NG (Sopa-K)', kphos: 'Potassium phosphate IV', ondan: 'Ondansetron IV', po: 'Allow drinking and a meal', intub: 'Intubate and ventilate'
    },
    f: { fluid: 'Fluid', mlkg: 'mL/kg', over: 'over (min)', base: 'Solution', dex: 'Dextrose', kcl: 'KCl (mEq/L)', rate: 'Rate (mL/h)', dose: 'Dose', ukgh: 'units/kg/h', ukg: 'units/kg', gkg: 'g/kg', meqkg: 'mEq/kg', mmolkg: 'mmol/kg', mgkg: 'mg/kg', freq: 'Frequency' },
    fl: { NS: 'NaCl 0.9%', HALF: 'NaCl 0.45%', LR: 'Ringer lactate' },
    help: {
      maint: (m, d, lo, hi) => `Maintenance (4-2-1): ${m} mL/h. Protocol: deficit over 48 h + maintenance ≈ 1.5–2× maintenance = ${lo}–${hi} mL/h.`,
      ins: (u, ml) => `= ${u} units/h · ${ml} mL/h of 10 units in 100 mL`,
      man: ml => `= ${ml} mL of mannitol 20%`, hts: ml => `= ${ml} mL`, bol: ml => `= ${ml} mL`
    },
    nurseSays: 'Nurse', attSays: 'Attending', lab: 'Result', sys: 'Note',
    msgs: {
      weighed: w => `Weight now: ${w} kg (35 kg two months ago).`, ivIn: 'Two IV lines in. Bloods can be drawn from the line.', noIV: 'There is no IV access yet.',
      monOn: 'Monitor attached.', npo: 'NPO noted.', headUp: 'Head of bed up 30°.', picuReq: 'PICU accepts. Transfer in about 30 minutes.', picuIn: 'He is in the PICU now.',
      thirsty: 'He says he is very thirsty and asks for water.', headache: 'He complains of a headache and vomited again.', hrDrop: hr => `Heart rate fell to ${hr} and he is harder to wake.`,
      pupils: 'Pupils are sluggish and his breathing is irregular!', kLow: 'On the monitor: flat T waves and U waves.', kHigh: 'On the monitor: tall peaked T waves.',
      hypo: g => `He is sweaty and confused. Capillary glucose ${g} mg/dL.`, lowUO: 'Urine output has been low for two hours.', breakfast: 'It is morning; breakfast has arrived and he is hungry.',
      died: 'He stopped breathing and lost his pulse. Resuscitation was not successful.', ctEarly: 'CT is not safe now: stabilize first.', ctDone: 'CT: diffuse cerebral edema, no bleeding.', ctNormal: 'CT: no edema or bleeding.',
      attCE: 'Treat it as cerebral edema now: mannitol 0.5–1 g/kg over 20 min (or NaCl 3% 5–10 mL/kg), cut fluids by a third, head up 30°, lower insulin to 0.025 units/kg/h, PICU. CT only after he is stable.',
      attGen: 'Follow the protocol and update me with the next gas. Glucose should fall by no more than 100 mg/dL per hour; aim for potassium 4–5.',
      attIns: 'Approved, you can go up to 0.1 units/kg/h if the acidosis is not improving.',
      intub: 'Intubated and ventilated. Ventilate to the pCO₂ he had before he deteriorated, not lower.',
      po: 'He drinks and eats.', poEarly: 'He drinks a cup of water and vomits.', scGiven: 'Subcutaneous insulin given.', dripStopped: 'Insulin infusion stopped.',
      ondan: 'Ondansetron given.', bicarb: 'Bicarbonate is running.', kpo: 'Potassium given by mouth.', kphos: 'Potassium phosphate running over 4 hours.',
      man: 'Mannitol running over 20 minutes.', hts: 'NaCl 3% running over 30 minutes.', insBolus: 'Insulin bolus given.'
    },
    flow: { time: 'Time', G: 'Glucose', pH: 'pH', pCO2: 'pCO₂', HCO3: 'HCO₃', Na: 'Na', NaC: 'Na corrected', K: 'K', Cl: 'Cl', AG: 'Anion gap', eOsm: 'Eff. osmolality', BUN: 'Urea (BUN)', Cr: 'Creatinine', Ca: 'Ca', P: 'Phosphate', Mg: 'Mg', BHB: 'Ketones', lact: 'Lactate', GCS: 'GCS', pupils: 'Pupils', UO: 'Urine mL/kg/h', IN: 'In (mL)', OUT: 'Out (mL)' },
    pending: 'pending', endCase: 'End case', endQ: 'End the case and see the debrief?', yes: 'Yes', no: 'No',
    debrief: 'Debrief', score: 'Score', survived: 'Outcome', needed: 'What was needed', charts: 'Course', rubric: 'Checklist', again: 'Play again', home: 'Home',
    pupilsV: { normal: 'equal, reactive', sluggish: 'sluggish', unequal: 'unequal' },
    lookNow: 'Now', examNow: (s) => `GCS ${s.GCS}, pupils ${s.pupilsTxt}. CRT ${s.CRT} s. ${s.kuss ? 'Kussmaul breathing.' : 'Breathing calmly.'} ${s.headache ? 'Complains of headache.' : ''}`,
    speed: 'Speed', perSec: x => `${x} min/s`
  },
  he: {
    appTitle: 'סימולטור מיון וטיפול נמרץ ילדים', appSub: 'סימולציות חירום וטיפול נמרץ ילדים למתמחים: אתם כותבים את ההוראות, והמטופל מגיב לאורך שעות.',
    start: 'התחלה', back: 'חזרה', lang: 'English', level: 'רמה', guided: 'מודרך', indep: 'עצמאי',
    guidedD: 'עזרי חישוב בטפסי ההוראות ורמז כשמגיעה תוצאה קריטית.', indepD: 'בלי עזרים: מחשבים קצבים ומינונים לבד, כמו במשמרת.',
    caseFile: 'המקרה', triage: 'טריאז׳', history: 'אנמנזה', exam: 'בדיקה',
    clock: 'שעה', since: 'מאז ההגעה', paused: 'עצור', play: 'הפעלה', next: 'שעה קדימה', loc: { ED: 'מיון', PICU: 'טיפול נמרץ' },
    monitor: 'מוניטור', orders: 'הוראות', results: 'תוצאות', nurse: 'אחות ואירועים', patient: 'המטופל',
    noMon: 'לא מחובר', attachHint: 'הזמינו מוניטור', active: 'הוראות פעילות', none: 'אין עדיין',
    tabs: { care: 'טיפול', labs: 'מעבדה', fluids: 'נוזלים', insulin: 'אינסולין', meds: 'תרופות' },
    order: 'הוראה', stop: 'הפסקה', change: 'שינוי', once: 'פעם אחת', every: h => `כל ${h} שע׳`,
    o: {
      weigh: 'שקילה', monitor: 'מוניטור לב + סטורציה + שרוול ל״ד', iv: 'שני עירויים', npo: 'צום (NPO)', headUp: 'הגבהת ראש המיטה ל-30°, ראש בקו האמצע',
      neuro: 'אומדן נוירולוגי (GCS, אישונים) כל שעה', io: 'מאזן נוזלים מדויק כל שעה', att: 'קריאה לכונן', picu: 'אשפוז בטיפול נמרץ', ct: 'CT ראש',
      historyQ: 'אנמנזה', examQ: 'בדיקת המטופל',
      poc: 'סוכר קפילרי', vbg: 'גזים ורידיים + אלקטרוליטים', chem: 'כימיה (נתרן, אשלגן, כלור, אוריאה, קראטינין, סידן, זרחן, מגנזיום)', bhb: 'קטונים בדם (β-הידרוקסיבוטיראט)', cbc: 'ספירת דם + CRP', ecg: 'אק״ג 12 לידים', dmw: 'בירור סוכרת (HbA1c, נוגדנים, TSH, צליאק)',
      bolus: 'בולוס נוזלים', main: 'עירוי נוזלים רציף', insDrip: 'עירוי אינסולין (רגולר, IV)', insBolus: 'בולוס אינסולין IV', scRapid: 'אינסולין מהיר תת-עורי לפני ארוחה', scBasal: 'אינסולין בזאלי תת-עורי (לנטוס)', stopDrip: 'הפסקת עירוי האינסולין',
      mannitol: 'מניטול 20%', hts: 'NaCl 3%', bicarb: 'סודיום ביקרבונט 8.4%', kpo: 'אשלגן פומי/בזונדה (Sopa-K)', kphos: 'פוטסיום פוספט IV', ondan: 'אונדנסטרון IV', po: 'התרת שתייה וארוחה', intub: 'אינטובציה והנשמה'
    },
    f: { fluid: 'נוזל', mlkg: 'מ״ל/ק״ג', over: 'במשך (דק׳)', base: 'תמיסה', dex: 'גלוקוז', kcl: 'KCl (מא״ק/ל׳)', rate: 'קצב (מ״ל/שע׳)', dose: 'מינון', ukgh: 'יח׳/ק״ג/שע׳', ukg: 'יח׳/ק״ג', gkg: 'גר׳/ק״ג', meqkg: 'מא״ק/ק״ג', mmolkg: 'ממול/ק״ג', mgkg: 'מ״ג/ק״ג', freq: 'תדירות' },
    fl: { NS: 'NaCl 0.9%', HALF: 'NaCl 0.45%', LR: 'רינגר לקטט' },
    help: {
      maint: (m, d, lo, hi) => `אחזקה (4-2-1): ${m} מ״ל/שע׳. לפי הפרוטוקול: חסר על פני 48 שעות + אחזקה ≈ פי 1.5–2 מהאחזקה = ${lo}–${hi} מ״ל/שע׳.`,
      ins: (u, ml) => `= ${u} יח׳/שע׳ · ${ml} מ״ל/שע׳ של 10 יח׳ ב-100 מ״ל`,
      man: ml => `= ${ml} מ״ל מניטול 20%`, hts: ml => `= ${ml} מ״ל`, bol: ml => `= ${ml} מ״ל`
    },
    nurseSays: 'אחות', attSays: 'כונן', lab: 'תוצאה', sys: 'הערה',
    msgs: {
      weighed: w => `משקל כעת: ${w} ק״ג (35 ק״ג לפני חודשיים).`, ivIn: 'הוכנסו שני עירויים. אפשר לקחת דמים מהעירוי.', noIV: 'אין עדיין גישה ורידית.',
      monOn: 'המוניטור חובר.', npo: 'צום נרשם.', headUp: 'ראש המיטה הוגבה ל-30°.', picuReq: 'טיפול נמרץ מקבלים. מעבר בעוד כחצי שעה.', picuIn: 'הוא כעת בטיפול נמרץ.',
      thirsty: 'הוא אומר שהוא צמא מאוד ומבקש מים.', headache: 'הוא מתלונן על כאב ראש והקיא שוב.', hrDrop: hr => `הדופק ירד ל-${hr} וקשה יותר להעיר אותו.`,
      pupils: 'האישונים מגיבים באיטיות והנשימה לא סדירה!', kLow: 'במוניטור: גלי T שטוחים וגלי U.', kHigh: 'במוניטור: גלי T גבוהים ומחודדים.',
      hypo: g => `הוא מזיע ומבולבל. סוכר קפילרי ${g} מ״ג/ד״ל.`, lowUO: 'תפוקת השתן נמוכה כבר שעתיים.', breakfast: 'בוקר; ארוחת הבוקר הגיעה והוא רעב.',
      died: 'הוא הפסיק לנשום ואיבד דופק. ההחייאה לא הצליחה.', ctEarly: 'CT לא בטוח כעת: קודם לייצב.', ctDone: 'CT: בצקת מוחית מפושטת, ללא דימום.', ctNormal: 'CT: ללא בצקת או דימום.',
      attCE: 'טפלו בזה כבבצקת מוחית עכשיו: מניטול 0.5–1 גר׳/ק״ג במשך 20 דקות (או NaCl 3% 5–10 מ״ל/ק״ג), הורידו נוזלים בשליש, ראש מוגבה 30°, הורידו אינסולין ל-0.025 יח׳/ק״ג/שע׳, טיפול נמרץ. CT רק אחרי ייצוב.',
      attGen: 'המשיכו לפי הפרוטוקול ועדכנו אותי עם הגזים הבאים. הסוכר צריך לרדת לא יותר מ-100 מ״ג/ד״ל בשעה; שאפו לאשלגן 4–5.',
      attIns: 'מאושר, אפשר לעלות עד 0.1 יח׳/ק״ג/שע׳ אם החמצת לא משתפרת.',
      intub: 'אונטב ומונשם. הנשימו לרמת ה-pCO₂ שהייתה לו לפני ההידרדרות, לא נמוך ממנה.',
      po: 'הוא שותה ואוכל.', poEarly: 'הוא שותה כוס מים ומקיא.', scGiven: 'אינסולין תת-עורי ניתן.', dripStopped: 'עירוי האינסולין הופסק.',
      ondan: 'אונדנסטרון ניתן.', bicarb: 'ביקרבונט רץ.', kpo: 'אשלגן ניתן פומית.', kphos: 'פוטסיום פוספט רץ במשך 4 שעות.',
      man: 'מניטול רץ במשך 20 דקות.', hts: 'NaCl 3% רץ במשך 30 דקות.', insBolus: 'בולוס אינסולין ניתן.'
    },
    flow: { time: 'שעה', G: 'סוכר', pH: 'pH', pCO2: 'pCO₂', HCO3: 'HCO₃', Na: 'נתרן', NaC: 'נתרן מתוקן', K: 'אשלגן', Cl: 'כלור', AG: 'פער אניונים', eOsm: 'אוסמולליות אפקטיבית', BUN: 'אוריאה', Cr: 'קראטינין', Ca: 'סידן', P: 'זרחן', Mg: 'מגנזיום', BHB: 'קטונים', lact: 'לקטט', GCS: 'GCS', pupils: 'אישונים', UO: 'שתן מ״ל/ק״ג/שע׳', IN: 'נכנס (מ״ל)', OUT: 'יצא (מ״ל)' },
    pending: 'ממתין', endCase: 'סיום המקרה', endQ: 'לסיים את המקרה ולראות את התחקיר?', yes: 'כן', no: 'לא',
    debrief: 'תחקיר', score: 'ציון', survived: 'תוצאה', needed: 'מה היה צריך', charts: 'מהלך', rubric: 'רשימת בדיקה', again: 'שוב', home: 'בית',
    pupilsV: { normal: 'שווים ומגיבים', sluggish: 'מגיבים באיטיות', unequal: 'לא שווים' },
    lookNow: 'כעת', examNow: (s) => `GCS ${s.GCS}, אישונים ${s.pupilsTxt}. מילוי קפילרי ${s.CRT} שנ׳. ${s.kuss ? 'נשימת קוסמאול.' : 'נושם בשקט.'} ${s.headache ? 'מתלונן על כאב ראש.' : ''}`,
    speed: 'מהירות', perSec: x => `${x} דק׳/שנ׳`
  }
};
