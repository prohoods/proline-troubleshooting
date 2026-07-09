// ===========================================================================
// Proline field knowledge for the AI diagnosis prompt.
// ---------------------------------------------------------------------------
// Distilled from the Proline Brain vault (KB/Guides/Parts Matrix) and from
// patterns mined out of real support threads (2026-07). Facts only — the
// system prompt owns voice and safety rules. Keep this compact: it ships on
// every diagnosis call.
// ===========================================================================

export const FIELD_KNOWLEDGE = `PROLINE FIELD KNOWLEDGE (verified support experience — apply when relevant, never contradict the PRODUCT SPEC):

Geometry & sizing
- Mounting height: 28–36" above the cooking surface indoors, 36–42" outdoors. Higher = capture loss.
- The hood should be centered and at least as wide as the cooking surface, ideally overhanging both sides (critical for islands/outdoor grills).
- CFM rule of thumb: gas ≈ 100 CFM per 10,000 BTU; electric ≈ 10 CFM per inch of cooktop width.

Ducting
- Duct must match the hood collar diameter end-to-end; never reduce. Max two 90° elbows, ≥18" of straight duct before the first elbow and ≥18" between elbows; each elbow ≈ −5 ft effective run, −5% airflow, +2 sones. Keep effective run under ~30 ft. Rigid smooth-wall beats flex.
- Check the termination cap: damper flap must swing freely, screen not greased over; air should be felt exiting on high. Blower-outlet damper + cap damper can fight each other; some blowers ship with dampers pre-installed (removed for outdoor installs).

Make-up air
- Tight homes starve big hoods (loud + weak simultaneously; can backdraft combustion appliances). Diagnostic: open a window near the kitchen with the hood on high — improvement confirms it. IRC M1503.6 requires automatic make-up air at ≥400 CFM.

Filters & lights
- Baffle filters are dishwasher-safe; grease-clogged filters are the #1 cause of weak suction. Filters, bulbs, and cosmetic damage are not warranty items.
- All/multiple lights failing together = light driver, not bulbs. If lights flickered/dimmed before dying, replace driver AND bulbs together (a failing driver damages bulbs).
- Current hoods use GU10 LED bulbs; older PLJ-series used 6-diode LED pucks. Hoods with a dimmable "low" setting need halogen bulbs — standard GU10 LEDs break the dim function.

Controls & blower
- Touch panel lives at the front behind the baffle filters (2 screws + harness); the control board sits in a black housing box near the blower. Replacement panels are matched by the PIN COUNT (3 vs 5) of the panel-to-board connector — a photo of that connector identifies the part; model number alone is often insufficient.
- Legacy 10-pin control boards were superseded by 5-pin: older hoods get board + touch panel replaced together. Replacement electronics ship bench-tested; connectors are keyed.
- Blower hum with no spin = seized motor or failed capacitor (stop running it). Specific speeds dead with others fine = control board relays, not the motor. Dual-blower hoods use side-specific motors. Support matches blowers from a photo of the wiring-diagram label on the blower + its Molex connector with all wire colors visible.

Warranty & escalation
- Range hoods carry a 3-year limited warranty from the PURCHASE date: year 1 covers parts and labor (labor via pre-approved reimbursement — quote first, then approval, then paid invoice), years 2–3 replacement parts only.
- Installed hoods cannot be returned or exchanged — troubleshooting plus replacement parts is the path, and it works: most defects are fixed by a connector-level part swap with a guide.
- Safety stops: burning smell, sparks, scorching, or a repeatedly tripping breaker → cut power at the breaker, stop using the hood, contact support immediately.
- Never state prices or phone numbers; direct the customer to create a support case from this page (their answers and photos travel with it).`;
