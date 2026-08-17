import {
  CONTACT_QUESTION_ID,
  NO_ORDER_VALUE,
  SAFETY_EMERGENCY_VALUE,
  SAFETY_GATE_ID,
} from "./constants";
import type { CategoryFlow, Option, Question } from "./types";

// ---------------------------------------------------------------------------
// Ranges & Cooktops flow — transcribed from docs/ranges-flow-draft.md.
//
// Provenance matters here. The product architecture (PLSR GE/GG, PLST, oven
// fuel, voltages) comes from the vault's `Reference - Ranges & Cooktops Specs`
// and is solid. The FAILURE MODES and branch ordering are inference: the vault
// states plainly that "range-specific troubleshooting (ignition, oven,
// convection) is not yet documented", and nothing contradicted it. Treat the
// question set as a first pass to be corrected by whoever answers range calls.
//
// The customer sees no diagnosis, so nothing here becomes repair advice — the
// questions only shape what the agent receives.
// ---------------------------------------------------------------------------

const o = (...labels: string[]): Option[] =>
  labels.map((label) => ({ value: slug(label), label }));

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "opt"
  );
}

const describe = (id: string, prompt = "Please describe the issue."): Question => ({
  id,
  prompt,
  type: "text",
  optional: true,
  placeholder: "Tell us what's happening, in your own words…",
});

const uploadMedia = (id: string, prompt: string): Question => ({
  id,
  prompt,
  type: "upload",
  optional: true,
});

