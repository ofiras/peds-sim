/* Case: severe DKA at new onset, ED → PICU, about 12–16 hours of simulated time.
   Management follows the departmental PICU DKA protocol; background and rationale from
   Nelson Textbook of Pediatrics 22e, chapter 629 (fig. 629.5) and chapter 74 (maintenance fluids). */
window.CASE_DKA = {
  id: 'dka1',
  startClock: 22 * 60,                 // arrives at 22:00
  model: { wt: 32, wt0: 35, age: 10, deficitMl: 3000, glucose: 545, ketoacid: 19.5, naCorr: 137.1, kDeficit: 5, ceAt: 330, ceRiskBase: 0.5, temp: 37.0 },
  en: {
    title: 'New-onset diabetes in DKA',
    tag: 'ED → PICU · about 14 h · endocrine emergency',
    brief: 'A 10-year-old boy is brought by his parents at 22:00. Two weeks of thirst, passing a lot of urine and wetting the bed again; he has lost weight. Since yesterday he vomits and has belly pain, and this evening he has become sleepy. Last weight at school two months ago: 35 kg.',
    triage: 'Triage: drowsy but answers questions. Deep, fast breathing; fruity smell on his breath. Capillary glucose: "HI" (above the meter range). Urine dipstick: glucose 4+, ketones 3+.',
    history: 'No known illnesses or medications. No fever, cough or urinary symptoms. An aunt has type 1 diabetes. Last meal: a little bread at noon; he drinks a lot of water and juice.',
    exam: 'Drowsy, opens eyes to voice, oriented (GCS 14). Kussmaul breathing, acetone smell. Dry lips and mouth, sunken eyes, cool hands, capillary refill 3.5 s. Abdomen soft, mildly tender all over, no guarding. Pupils equal and reactive, no focal signs, no meningism.',
    weight: w => `Weighed: ${w} kg (35 kg two months ago).`
  },
  he: {
    title: 'סוכרת חדשה בחמצת (DKA)',
    tag: 'מיון ← טיפול נמרץ · כ-14 שעות · חירום אנדוקריני',
    brief: 'ילד בן 10 מובא על ידי הוריו בשעה 22:00. שבועיים של צמא, השתנה מרובה והרטבה חוזרת בלילה; ירד במשקל. מאתמול מקיא וכואבת לו הבטן, והערב נעשה ישנוני. משקל אחרון בבית הספר לפני חודשיים: 35 ק״ג.',
    triage: 'בטריאז׳: ישנוני אך עונה לשאלות. נשימה עמוקה ומהירה, ריח פירותי מהפה. סוכר קפילרי: "HI" (מעל טווח המכשיר). מקלון שתן: גלוקוז 4+, קטונים 3+.',
    history: 'ללא מחלות או תרופות ידועות. ללא חום, שיעול או תלונות בשתן. לדודה סוכרת סוג 1. ארוחה אחרונה: מעט לחם בצהריים; שותה הרבה מים ומיץ.',
    exam: 'ישנוני, פוקח עיניים לקול, מתמצא (GCS 14). נשימת קוסמאול, ריח אצטון. שפתיים ופה יבשים, עיניים שקועות, ידיים קרירות, מילוי קפילרי 3.5 שניות. בטן רכה, רגישות קלה מפושטת, ללא הגנה. אישונים שווים ומגיבים, ללא סימנים מוקדיים, ללא סימנים מנינגיאליים.',
    weight: w => `נשקל: ${w} ק״ג (35 ק״ג לפני חודשיים).`
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
