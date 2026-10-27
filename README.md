# Peds ER & PICU Sim

Pediatric emergency and intensive-care simulations for residents, in Hebrew and English. You write the orders (fluids, insulin, electrolytes, labs, procedures, consults), the patient responds over hours of simulated time, and a debrief scores the management against the protocol.

**Open it:** https://ofiras.github.io/peds-sim/

## Pilot case
**New-onset diabetes in severe DKA** (10-year-old, ED → PICU, about 14 hours): fluid resuscitation and deficit replacement, insulin infusion, potassium and dextrose titration, flow sheet with corrected sodium, effective osmolality and anion gap, and a cerebral-edema complication that must be recognized and treated.

## How it works
- `src/model.js` – a small rule-based DKA physiology model (glucose, ketoacids, bicarbonate, pH, potassium, corrected sodium, effective osmolality, hydration and perfusion, cerebral edema), calibrated to Nelson Textbook of Pediatrics 22e, ch. 629 and 74. `node tests/calibrate.js [ideal|nok|nodex|noce|fast]` replays courses.
- `src/case_dka.js` – case text; `src/app.js` – order catalog (the whole ED toolbox), time loop, flow sheet, scoring rubric and debrief; `src/monitor.js` – bedside monitor (T and U waves follow potassium).

For training only, not for clinical decisions.