export const rangesFlow: CategoryFlow = {
  productInfo: [
    // The gate comes first, before anything else — including the order lookup.
    // Someone who can smell gas should not be answering questions about their
    // order number.
    {
      id: SAFETY_GATE_ID,
      prompt: "Before we start — is any of this happening right now?",
      helpText:
        "We ask first because these need a faster response than a support ticket. If none apply, this takes about two minutes.",
      type: "single",
      options: [
        {
          value: SAFETY_EMERGENCY_VALUE,
          label:
            "Yes — I smell gas, hear hissing, or see scorching, melting, or smoke that isn't from cooking",
        },
        { value: "none", label: "No, none of these" },
      ],
    },
    {
      id: "r_order_lookup",
      prompt: "What is your order number, or the email you ordered with?",
      type: "lookup",
      placeholder: "Order number (e.g. 1024) or email",
      visibleWhen: { questionId: SAFETY_GATE_ID, equals: ["none"] },
    },
    {
      id: CONTACT_QUESTION_ID,
      prompt: "How can we reach you?",
      type: "contact",
      visibleWhen: { questionId: "r_order_lookup", equals: [NO_ORDER_VALUE] },
    },
    {
      id: "r_model",
      prompt: "Which Proline range or cooktop do you have?",
      type: "text",
      placeholder: "Model number, e.g. PLSR 30GE",
      visibleWhen: { questionId: "r_order_lookup", equals: [NO_ORDER_VALUE] },
    },
    {
      // Splits PLSR from PLST. Customers rarely know their suffix, and "the
      // oven won't heat" is a different diagnosis on each.
      id: "r_has_oven",
      prompt: "Does it have an oven?",
      type: "single",
      options: [
        { value: "has_oven", label: "Yes — it's a range with an oven" },
        { value: "cooktop_only", label: "No — it's a cooktop only" },
        { value: "unsure", label: "Not sure" },
      ],
      visibleWhen: { questionId: "r_order_lookup", equals: [NO_ORDER_VALUE] },
    },
    {
      // GE has an electric oven on 240V; GG has a gas oven on 120V. Same
      // symptom, different fault.
      id: "r_oven_fuel",
      prompt: "Is the oven gas or electric?",
      helpText:
        "Proline builds both. A dual-fuel range has gas burners on top and an electric oven; an all-gas range is gas throughout. If you're not sure, the model number tells us — GE is dual fuel, GG is all gas.",
      type: "single",
      options: [
        { value: "gas", label: "Gas" },
        { value: "electric", label: "Electric" },
        { value: "unsure", label: "Not sure" },
      ],
      visibleWhen: { questionId: "r_has_oven", equals: ["has_oven"] },
    },
    {
      id: "r_fuel",
      prompt: "What fuel is it running on?",
      type: "single",
      options: [
        { value: "natural_gas", label: "Natural gas" },
        { value: "propane", label: "Propane (LP)" },
        { value: "unsure", label: "Not sure" },
      ],
      visibleWhen: { questionId: SAFETY_GATE_ID, equals: ["none"] },
    },
    {
      // High-value: a conversion done without the LP orifices is a common and
      // very recognisable cause of poor flames.
      id: "r_lp_converted",
      prompt: "Was it converted to propane after purchase?",
      helpText:
        "Proline appliances ship set up for natural gas and include a conversion kit for propane. The conversion swaps small parts called orifices — if that step was missed, the flames burn badly.",
      type: "single",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No — it came set up for propane" },
        { value: "unsure", label: "Not sure" },
      ],
      visibleWhen: { questionId: "r_fuel", equals: ["propane"] },
    },
    {
      id: "r_age",
      prompt: "Roughly how old is it?",
      type: "single",
      options: o(
        "Less than 1 year",
        "1–3 years",
        "3–5 years",
        "More than 5 years",
        "Unsure",
      ),
      visibleWhen: { questionId: "r_order_lookup", equals: [NO_ORDER_VALUE] },
    },
    {
      id: "r_installer",
      prompt: "Who installed it?",
      helpText:
        "Gas and electrical hookups are the most common source of problems that look like appliance faults, so knowing who connected it helps us narrow things down quickly.",
      type: "single",
      options: o(
        "A licensed installer",
        "A plumber or gas fitter",
        "Myself or a handyman",
        "It came with the home",
        "Unsure",
      ),
      visibleWhen: { questionId: SAFETY_GATE_ID, equals: ["none"] },
    },
  ],

  issueType: {
    id: "r_issue_type",
    prompt: "What issue are you experiencing? (Select all that apply)",
    helpText:
      "We'll ask detailed questions about the first issue you pick, and pass everything else you select straight to our specialist so you don't have to answer two sets of questions.",
    type: "multi",
    // option.value MUST equal the target branch.key
    options: [
      { value: "r_burner", label: "Burner won't light, or lights poorly" },
      { value: "r_flame", label: "Flame looks wrong (yellow, uneven, too low)" },
      { value: "r_oven", label: "Oven won't heat, or heats wrong" },
      { value: "r_broiler", label: "Broiler or convection problem" },
      { value: "r_controls", label: "Controls, knobs, or display" },
      { value: "r_power", label: "No power at all" },
      { value: "r_door", label: "Oven door, glass, or hinges" },
      { value: "r_finish", label: "Finish, scratches, or a damaged part" },
      { value: "r_other", label: "Something else" },
    ],
  },

  branches: [
    // ------------------------------------------------------------- Burners
    {
      key: "r_burner",
      label: "Burner won't light",
      kind: "linear",
      questions: [
        {
          id: "burn_q1",
          prompt: "Which burners are affected?",
          type: "multi",
          options: o(
            "One specific burner",
            "Several burners",
            "All of them",
            "Front burners only",
            "Rear burners only",
          ),
        },
        {
          id: "burn_q2",
          prompt: "What happens when you turn the knob?",
          type: "single",
          options: o(
            "No clicking and no flame",
            "It clicks but won't light",
            "It lights, then goes out",
            "It only stays lit while I hold the knob in",
          ),
        },
        {
          id: "burn_q3",
          prompt: "Do the other burners light normally?",
          type: "single",
          options: o("Yes", "No", "Only some of them"),
        },
        {
          id: "burn_q4",
          prompt:
            "Has the burner cap been taken off and put back since it last worked?",
          helpText:
            "The burner cap is the removable metal disc sitting on top of each burner. If it's off-centre by even a little, the burner often won't light — it's one of the most common causes and takes seconds to correct.",
          type: "single",
          options: o("Yes", "No", "Not sure"),
        },
        {
          id: "burn_q5",
          prompt: "Has anything boiled over onto that burner recently?",
          type: "single",
          options: o("Yes", "No", "Not sure"),
        },
        describe("burn_q6"),
        uploadMedia(
          "burn_q7",
          "Upload a photo of the burner, and a video with sound of it trying to light.",
        ),
      ],
    },

    // --------------------------------------------------------------- Flame
    {
      key: "r_flame",
      label: "Flame looks wrong",
      kind: "linear",
      questions: [
        {
          id: "flame_q1",
          prompt: "What does the flame look like?",
          type: "multi",
          options: o(
            "Yellow or orange tips",
            "Lifting away from the burner",
            "Very low, even on high",
            "Uneven around the ring",
            "Roaring or much too large",
          ),
        },
        {
          id: "flame_q2",
          prompt: "Is it all burners, or only some?",
          type: "single",
          options: o("All of them", "Only some", "Just one"),
        },
        {
          id: "flame_q3",
          prompt:
            "Did this start right after installation, or right after a propane conversion?",
          type: "single",
          options: o(
            "Yes — right after installation",
            "Yes — right after a propane conversion",
            "No, it worked properly before",
            "Not sure",
          ),
        },
        describe("flame_q4"),
        uploadMedia(
          "flame_q5",
          "Upload a photo of the flame with the burner on high and the lights dimmed.",
        ),
      ],
    },

    // ---------------------------------------------------------------- Oven
    {
      key: "r_oven",
      label: "Oven won't heat",
      kind: "linear",
      questions: [
        {
          id: "oven_q1",
          prompt: "What's happening with the oven?",
          type: "multi",
          options: o(
            "No heat at all",
            "Heats, but very slowly",
            "Runs hotter or cooler than the setting",
            "Bakes unevenly",
            "Shuts off part-way through cooking",
          ),
        },
        {
          id: "oven_q2",
          prompt: "Do the cooktop burners still work normally?",
          type: "single",
          options: o("Yes", "No", "This is a cooktop with no oven"),
        },
        {
          id: "oven_q3",
          prompt: "Has the breaker been checked?",
          helpText:
            "The breaker is the switch in your home's electrical panel that supplies the appliance. A tripped breaker often sits halfway between on and off. Switch it fully off, then back on, to reset it.",
          type: "single",
          options: o("Yes — it's on", "It had tripped", "Not sure"),
        },
        {
          id: "oven_q4",
          prompt:
            "Before it should light, do you hear clicking or see a glowing element?",
          helpText:
            "A gas oven lights using either a spark (clicking) or a glow bar that heats up until it's bright orange. Whether you can see or hear one tells us a lot about where the problem is.",
          type: "single",
          options: o(
            "Yes — I hear clicking",
            "Yes — I see something glowing",
            "No, neither",
            "Not sure",
          ),
        },
        {
          id: "oven_q5",
          prompt: "Have you checked it against a separate oven thermometer?",
          type: "single",
          options: o("Yes", "No"),
        },
        {
          id: "oven_q6",
          prompt: "If you did, what did it read when the oven was set to 350°F?",
          type: "text",
          optional: true,
          placeholder: "e.g. 305°F after 20 minutes",
        },
        describe("oven_q7"),
        uploadMedia(
          "oven_q8",
          "Upload a photo of the display or knob setting, plus the thermometer if you used one.",
        ),
      ],
    },

    // ------------------------------------------------- Broiler / convection
    {
      key: "r_broiler",
      label: "Broiler or convection",
      kind: "linear",
      questions: [
        {
          id: "broil_q1",
          prompt: "Which one is affected?",
          type: "single",
          options: o("The broiler", "The convection fan", "Both"),
        },
        {
          id: "broil_q2",
          prompt: "What's wrong with it?",
          type: "multi",
          options: o(
            "No heat",
            "Fan doesn't run",
            "Fan is noisy",
            "Results are uneven",
          ),
        },
        {
          id: "broil_q3",
          prompt: "Does the main oven work normally otherwise?",
          type: "single",
          options: o("Yes", "No", "Not sure"),
        },
        describe("broil_q4"),
        uploadMedia("broil_q5", "Upload a photo, or a video with sound if it's a noise."),
      ],
    },

    // ------------------------------------------------------------ Controls
    {
      key: "r_controls",
      label: "Controls or display",
      kind: "linear",
      questions: [
        {
          id: "ctrl_q1",
          prompt: "What's affected?",
          type: "multi",
          options: o(
            "A knob",
            "The display",
            "Oven controls don't respond",
            "Panel lights",
          ),
        },
        {
          id: "ctrl_q2",
          prompt: "Is it physical or electronic?",
          type: "single",
          options: o(
            "Physical — loose, broken, or won't turn",
            "Electronic — no response, or shows the wrong thing",
            "Not sure",
          ),
        },
        {
          id: "ctrl_q3",
          prompt: "Does anything else on the appliance still work?",
          type: "single",
          options: o("Yes", "No", "Not sure"),
        },
        describe("ctrl_q4"),
        uploadMedia("ctrl_q5", "Upload a photo of the control area."),
      ],
    },

    // --------------------------------------------------------------- Power
    {
      key: "r_power",
      label: "No power",
      kind: "linear",
      questions: [
        {
          id: "pwr_q1",
          prompt: "Is anything working — lights, display, ignition?",
          type: "single",
          options: o("Nothing at all", "Some things still work"),
        },
        {
          id: "pwr_q2",
          prompt: "Has the breaker been checked?",
          helpText:
            "The breaker is the switch in your home's electrical panel that supplies the appliance. A tripped breaker often sits halfway between on and off. Switch it fully off, then back on, to reset it.",
          type: "single",
          options: o("Yes — it's on", "It had tripped", "Not sure"),
        },
        {
          id: "pwr_q3",
          prompt: "Has the breaker tripped more than once?",
          type: "single",
          options: o("Yes", "No", "Not sure"),
        },
        {
          id: "pwr_q4",
          prompt: "Is it plugged into an outlet, or wired directly?",
          type: "single",
          options: o("Plugged into an outlet", "Wired directly", "Not sure"),
        },
        describe("pwr_q5"),
        uploadMedia(
          "pwr_q6",
          "Upload a photo of the outlet or connection, only if you can see it safely.",
        ),
      ],
    },

    // ---------------------------------------------------------------- Door
    {
      key: "r_door",
      label: "Door, glass, hinges",
      kind: "linear",
      questions: [
        {
          id: "door_q1",
          prompt: "What's wrong?",
          type: "multi",
          options: o(
            "Won't close flush",
            "Won't stay open",
            "Glass is cracked or shattered",
            "Hinge is damaged",
            "Seal or gasket",
          ),
        },
        {
          id: "door_q2",
          prompt: "Did it arrive this way?",
          type: "single",
          options: o("Yes", "No", "Not sure"),
        },
        describe("door_q3"),
        uploadMedia(
          "door_q4",
          "Upload photos — the door closed, the door open, and a close-up of the damage.",
        ),
      ],
    },

    // -------------------------------------------------------------- Finish
    {
      key: "r_finish",
      label: "Finish or damaged part",
      kind: "linear",
      questions: [
        {
          id: "fin_q1",
          prompt: "What's affected?",
          type: "multi",
          options: o(
            "Stainless finish",
            "Porcelain",
            "Grates",
            "Knobs",
            "Griddle or grill plate",
            "Other",
          ),
        },
        {
          id: "fin_q2",
          prompt: "Did it arrive this way?",
          type: "single",
          options: o("Yes", "No", "Not sure"),
        },
        describe("fin_q3"),
        uploadMedia("fin_q4", "Upload photos — one wide, one close-up."),
      ],
    },

    // --------------------------------------------------------------- Other
    {
      key: "r_other",
      label: "Something else",
      kind: "linear",
      questions: [
        describe("oth_q1", "Tell us what's happening."),
        uploadMedia("oth_q2", "Upload photos or video, if you have any."),
      ],
    },
  ],
};
