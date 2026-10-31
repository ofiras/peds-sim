# Lessons for new cases

What 16+ rounds of play-testing the DKA case taught, written so the next case starts from them.
Each line is a rule; most are already enforced by the shared code in `src/app.js`, `src/results.js` and `src/ui.js`.

## Time and pacing
- The clock never stops (user's rule), but it crawls (1 game min per 20 s) while any dialog is open, and a case opens at ¼ speed for its first 30 game minutes. New dialogs must open through `modal()` so this applies.
- Targets in the debrief ("within 30 min") must be reachable by a first-time player at the default speed.
- Every result has a realistic turnaround (`LAB_DELAY`); bedside tests are near-instant, central lab 30–60 min, send-outs next day.

## People and who answers
- One pair of hands: a physician procedure blocks other physician procedures; the nurse does one thing at a time; nothing at the bedside while the patient is away (CT).
- Nurse questions (missing result, duplicate test, unusual dose, timing) are questions, not penalties: cancelling after them is free and is not listed as a stopped order.
- Attending objections are for harm; "do it anyway" is allowed and listed in the debrief.
- Messages must state facts, not ask questions the learner cannot answer; at the guided level add the protocol line.
- Every nurse reminder is re-checked when it comes due (`cond`), so it never contradicts an order given a minute earlier.
- The attending's advice is built from what is still missing, never a fixed script; he does not promise to come unless something follows.
- The family (mother) is a source of early signs; her questions can be answered through "Talk with the parents".
- Basic nursing exists at every level: hourly vitals without a monitor, "nothing is running", "any orders?".

## Physiology
- Every intervention needs a time course: boluses run one after another at a line-limited rate; IV insulin boluses act under an hour; vent changes move pCO₂ over minutes; osmotherapy relieves pressure over about an hour.
- Bad care must not accidentally "work"; untreated disease progresses.
- Lethal paths need a warning phase (alarms, falling HR/BP, slowed time) before death.
- Exam text, neuro checks, GCS and what the family reports must come from the same model state.
- Measured values and alerts must agree with the monitor and ECG drawing at the same moment.

## Debrief
- A rule whose step never started is "not scored", never a tick.
- Late but done is partial credit with its time, never "not done".
- Time items from what the learner could see (first measured value), and say so; model times only as context.
- Every deduction has a "why" line with times; every missed item opens "what the protocol says" (paraphrased, no names).
- The same window/threshold must be used in the live attending check and in the debrief.
- Mark department rules that differ from ISPAD/Nelson as department rules; follow the department.

## Screens and text
- Hebrew mixed with numbers/units/ranges: wrap the run in isolates (`⁦…⁩` for LTR, `⁨…⁩` for first-strong); pH with two decimals.
- Hospital screen copies (ED order dialog, PICU order screen, EMR lab table, analyzer slip) are part of the realism: new drugs go into `MED`, `PVN` and `RSI`, new tests into `CUM` in results.js.
- No patient identifiers from photos; placeholders only.
- Toasts never cover dialogs or the top bar; viewers never open by themselves over the learner's work.
- Check every new screen in English and at 375 px.
- The diagnosis appears only in the debrief. Before that, the home card, briefing and top bar use the case's `cc` (age + presenting complaint), and the tag and badge texts avoid naming it.
- No order sets named after the diagnosis (e.g. a "DKA order set"): they give the answer away. The resident orders each lab and its frequency.
- A screen copied from a real system shows only what that system shows: the medication dialog's Current Orders lists medications and fluids, not labs.
- Order forms start empty at every level: no pre-filled dose, rate, duration, drug choice or ventilator setting, and no dose ranges in the menus. At the guided level a hint appears only once the entered value is outside the usual range (`doseHint`/`fluidHint` in app.js); the arithmetic line (= total mL, per kg) is fine.

## Testing
- `tests/calibrate.js` replays model courses; keep a scripted correct-care run at 100% after every change.
- QA rounds use the fixed 22-criterion scorecard (the mean is the score), not a single impression.
