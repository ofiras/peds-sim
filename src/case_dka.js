/* Case: severe DKA at new onset, ED → PICU, about 12–16 hours of simulated time.
   Management follows the departmental PICU DKA protocol; background and rationale from
   Nelson Textbook of Pediatrics 22e, chapter 629 (fig. 629.5) and chapter 74 (maintenance fluids). */
window.CASE_DKA = {
  id: 'dka1',
  startClock: 22 * 60,                 // arrives at 22:00
  shiftEnd: 8 * 60,                    // the night shift ends at 08:00: hand over, or stay until he is off the drip
  model: { wt: 32, wt0: 35, age: 10, deficitMl: 3000, glucose: 545, ketoacid: 19.5, naCorr: 137.1, kDeficit: 5, ceAt: 330, ceRiskBase: 0.5, temp: 37.0 },
  en: {
    title: 'New-onset diabetes in DKA',
    tag: 'ED → PICU · about 14 h · endocrine emergency',
    brief: 'A 10-year-old boy is brought by his parents at 22:00. Two weeks of thirst, passing a lot of urine and wetting the bed again; he has lost weight. Since yesterday he vomits and has belly pain, and this evening he has become sleepy. Last weight at school two months ago: 35 kg.',
    triage: 'Triage: drowsy but answers questions. Deep, fast breathing; fruity smell on his breath. Capillary glucose: 542 mg/dL. Urine dipstick: glucose 4+, ketones 3+.',
    history: 'No known illnesses or medications. No fever, cough or urinary symptoms. An aunt has type 1 diabetes. Last meal: a little bread at noon; he drinks a lot of water and juice.',
    exam: 'Drowsy, opens eyes to voice, oriented (GCS 14). Kussmaul breathing, acetone smell. Dry lips and mouth, sunken eyes, cool hands, capillary refill 3.5 s. Abdomen soft, mildly tender all over, no guarding. Pupils equal and reactive, no focal signs, no meningism.',
    weight: w => `Weighed: ${w} kg (35 kg two months ago).`,
    /* the attending objects at once to these */
    warn: {
      lp: 'Why an LP? Nothing points to meningitis, and in DKA with a risk of cerebral edema a lumbar puncture can cause herniation. Do not do it.',
      cvc: 'A central line is not needed here: two good peripheral lines are enough, and DKA raises the risk of line-related thrombosis.',
      prbc: 'Hemoglobin is 15 and nothing is bleeding: there is no indication for blood.', ffp: 'No bleeding and no coagulopathy: there is no indication for plasma.', plt: 'Platelets are normal: there is no indication for a platelet transfusion.',
      ward: 'pH below 7.1 is severe DKA: he goes to the PICU, not the ward.', foley: 'He is awake and passing urine: a catheter adds infection risk. Measure his urine in a urinal instead.',
      bolusFast: 'Not that much or that fast in DKA: rapid large boluses raise the risk of cerebral edema. 10 mL/kg over an hour, unless he is in shock.',
      ctNoSigns: 'He has no neurological signs. A CT is not needed now, and it means radiation and leaving the unit with an unstable patient.',
      insBolus: 'No insulin bolus in DKA: start the drip at 0.05 units/kg/h after the first hour of fluids.',
      bicarb: 'No bicarbonate in DKA: it worsens hypokalemia and raises the risk of cerebral edema. The acidosis corrects with fluids and insulin.',
      intub: 'Do not intubate him for the acidosis: his deep breathing is compensating, and after intubation the pH falls further unless you match that ventilation. Intubate only for airway protection.'
    },
    consult: {
      endo: { min: 30, textExit: 'Pediatric endocrinology: good, he is out of DKA and on subcutaneous insulin. We will see him on the ward today, adjust the doses to his pre-meal glucose and start the family teaching.', textDay: 'Pediatric endocrinology: we are coming to see him now to plan subcutaneous insulin and start the family teaching. Continue the DKA protocol until he is out of DKA.', text: 'Pediatric endocrinology: new-onset type 1 diabetes in DKA. Continue the DKA protocol; we will see him in the morning to start subcutaneous insulin and teaching. Please send the diabetes work-up (antibodies, insulin/C-peptide, HbA1c, thyroid function, celiac serology) before insulin is long running.', textSent: 'Pediatric endocrinology: new-onset type 1 diabetes in DKA. Continue the DKA protocol; we will see him in the morning to start subcutaneous insulin and teaching. Good that the diabetes work-up is already sent.' },
      surg: { min: 45, text: 'Pediatric surgery: soft abdomen with mild diffuse tenderness, no peritoneal signs. The pain fits DKA; no imaging needed now. Re-examine if it persists after the acidosis is corrected.' }
    }
  },
  he: {
    title: 'סוכרת חדשה בחמצת (DKA)',
    tag: 'מיון ← טיפול נמרץ · כ-14 שעות · חירום אנדוקריני',
    brief: 'ילד בן 10 מובא על ידי הוריו בשעה 22:00. שבועיים של צמא, השתנה מרובה והרטבה חוזרת בלילה; ירד במשקל. מאתמול מקיא וכואבת לו הבטן, והערב נעשה ישנוני. משקל אחרון בבית הספר לפני חודשיים: 35 ק״ג.',
    triage: 'בטריאז׳: ישנוני אך עונה לשאלות. נשימה עמוקה ומהירה, ריח פירותי מהפה. סוכר קפילרי: 542 מ״ג/ד״ל. מקלון שתן: גלוקוז 4+, קטונים 3+.',
    history: 'ללא מחלות או תרופות ידועות. ללא חום, שיעול או תלונות בשתן. לדודה סוכרת סוג 1. ארוחה אחרונה: מעט לחם בצהריים; שותה הרבה מים ומיץ.',
    exam: 'ישנוני, פוקח עיניים לקול, מתמצא (GCS 14). נשימת קוסמאול, ריח אצטון. שפתיים ופה יבשים, עיניים שקועות, ידיים קרירות, מילוי קפילרי 3.5 שניות. בטן רכה, רגישות קלה מפושטת, ללא הגנה. אישונים שווים ומגיבים, ללא סימנים מוקדיים, ללא סימנים מנינגיאליים.',
    weight: w => `נשקל: ${w} ק״ג (35 ק״ג לפני חודשיים).`,
    warn: {
      lp: 'למה ניקור מותני? שום דבר לא מצביע על דלקת קרום המוח, וב-DKA עם סיכון לבצקת מוחית ניקור מותני עלול לגרום להרניאציה. לא לבצע.',
      cvc: 'אין צורך בצנתר מרכזי: שני עירויים פריפריים טובים מספיקים, ו-DKA מעלה את הסיכון לפקקת סביב צנתר.',
      prbc: 'ההמוגלובין 15 ואין דימום: אין התוויה למתן דם.', ffp: 'אין דימום ואין הפרעת קרישה: אין התוויה לפלזמה.', plt: 'הטסיות תקינות: אין התוויה למתן טסיות.',
      ward: 'pH מתחת ל-7.1 זה DKA קשה: הוא עובר לטיפול נמרץ, לא למחלקה.', foley: 'הוא ער ומשתין: קטטר רק מוסיף סיכון לזיהום. מודדים שתן בבקבוק שתן.',
      bolusFast: 'לא כל כך הרבה ולא כל כך מהר ב-DKA: בולוסים גדולים ומהירים מעלים סיכון לבצקת מוחית. 10 מ״ל/ק״ג במשך שעה, אלא אם הוא בשוק.',
      ctNoSigns: 'אין לו סימנים נוירולוגיים. CT לא נדרש כעת, ומשמעותו קרינה ויציאה מהיחידה עם חולה לא יציב.',
      insBolus: 'אין בולוס אינסולין ב-DKA: מתחילים עירוי 0.05 יח׳/ק״ג/שע׳ אחרי השעה הראשונה של הנוזלים.',
      bicarb: 'אין ביקרבונט ב-DKA: מחמיר היפוקלמיה ומעלה סיכון לבצקת מוחית. החמצת מתוקנת עם נוזלים ואינסולין.',
      intub: 'אל תנשימו אותו בגלל החמצת: הנשימה העמוקה מפצה, ואחרי אינטובציה ה-pH יורד עוד אם לא מתאימים את ההנשמה. אינטובציה רק להגנה על נתיב האוויר.'
    },
    consult: {
      endo: { min: 30, textExit: 'אנדוקרינולוגיה ילדים: יופי, הוא יצא מ-DKA ועל אינסולין תת-עורי. נראה אותו היום במחלקה, נתאים את המינונים לסוכר לפני הארוחות ונתחיל את ההדרכה למשפחה.', textDay: 'אנדוקרינולוגיה ילדים: אנחנו באים לראות אותו עכשיו לתכנון אינסולין תת-עורי ולהתחלת ההדרכה למשפחה. ממשיכים לפי פרוטוקול DKA עד היציאה מהחמצת.', text: 'אנדוקרינולוגיה ילדים: סוכרת סוג 1 חדשה בהצגת DKA. ממשיכים לפי פרוטוקול DKA; נראה אותו בבוקר להתחלת אינסולין תת-עורי והדרכה. לשלוח בירור סוכרת (נוגדנים, אינסולין/C-peptide, HbA1c, תפקודי תריס, סרולוגיה לצליאק) כמה שיותר מוקדם.', textSent: 'אנדוקרינולוגיה ילדים: סוכרת סוג 1 חדשה בהצגת DKA. ממשיכים לפי פרוטוקול DKA; נראה אותו בבוקר להתחלת אינסולין תת-עורי והדרכה. טוב שבירור הסוכרת כבר נשלח.' },
      surg: { min: 45, text: 'כירורגיית ילדים: בטן רכה עם רגישות מפושטת קלה, ללא סימני גירוי צפקי. הכאב מתאים ל-DKA; אין צורך בהדמיה כרגע. לבדוק שוב אם נמשך אחרי תיקון החמצת.' }
    }
  },
  /* sources shown in the debrief */
  /* what the protocol says, paraphrased, shown under a missed debrief item */
  notes: {
    weigh: { en: 'Weigh him on admission and find out his last known weight: fluids, insulin and potassium are all worked out per kg.', he: 'שקילה בקבלה ובירור המשקל האחרון: נוזלים, אינסולין ואשלגן מחושבים כולם לפי ק״ג.' },
    monitor: { en: 'Full monitoring from the start, including heart rhythm (potassium shifts show on the ECG), blood pressure and capillary refill.', he: 'ניטור מלא מההתחלה, כולל קצב לב (שינויי אשלגן נראים באק״ג), לחץ דם ומילוי קפילרי.' },
    labs0: { en: 'On arrival: capillary glucose at once, urine for glucose and ketones, and bloods for glucose, electrolytes (K, P, Ca), kidney function, gas, CBC and CRP. HbA1c and diabetes antibodies are sent before treatment.', he: 'בקבלה: סוכר קפילרי מיד, שתן לגלוקוז וקטונים, ודם לגלוקוז, אלקטרוליטים (K, P, Ca), תפקודי כליה, גזים, ספירה ו-CRP. HbA1c ונוגדנים לסוכרת נשלחים לפני הטיפול.' },
    bolus: { en: 'First hour: NaCl 0.9% 10 mL/kg over the hour for mild to moderate dehydration. 20 mL/kg only for severe dehydration with an unstable circulation, and with the attending.', he: 'שעה ראשונה: NaCl 0.9% 10 מ״ל/ק״ג במשך שעה בהתייבשות קלה-בינונית. 20 מ״ל/ק״ג רק בהתייבשות קשה עם חוסר יציבות המודינמית, ובאישור כונן.' },
    fluids: { en: 'From hour 2: the deficit is replaced evenly over 48 h on top of maintenance (4-2-1), about 1.5–2× maintenance in all. Not more than 2× maintenance unless he is in shock; raising it needs the attending.', he: 'משעה שנייה: החסר מוחזר באופן שווה במשך 48 שעות בנוסף לאחזקה (4-2-1), בסך הכול כ-1.5–2 מנות אחזקה. לא יותר מפעמיים אחזקה אלא אם בשוק; העלאה באישור כונן.' },
    insStart: { en: 'Regular insulin IV at 0.05 units/kg/h once the first hour of fluids is done (10 units in 100 mL NaCl 0.9%, so 0.5 mL/kg/h). 0.1 only with the attending. No insulin boluses, and not before potassium is above 3.3.', he: 'אינסולין רגולר IV ב-0.05 יח׳/ק״ג/שע׳ בסיום שעת הנוזלים הראשונה (10 יח׳ ב-100 מ״ל NaCl 0.9%, כלומר 0.5 מ״ל/ק״ג/שע׳). 0.1 רק באישור כונן. ללא בולוסים, ולא לפני שהאשלגן מעל 3.3.' },
    insMgmt: { en: 'Keep the drip until the acidosis is over (pH > 7.3, HCO₃ > 18). If glucose falls too fast despite D10, lower the insulin with the attending; below 120 stop it, check every 30 min and restart at 0.05 above 150. Do not stop it in the middle of the night or in a child who cannot eat.', he: 'להמשיך את העירוי עד תיקון החמצת (pH מעל 7.3, HCO₃ מעל 18). אם הסוכר יורד מהר מדי למרות D10, להוריד אינסולין בייעוץ כונן; מתחת ל-120 להפסיק, לבדוק כל חצי שעה ולחדש ב-0.05 מעל 150. לא להפסיק באמצע הלילה או בילד שלא יכול לאכול.' },
    potassium: { en: 'Aim for K 4–5. K 5.5 or more: wait for urine and for K below 5. 3.5–5.5: KCl 40 mEq/L. Below 3.5: 60 mEq/L, or 40 mEq/L plus oral potassium. Below 3.3: replace first, hold the insulin and tell the attending. ECG when potassium is abnormal.', he: 'יעד K 4–5. K 5.5 ומעלה: להמתין למתן שתן ולירידה מתחת ל-5. 3.5–5.5: KCl 40 מא״ק/ל׳. מתחת ל-3.5: 60 מא״ק/ל׳, או 40 עם תוספת פומית. מתחת ל-3.3: לתקן קודם, לעכב אינסולין וליידע כונן. אק״ג בהפרעות אשלגן.' },
    dextrose: { en: 'Glucose above 300: NaCl 0.9%. Below 300: NaCl 0.9% with D5. Below 180: D10. Target 150–250 mg/dL; check hourly and change the dextrose to match the level and how fast it falls.', he: 'סוכר מעל 300: NaCl 0.9%. מתחת ל-300: NaCl 0.9% עם D5. מתחת ל-180: D10. יעד 150–250; לבדוק כל שעה ולשנות את הגלוקוז לפי הרמה וקצב הירידה.' },
    hypo: { en: 'Glucose below 60: call the attending. Below 150: make sure he is on D10–12.5, lower the insulin (0.02–0.05) and check glucose every 30 min until it is above 180.', he: 'סוכר מתחת ל-60: ייעוץ כונן. מתחת ל-150: לוודא D10–12.5, להוריד אינסולין (0.02–0.05) ולבדוק כל חצי שעה עד מעל 180.' },
    gfall: { en: 'Glucose should fall by no more than 100 mg/dL per hour, and effective osmolality (2×Na + glucose/18) by no more than 2–3 per hour. Work it out for every sample.', he: 'הסוכר צריך לרדת לא יותר מ-100 לשעה, והאוסמולליות האפקטיבית (2×Na + סוכר/18) לא יותר מ-2–3 לשעה. לחשב בכל דגימה.' },
    monitoring: { en: 'Hourly glucose, neuro checks (GCS, pupils) and input/output; gases with the anion gap every 2–4 h; electrolytes, urea and creatinine every 2–4 h.', he: 'סוכר, אומדן נוירולוגי (GCS, אישונים) ומאזן נוזלים כל שעה; גזים ופער אניונים כל 2–4 שעות; אלקטרוליטים, אוריאה וקראטינין כל 2–4 שעות.' },
    nobicarb: { en: 'The acidosis is corrected by fluids and insulin. Bicarbonate is not part of the treatment and adds the risk of low potassium and cerebral edema.', he: 'החמצת מתוקנת על ידי נוזלים ואינסולין. ביקרבונט אינו חלק מהטיפול ומוסיף סיכון להיפוקלמיה ולבצקת מוחית.' },
    npo: { en: 'Nothing by mouth until the acidosis is over and he can drink without nausea.', he: 'צום עד שהחמצת חולפת והוא יכול לשתות בלי בחילה.' },
    picu: { en: 'Severe DKA (pH below 7.1 or HCO₃ below 5) is treated in the PICU.', he: 'DKA קשה (pH מתחת ל-7.1 או HCO₃ מתחת ל-5) מטופל בטיפול נמרץ.' },
    ce: { en: 'Warning signs: headache, vomiting again, drowsiness or restlessness, a heart rate falling by more than 20 without another reason, high diastolic pressure, pupil changes. Treat first, image later: check glucose, cut fluids by a third, mannitol 20% 0.5–1 g/kg over 20 min (may repeat after 30 min–2 h), NaCl 3% 5–10 mL/kg over 30–60 min if there is no response, head up 30° in the midline, insulin down to 0.025 (a department rule, not in ISPAD), and if intubated ventilate to the pCO₂ he had before. CT once he is stable.', he: 'סימני אזהרה: כאב ראש, הקאה מחדש, ישנוניות או אי שקט, ירידה בדופק ביותר מ-20 בלי סיבה אחרת, לחץ דיאסטולי גבוה, שינוי באישונים. לטפל קודם ולהדמות אחר כך: סוכר, הורדת נוזלים בשליש, מניטול 20% 0.5–1 גר׳/ק״ג במשך 20 דק׳ (אפשר לחזור אחרי חצי שעה עד שעתיים), NaCl 3% 5–10 מ״ל/ק״ג במשך 30–60 דק׳ אם אין תגובה, ראש 30° בקו האמצע, אינסולין ל-0.025 (כלל של המחלקה, לא ב-ISPAD), ואם מונשם להנשים לרמת ה-pCO₂ שהייתה לו קודם. CT אחרי ייצוב.' },
    exit: { en: 'Out of DKA: better clinically, drinking without nausea, pH above 7.3 and HCO₃ above 18. The first rapid SC insulin (0.1–0.2 units/kg) goes right before a meal with carbohydrates, then the drip is stopped. In the middle of the night the drip (0.02–0.05) and fluids can continue until morning. (ISPAD defines resolution as pH > 7.3 and HCO₃ > 15 with blood ketones < 1; this department uses 18.)', he: 'יציאה מ-DKA: שיפור קליני, שותה בלי בחילה, pH מעל 7.3 ו-HCO₃ מעל 18. מנת האינסולין המהיר הראשונה (0.1–0.2 יח׳/ק״ג) מיד לפני ארוחה עם פחמימות, ואז מפסיקים את העירוי. באמצע הלילה אפשר להמשיך עירוי (0.02–0.05) ונוזלים עד הבוקר. (לפי ISPAD: pH מעל 7.3 ו-HCO₃ מעל 15 עם קטונים מתחת ל-1; במחלקה משתמשים ב-18.)' },
    brain: { en: 'Cerebral edema is the main cause of death in DKA. Avoid what raises the risk (fast falls in glucose or osmolality, a falling corrected sodium, insulin boluses, bicarbonate, too much fluid) and treat the first signs at once.', he: 'בצקת מוחית היא סיבת המוות העיקרית ב-DKA. להימנע ממה שמעלה את הסיכון (ירידה מהירה בסוכר או באוסמולליות, נתרן מתוקן יורד, בולוסים של אינסולין, ביקרבונט, עודף נוזלים) ולטפל בסימנים הראשונים מיד.' },
    vent: { en: 'His deep, fast breathing is what holds his pH up. If he must be intubated, keep the apnea short, avoid induction drugs that drop the blood pressure, use a paralytic, and set the ventilator to the low pCO₂ he had before he deteriorated, which needs a high minute ventilation. Check a gas soon after and adjust.', he: 'הנשימה העמוקה והמהירה שלו היא מה ששומר על ה-pH. אם חייבים לאנטב: אפנאה קצרה, להימנע מתרופות אינדוקציה שמורידות לחץ דם, להשתמש במשתק, ולכוון את המנשם ל-pCO₂ הנמוך שהיה לו לפני ההידרדרות, מה שדורש נפח דקה גבוה. לבדוק גז זמן קצר אחרי ולתקן.' },
    hypoTx: { en: 'Glucose below 60: call the attending. Below 150: make sure he gets D10–12.5 and lower the insulin to 0.02–0.05; check glucose every 30 min until above 180. Symptomatic or very low glucose gets a D10 bolus (2–5 mL/kg) at once.', he: 'סוכר מתחת ל-60: ייעוץ כונן. מתחת ל-150: לוודא D10–12.5 ולהוריד אינסולין ל-0.02–0.05; סוכר כל חצי שעה עד מעל 180. סוכר נמוך מאוד או עם תסמינים: בולוס D10 (2–5 מ״ל/ק״ג) מיד.' },
    wardMove: { en: 'After the transition to SC insulin, with the acidosis over and the child eating, he continues on the pediatric ward with pre-meal glucose checks and diabetes teaching.', he: 'אחרי המעבר לאינסולין תת-עורי, כשהחמצת חלפה והילד אוכל, ממשיכים במחלקת ילדים עם סוכר לפני ארוחות והדרכת סוכרת.' },
    family: { en: 'Talk with the parents early: the diagnosis, the plan, and the warning signs they should report. Parents are often the first to notice a change.', he: 'לשוחח עם ההורים מוקדם: האבחנה, התוכנית, וסימני האזהרה שעליהם לדווח. ההורים הם לעיתים קרובות הראשונים לשים לב לשינוי.' }
  },
  src: {
    gen: { en: 'General practice', he: 'עקרונות כלליים' },
    prot: { en: 'PICU DKA protocol', he: 'פרוטוקול DKA טיפול נמרץ ילדים' },
    nelson: { en: 'Nelson 22e, ch. 629', he: 'נלסון 22, פרק 629' },
    nelson74: { en: 'Nelson 22e, ch. 74', he: 'נלסון 22, פרק 74' },
    kprot: { en: 'IV potassium protocol', he: 'פרוטוקול מתן אשלגן IV' },
    bicarb: { en: 'Sodium bicarbonate protocol', he: 'פרוטוקול סודיום ביקרבונט' }
  }
};
