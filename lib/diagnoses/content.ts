import type { Diagnosis } from "./types";

// ===========================================================================
// DIAGNOSTIC CONTENT
// ---------------------------------------------------------------------------
// Grounded in the Proline Brain vault (KB - Troubleshooting & Care, the
// Guides on ducting/make-up air/mounting height, Reference - Compatibility &
// Parts Matrix) and in patterns mined from real support threads (2026-07).
// Keys match flow branch keys (see lib/flow/rangeHoodFlow.ts). The resolver in
// ./resolve.ts maps a completed run to one or more of these entries and
// re-ranks likelihood from specific answers.
//
// House rules for this file:
// - Steps must be safe, DIY-appropriate, and start with power-off where relevant.
// - No prices and no phone numbers (both drift). Escalation copy must read
//   correctly in BOTH places it now appears: the agent console, and the
//   Stopgap ticket a customer's own submission created. So it says "this needs
//   Proline support" rather than "create a support case below" — the customer
//   never sees it, and the agent reading it is already inside the case.
// - Don't state model-specific specs — the AI path handles per-model detail.
// ===========================================================================

const ESCALATE_CASE =
  "this needs Proline support — the full questionnaire and any photos travel with the case, so the exact part or next step can be matched without re-asking.";

const ESCALATE_CASE_CAP =
  "This needs Proline support — the full questionnaire and any photos travel with the case, so the exact part or next step can be matched without re-asking.";

