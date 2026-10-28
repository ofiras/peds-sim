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
      ward: 'pH below 7.1 is severe DKA: he goes to the PICU, not the ward.',
      bolusFast: 'Not that much or that fast in DKA: rapid large boluses raise the risk of cerebral edema. 10 mL/kg over an hour, unless he is in shock.',
      ctNoSigns: 'He has no neurological signs. A CT is not needed now, and it means radiation and leaving the unit with an unstable patient.',
      insBolus: 'No insulin bolus in DKA: start the drip at 0.05 units/kg/h after the first hour of fluids.',
      bicarb: 'No bicarbonate in DKA: it worsens hypokalemia and raises the risk of cerebral edema. The acidosis corrects with fluids and insulin.',
      intub: 'Do not intubate him for the acidosis: his deep breathing is compensating, and after intubation the pH falls further unless you match that ventilation. Intubate only for airway protection.'
    },
    consult: {
      endo: { min: 30, text: 'Pediatric endocrinology: new-onset type 1 diabetes in DKA. Continue the DKA protocol; we will see him in the morning to start subcutaneous insulin and teaching. Please send the diabetes work-up (antibodies, insulin/C-peptide, HbA1c, thyroid function, celiac serology) before insulin is long running.', textSent: 'Pediatric endocrinology: new-onset type 1 diabetes in DKA. Continue the DKA protocol; we will see him in the morning to start subcutaneous insulin and teaching. Good that the diabetes work-up is already sent.' },
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
      ward: 'pH מתחת ל-7.1 זה DKA קשה: הוא עובר לטיפול נמרץ, לא למחלקה.',
      bolusFast: 'לא כל כך הרבה ולא כל כך מהר ב-DKA: בולוסים גדולים ומהירים מעלים סיכון לבצקת מוחית. 10 מ״ל/ק״ג במשך שעה, אלא אם הוא בשוק.',
      ctNoSigns: 'אין לו סימנים נוירולוגיים. CT לא נדרש כעת, ומשמעותו קרינה ויציאה מהיחידה עם חולה לא יציב.',
      insBolus: 'אין בולוס אינסולין ב-DKA: מתחילים עירוי 0.05 יח׳/ק״ג/שע׳ אחרי השעה הראשונה של הנוזלים.',
      bicarb: 'אין ביקרבונט ב-DKA: מחמיר היפוקלמיה ומעלה סיכון לבצקת מוחית. החמצת מתוקנת עם נוזלים ואינסולין.',
      intub: 'אל תנשימו אותו בגלל החמצת: הנשימה העמוקה מפצה, ואחרי אינטובציה ה-pH יורד עוד אם לא מתאימים את ההנשמה. אינטובציה רק להגנה על נתיב האוויר.'
    },
    consult: {
      endo: { min: 30, text: 'אנדוקרינולוגיה ילדים: סוכרת סוג 1 חדשה בהצגת DKA. ממשיכים לפי פרוטוקול DKA; נראה אותו בבוקר להתחלת אינסולין תת-עורי והדרכה. לשלוח בירור סוכרת (נוגדנים, אינסולין/C-peptide, HbA1c, תפקודי תריס, סרולוגיה לצליאק) כמה שיותר מוקדם.', textSent: 'אנדוקרינולוגיה ילדים: סוכרת סוג 1 חדשה בהצגת DKA. ממשיכים לפי פרוטוקול DKA; נראה אותו בבוקר להתחלת אינסולין תת-עורי והדרכה. טוב שבירור הסוכרת כבר נשלח.' },
      surg: { min: 45, text: 'כירורגיית ילדים: בטן רכה עם רגישות מפושטת קלה, ללא סימני גירוי צפקי. הכאב מתאים ל-DKA; אין צורך בהדמיה כרגע. לבדוק שוב אם נמשך אחרי תיקון החמצת.' }
    }
  },
  /* sources shown in the debrief */
  src: {
    prot: { en: 'PICU DKA protocol', he: 'פרוטוקול DKA טיפול נמרץ ילדים' },
    nelson: { en: 'Nelson 22e, ch. 629', he: 'נלסון 22, פרק 629' },
    nelson74: { en: 'Nelson 22e, ch. 74', he: 'נלסון 22, פרק 74' },
    kprot: { en: 'IV potassium protocol', he: 'פרוטוקול מתן אשלגן IV' },
    bicarb: { en: 'Sodium bicarbonate protocol', he: 'פרוטוקול סודיום ביקרבונט' }
  }
};
