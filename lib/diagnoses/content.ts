import type { Diagnosis } from "./types";

// ===========================================================================
// PLACEHOLDER DIAGNOSTIC CONTENT
// ---------------------------------------------------------------------------
// Every string below is scaffolding so the structure is in place. Replace the
// summaries, steps, parts/tools, and escalation copy with real Proline content.
// Keys match flow branch keys (see lib/flow/rangeHoodFlow.ts). The resolver in
// ./resolve.ts maps a completed run to one or more of these entries.
// ===========================================================================

const PLACEHOLDER_STEPS = [
  "PLACEHOLDER — Step 1: first thing to check or try.",
  "PLACEHOLDER — Step 2: next action.",
  "PLACEHOLDER — Step 3: how to confirm it's resolved.",
];

const PLACEHOLDER_ESCALATION =
  "PLACEHOLDER — When to stop and contact Proline support (e.g. safety concern, part needed, still unresolved).";

export const DIAGNOSIS_CONTENT: Record<string, Diagnosis[]> = {
  hood_performance: [
    {
      id: "hp_capture",
      title: "Capture & airflow shortfall",
      likelihood: "most_likely",
      summary:
        "PLACEHOLDER — The hood isn't capturing smoke or moving air as expected. Most often this traces back to sizing, mounting height, or make-up air.",
      steps: PLACEHOLDER_STEPS,
      partsTools: ["PLACEHOLDER — e.g. tape measure, replacement filter"],
      escalation: PLACEHOLDER_ESCALATION,
      placeholder: true,
    },
    {
      id: "hp_duct",
      title: "Excessive duct restriction",
      likelihood: "possible",
      summary:
        "PLACEHOLDER — A long duct run, undersized duct, reductions, or too many elbows are choking airflow before it reaches the cap.",
      steps: PLACEHOLDER_STEPS,
      partsTools: ["PLACEHOLDER — e.g. correctly sized duct, smooth elbows"],
      escalation: PLACEHOLDER_ESCALATION,
      placeholder: true,
    },
  ],

  blower: [
    {
      id: "blower_motor",
      title: "Blower motor or wiring fault",
      likelihood: "most_likely",
      summary:
        "PLACEHOLDER — The blower won't run, or runs intermittently, pointing to the motor, its connector, or wiring.",
      steps: PLACEHOLDER_STEPS,
      partsTools: ["PLACEHOLDER — e.g. replacement blower motor"],
      escalation: PLACEHOLDER_ESCALATION,
      placeholder: true,
    },
    {
      id: "blower_control",
      title: "Speed control / capacitor issue",
      likelihood: "possible",
      summary:
        "PLACEHOLDER — Some speeds work and others don't, which often indicates the speed control or a capacitor.",
      steps: PLACEHOLDER_STEPS,
      escalation: PLACEHOLDER_ESCALATION,
      placeholder: true,
    },
  ],

  touch_panel: [
    {
      id: "touch_board",
      title: "Control board or touch membrane fault",
      likelihood: "most_likely",
      summary:
        "PLACEHOLDER — Unresponsive buttons, a blank display, or phantom inputs usually point to the control board or membrane.",
      steps: PLACEHOLDER_STEPS,
      partsTools: ["PLACEHOLDER — e.g. replacement control board"],
      escalation: PLACEHOLDER_ESCALATION,
      placeholder: true,
    },
  ],

  light: [
    {
      id: "light_bulb",
      title: "Bulb or light circuit",
      likelihood: "most_likely",
      summary:
        "PLACEHOLDER — One or more lights out, flickering, or stuck on — start with the bulbs, then the light wiring/driver.",
      steps: PLACEHOLDER_STEPS,
      partsTools: ["PLACEHOLDER — e.g. correct replacement bulb"],
      escalation: PLACEHOLDER_ESCALATION,
      placeholder: true,
    },
  ],

  electrical: [
    {
      id: "elec_supply",
      title: "Power supply or connection fault",
      likelihood: "most_likely",
      summary:
        "PLACEHOLDER — No power, intermittent power, or a tripping breaker points to the supply, connection, or a short.",
      steps: PLACEHOLDER_STEPS,
      partsTools: ["PLACEHOLDER — e.g. multimeter"],
      escalation:
        "PLACEHOLDER — If there is a burning smell, sparks, or scorching, stop using the hood immediately and contact Proline / a licensed electrician.",
      placeholder: true,
    },
  ],

  vibration: [
    {
      id: "vib_mount",
      title: "Mounting or fan-balance noise",
      likelihood: "most_likely",
      summary:
        "PLACEHOLDER — Rattles, grinding, or buzzing usually trace to mounting hardware, filters, or fan balance.",
      steps: PLACEHOLDER_STEPS,
      partsTools: ["PLACEHOLDER — e.g. screwdriver, anti-vibration pads"],
      escalation: PLACEHOLDER_ESCALATION,
      placeholder: true,
    },
  ],

  other: [
    {
      id: "other_review",
      title: "Needs a closer look",
      likelihood: "possible",
      summary:
        "PLACEHOLDER — This issue doesn't fit a standard category. A Proline specialist will review the details you provided.",
      steps: PLACEHOLDER_STEPS,
      escalation: PLACEHOLDER_ESCALATION,
      placeholder: true,
    },
  ],

  _fallback: [
    {
      id: "fallback",
      title: "A closer look is needed",
      likelihood: "possible",
      summary:
        "PLACEHOLDER — We couldn't narrow this down automatically. Share your answers with Proline support for a hands-on diagnosis.",
      steps: PLACEHOLDER_STEPS,
      escalation: PLACEHOLDER_ESCALATION,
      placeholder: true,
    },
  ],
};