export const DIAGNOSIS_CONTENT: Record<string, Diagnosis[]> = {
  hood_performance: [
    {
      id: "hp_capture",
      title: "Capture shortfall — filters, height, or coverage",
      likelihood: "most_likely",
      summary:
        "The hood runs but doesn't capture smoke or steam well. The usual culprits, in order: grease-loaded filters, a hood mounted too high, or a hood that doesn't fully cover the cooking surface.",
      steps: [
        "Clean the baffle filters — they're dishwasher-safe, and grease-clogged filters are the single most common cause of weak suction. Clean every 2–4 weeks with heavy cooking.",
        "Measure from the cooking surface to the bottom of the hood: 28–36 inches indoors, 36–42 inches outdoors. Mounted higher than that, smoke drifts away before the hood can capture it.",
        "Check coverage: the hood should be centered over the cooking surface and at least as wide as it — ideally extending past it on both sides, especially for islands and outdoor grills.",
        "Sanity-check power vs. appliance: a gas range needs roughly 100 CFM per 10,000 BTU; electric needs about 10 CFM per inch of width. A high-output range under a modest hood will always overwhelm it.",
        "Use the blower correctly for a test: turn it on a few minutes before cooking, run high heat on the high setting, and leave it running 5–10 minutes after.",
      ],
      partsTools: ["Tape measure", "Degreasing dish soap (or dishwasher)"],
      escalation: `If filters are clean and the height/coverage check out but capture is still poor, ${ESCALATE_CASE}`,
    },
    {
      id: "hp_duct",
      title: "Duct restriction is choking the airflow",
      likelihood: "possible",
      summary:
        "The blower can only move what the duct lets through. Undersized duct, reductions, long runs, tight elbows, or a stuck termination damper all strangle airflow before it leaves the house.",
      steps: [
        "Confirm the duct is the same diameter as the hood's collar the whole way — never reduced. Any reduction (even one short section) chokes the entire run.",
        "Count the elbows: no more than two 90° elbows, with at least 18 inches of straight duct before the first one and 18 inches between them. Each elbow costs roughly 5 feet of effective run and ~5% of airflow.",
        "Estimate total run: keep it under about 30 feet after subtracting 5 feet per elbow. Rigid smooth-wall duct always beats flex.",
        "Inspect the roof/wall cap: the damper flap must swing freely and the screen must not be greased over. With the hood on high, you should feel air exiting the cap.",
        "Check for two dampers fighting each other — many blowers ship with a damper at the hood outlet, and the cap has its own. Both must open freely; crushed flex duct behind the hood is another frequent find.",
      ],
      partsTools: [
        "Correctly sized rigid duct and smooth elbows",
        "Ladder (to inspect the termination cap)",
      ],
      escalation: `If the duct layout is within spec and air still barely exits the cap, ${ESCALATE_CASE} Include the duct-run and cap photos from the checklist.`,
    },
    {
      id: "hp_mua",
      title: "Negative pressure — the house needs make-up air",
      likelihood: "less_likely",
      summary:
        "In a tight, modern home a powerful hood can't pull air out faster than the house lets air in. The hood gets loud and weak at once, and in the worst case can backdraft fuel-burning appliances.",
      steps: [
        "Do the window test: run the hood on high, then open a window or door near the kitchen. If suction audibly or visibly improves, the hood is starved for make-up air.",
        "Turn off competing exhausts (dryer, bathroom fans, whole-house fan) and retest — they all compete for the same limited incoming air.",
        "If the window test confirms it: code (IRC M1503.6) requires an automatic make-up air system for hoods rated 400 CFM and up — a cracked window is a diagnostic, not a fix.",
      ],
      escalation:
        "Make-up air system design and installation is HVAC-professional territory. If the window test was positive, Proline support can confirm the finding — and a local HVAC contractor should be consulted about a make-up air kit (tempered, in cold climates).",
    },
  ],

  blower: [
    {
      id: "blower_motor",
      title: "Blower motor or capacitor fault",
      likelihood: "most_likely",
      summary:
        "A blower that won't start, only hums, or cuts in and out usually means the motor or its start capacitor — especially if the lights and controls otherwise work.",
      steps: [
        "Cut power at the breaker for 60 seconds, restore it, and retest — this clears occasional control glitches and is always the first step.",
        "Confirm the rest of the hood works (lights, panel). If the whole hood is dead, follow the Electrical path instead — the problem is upstream of the blower.",
        "Listen at startup: a hum with no spin points to a seized motor or failed capacitor. Don't keep trying it — a stalled motor overheats.",
        "On dual-blower hoods, note which side is affected; the motors are side-specific (left and right are different parts).",
        "With power off, photograph the wiring-diagram label on the side of the blower and the Molex connector with all wire colors visible — that's exactly what support uses to match the correct replacement.",
      ],
      partsTools: [
        "Replacement blower motor or capacitor (matched by support from your photos)",
      ],
      escalation: `A motor or capacitor swap is connector-level work with step-by-step guides available. To get the right part first time, ${ESCALATE_CASE} Attach the blower-label photo and a video of the sound. In the first year, parts and labor are covered under warranty (labor by pre-approved reimbursement).`,
    },
    {
      id: "blower_control",
      title: "Speed control — board or panel, not the motor",
      likelihood: "possible",
      summary:
        "When some speeds work and others don't, the motor is usually fine — the control board (or the touch panel driving it) is dropping specific speed relays.",
      steps: [
        "Write down exactly which speeds fail — 'low speeds dead, high works' is a classic board-relay pattern and useful to support.",
        "Cut power at the breaker for 60 seconds and retest all speeds.",
        "If the touch panel is also unresponsive or erratic, treat this as a Touch Panel issue — panel and board work as a pair.",
        "With power off, remove the baffle filters and photograph the connector between the touch panel and the control board, counting the pins (3 or 5). Older hoods used a 10-pin board that's been superseded — those are replaced as a board + panel pair.",
      ],
      partsTools: [
        "Control board (plus matching touch panel on older 10-pin hoods)",
      ],
      escalation: `Board-level replacements ship bench-tested with install guides. ${ESCALATE_CASE_CAP} Include the pin-count photo.`,
    },
  ],

  touch_panel: [
    {
      id: "touch_board",
      title: "Touch panel or control board fault",
      likelihood: "most_likely",
      summary:
        "Unresponsive buttons, a dark display, random beeping, or the hood acting on its own point to the touch panel membrane or the control board it talks to.",
      steps: [
        "Cut power at the breaker for 60 seconds and retest — a surprising number of panel glitches clear with a hard power cycle.",
        "Wipe the panel completely dry. Steam and grease film on the glass can register as ghost touches.",
        "Know where the parts live: the touch panel sits at the front of the hood behind the baffle filters (two screws plus a wire harness); the control board is inside a black housing box near the blower.",
        "With power off, photograph the panel-to-board connector and count the pins — 3 or 5. This single photo is how support identifies the correct replacement panel; the model number alone is often not enough.",
        "If the display never lights and buttons do nothing at all, the board side is more suspect than the panel — mention that in your case notes.",
      ],
      partsTools: [
        "Replacement touch panel (matched by pin count)",
        "Control board on older 10-pin hoods — replaced together with the panel",
      ],
      escalation: `Replacement panels and boards ship bench-tested together with photo guides — the connectors are keyed, so reassembly is hard to get wrong. ${ESCALATE_CASE_CAP}`,
    },
    {
      id: "touch_harness",
      title: "Loose harness connection",
      likelihood: "possible",
      summary:
        "If the panel works intermittently — especially after a cleaning, an install, or filter changes — the harness connector between the panel and the board may simply be unseated.",
      steps: [
        "Cut power at the breaker.",
        "Remove the baffle filters and locate the wire harness behind the panel.",
        "Unplug and firmly reseat each visible connector — they're keyed and only fit one way. Photograph them first so you can confirm everything went back where it was.",
        "Restore power and retest all functions.",
      ],
      escalation: `If a reseated connector won't stay put or the intermittence returns, ${ESCALATE_CASE}`,
    },
  ],

  light: [
    {
      id: "light_bulb",
      title: "Bulb replacement (and picking the right type)",
      likelihood: "most_likely",
      summary:
        "A single light out is almost always the bulb itself. The catch on range hoods is bulb type — current hoods mostly use GU10 LEDs, older ones use 6-diode LED pucks, and hoods with a dimmable low setting need halogens.",
      steps: [
        "With the power off, photograph the face of the affected light — this identifies the style (GU10 twist-lock, 6-diode puck, or halogen) before you buy anything.",
        "Replace like-for-like and make sure the new bulb seats fully — GU10s lock with a quarter turn.",
        "If your hood has a dimmable 'low' light function: use halogen bulbs. Standard GU10 LEDs are the known cause of a low/dim setting that stops working.",
        "If a brand-new bulb still doesn't light, the socket or the light driver is suspect — see the driver diagnosis.",
      ],
      partsTools: [
        "Correct replacement bulb (GU10 LED, 6-diode LED puck, or halogen — identified from your photo)",
      ],
      escalation: `If a fresh, correctly seated bulb doesn't light, ${ESCALATE_CASE} Attach the bulb-face photo.`,
    },
    {
      id: "light_driver",
      title: "Light driver failure",
      likelihood: "possible",
      summary:
        "When all the lights fail at once — or they flickered and dimmed before dying — the bulbs aren't the problem. The light driver (the small transformer feeding them) has failed.",
      steps: [
        "Confirm the blower still runs normally — that isolates the problem to the lighting circuit.",
        "Cut power at the breaker for 60 seconds and retest, to rule out a one-off glitch.",
        "Think back: if the lights flickered or dimmed before failing, plan to replace the driver and the bulbs together — a failing driver damages bulbs, and reusing them kills the fix.",
        "Don't keep swapping bulbs into a dead circuit; two good bulbs that both stay dark confirm the driver.",
      ],
      partsTools: [
        "Replacement light driver",
        "Fresh bulbs (if flickering preceded the failure)",
      ],
      escalation: `Driver replacement is plug-level work behind the filters. ${ESCALATE_CASE_CAP} Include a photo of a light's face and one of the driver if you can see it.`,
    },
    {
      id: "light_control",
      title: "Lights won't turn off — control fault, not lights",
      likelihood: "less_likely",
      summary:
        "Lights that won't switch off, or that come on by themselves, are a control problem (panel/switch/board) — the lighting hardware itself is doing what it's told.",
      steps: [
        "Cut power at the breaker for 60 seconds; on restore, test the light button several times.",
        "Wipe the touch panel dry — condensation can hold a touch zone 'pressed'.",
        "If the behavior continues, treat it as a Touch Panel issue: with power off, photograph the panel-to-board connector (count the pins, 3 or 5).",
      ],
      escalation: `Persistent stuck-on lights mean a panel or board swap. ${ESCALATE_CASE_CAP}`,
    },
  ],

  electrical: [
    {
      id: "elec_supply",
      title: "Power supply or connection fault",
      likelihood: "most_likely",
      summary:
        "A completely dead hood is usually upstream of the hood itself: a tripped breaker, a dead outlet or GFCI, or a loose hardwire connection.",
      steps: [
        "Check the breaker — flip it fully OFF, then back ON (a tripped breaker can look 'on' while sitting in the middle).",
        "If the hood plugs in: test the outlet with a lamp or phone charger, and check for a tripped GFCI on the same circuit (kitchen circuits often share one).",
        "If the hood is hardwired: do not open the junction box yourself unless you're qualified — connection checks inside the box are electrician work.",
        "If power is confirmed at the hood but it's still dead, the fault is internal (board or harness) — note that in your support case.",
      ],
      partsTools: ["Lamp or plug-in tester", "Flashlight"],
      escalation:
        "If you smell burning, see sparks or scorching, or the breaker trips repeatedly: stop, cut power at the breaker, and leave it off — this needs Proline support immediately. In the first year, electrician labor can be covered through pre-approved reimbursement, so support must approve before a visit is booked.",
    },
    {
      id: "elec_internal",
      title: "Internal board or harness fault (power confirmed)",
      likelihood: "possible",
      summary:
        "If the outlet/breaker side checks out but the hood stays dead, the control board or an internal harness connection has failed.",
      steps: [
        "Cut power at the breaker for 60 seconds and retest once more.",
        "With power off, remove the baffle filters and check the visible harness connectors are fully seated (they're keyed — photograph before unplugging anything).",
        "Photograph the panel-to-board connector (count the pins, 3 or 5) and the black board housing near the blower — support matches internal parts from these photos.",
      ],
      partsTools: ["Replacement board/panel/harness set (bench-tested before shipping)"],
      escalation: `Internal electrical parts ship as tested sets with install guides. ${ESCALATE_CASE_CAP}`,
    },
  ],

  vibration: [
    {
      id: "vib_filters",
      title: "Loose filters or panels rattling",
      likelihood: "most_likely",
      summary:
        "Rattles and buzzes usually aren't the motor at all — baffle filters that aren't locked in, a loose grease tray, or a panel screw that backed out are the common causes.",
      steps: [
        "Remove each baffle filter and reseat it until it locks firmly — the quickest confirmation is the filter test: if the noise changes when the filters are out, you've found it.",
        "Check the grease tray/rails and any removable panels are fully seated.",
        "Snug the visible screws on the hood body and chimney sleeve — shipping vibration can back them off, especially on a new install.",
        "Run each speed and note when the noise appears; a rattle only at high speed still points at something loose resonating.",
      ],
      partsTools: ["Screwdriver"],
      escalation: `If nothing is loose and the rattle persists, ${ESCALATE_CASE} Attach the video with sound.`,
    },
    {
      id: "vib_duct",
      title: "Duct turbulence, whistling, or damper flutter",
      likelihood: "possible",
      summary:
        "Whistling or wind-rush noise is air fighting the duct: an undersized or crushed run, an elbow too close to the hood, or a damper flap fluttering in the airstream.",
      steps: [
        "Check for at least 18 inches of straight duct before the first elbow — an elbow right at the hood outlet creates turbulence noise. Keep it to two elbows maximum, 18 inches apart; each one adds roughly 2 sones.",
        "Look for crushed or undersized flex duct behind the hood; rigid smooth-wall duct is dramatically quieter.",
        "Inspect both dampers (one at the blower outlet, one at the roof/wall cap): each flap must swing freely — a sticking or double-fighting damper flutters loudly, and outdoors it can slam in the wind.",
        "Confirm air exits the termination cap cleanly on high; a greased-over screen whistles.",
      ],
      partsTools: ["Correctly sized rigid duct/elbows (if flex or a reduction is found)"],
      escalation: `If the duct checks out but the whistle remains, ${ESCALATE_CASE} Include duct and cap photos.`,
    },
    {
      id: "vib_motor",
      title: "Blower wheel or motor bearing noise",
      likelihood: "possible",
      summary:
        "Grinding or scraping is mechanical: either something is contacting the blower wheel (debris, shipping foam, a shifted housing) or a motor bearing is failing.",
      steps: [
        "Cut power at the breaker before touching anything.",
        "Remove the baffle filters and inspect the blower wheel for debris or leftover shipping padding — this is common on new installs.",
        "Spin the wheel gently by hand: it should turn freely without wobble or scraping.",
        "If grinding happens under power with a clean, free wheel, stop running the hood — that's a bearing on its way out, and running it accelerates the damage.",
        "Record a short video with sound, and on dual-blower hoods note which side it's coming from (motors are side-specific).",
      ],
      partsTools: ["Replacement blower motor (side-specific on dual-blower hoods)"],
      escalation: `Bearing noise means a motor swap — connector-level work with a guide. ${ESCALATE_CASE_CAP} Attach the sound video and the blower-label photo.`,
    },
  ],

  other: [
    {
      id: "other_review",
      title: "Needs a specialist's eyes",
      likelihood: "possible",
      summary:
        "This one doesn't fit a standard pattern, so the fastest path is getting the right details in front of a Proline specialist in one shot.",
      steps: [
        "Locate the model and serial number: check the data plate behind the baffle filters or on the blower housing, and photograph it.",
        "Find your order number or approximate purchase date — warranty coverage runs from the purchase date.",
        "Photograph or film the issue itself, plus one wider shot showing the whole hood and installation.",
      ],
      escalation:
        "This needs Proline support, with those photos attached — the full questionnaire travels with the case.",
    },
  ],

  _fallback: [
    {
      id: "fallback",
      title: "A closer look is needed",
      likelihood: "possible",
      summary:
        "Your answers don't point clearly at a single cause, and guessing wastes your time. A Proline specialist can pinpoint it from the details you've already provided.",
      steps: [
        "Photograph the data plate (model and serial) — it's behind the baffle filters or on the blower housing.",
        "Add a photo or short video of the issue if you haven't already.",
        "This needs Proline support — the full questionnaire goes with the case.",
      ],
      escalation:
        "If anything smells like burning, sparks, or trips the breaker, cut power at the breaker and leave the hood off until support responds.",
    },
  ],
};
