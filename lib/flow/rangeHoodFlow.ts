import { CONTACT_QUESTION_ID, NO_ORDER_VALUE } from "./constants";
import type { CategoryFlow, Option, Question } from "./types";

// ---------------------------------------------------------------------------
// Range Hood flow — transcribed verbatim from the "Proline General
// Troubleshooting Questionnaire" diagram (question text, order, and options).
// `legacyLabel` preserves the original "QUESTION N" numbering for traceability.
// ---------------------------------------------------------------------------

/** Build options from labels; value is a stable slug of the label. */
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

const describe = (id: string): Question => ({
  id,
  legacyLabel: "QUESTION 4",
  prompt: "Please describe the issue.",
  type: "text",
  optional: true,
  placeholder: "Tell us what's happening, in your own words…",
});

const uploadMedia = (id: string, legacyLabel = "QUESTION 5"): Question => ({
  id,
  legacyLabel,
  prompt: "Upload photos and/or video showing the issue.",
  type: "upload",
  optional: true,
});

const additionalInfo = (id: string, legacyLabel: string): Question => ({
  id,
  legacyLabel,
  prompt: "Additional information",
  type: "text",
  optional: true,
  terminal: true,
  placeholder: "Anything else we should know? (optional)",
});

// The list of attachments requested at the end of the Hood Performance branch.
const uploadChecklist = o(
  "Front view showing entire grill and hood",
  "Side view showing mounting height",
  "Photo showing hood alignment over cooking surface",
  "Photo of roof or wall termination cap",
  "Ductwork photos (if accessible)",
  "Video showing the hood operating while smoke is being produced",
);

export const rangeHoodFlow: CategoryFlow = {
  productInfo: [
    {
      id: "p_order_lookup",
      legacyLabel: "QUESTION 1",
      prompt: "What is your order number, or the email you ordered with?",
      type: "lookup",
      placeholder: "Order number (e.g. 1024) or email",
    },
    // Manual fallback: shown only when the customer can't find their order (e.g.
    // it predates the Shopify migration). A found order gives us the model and
    // purchase date, so these are skipped on that path.
    {
      id: "p_hood_model",
      prompt: "Which Proline hood do you have?",
      type: "text",
      placeholder: "Model number, e.g. PLJW 104",
      visibleWhen: { questionId: "p_order_lookup", equals: [NO_ORDER_VALUE] },
    },
    {
      id: "p_hood_age",
      legacyLabel: "QUESTION 2",
      prompt: "Approximately how old is the hood?",
      type: "single",
      options: o(
        "Less than 1 year",
        "1–3 years",
        "3–5 years",
        "More than 5 years",
        "Unsure",
      ),
      visibleWhen: { questionId: "p_order_lookup", equals: [NO_ORDER_VALUE] },
    },
    {
      id: CONTACT_QUESTION_ID,
      prompt: "How can we reach you?",
      type: "contact",
      visibleWhen: { questionId: "p_order_lookup", equals: [NO_ORDER_VALUE] },
    },
  ],

  issueType: {
    id: "issue_type",
    legacyLabel: "QUESTION 3",
    prompt: "What issue are you experiencing?",
    type: "single",
    // option.value MUST equal the target branch.key
    options: [
      { value: "hood_performance", label: "Hood Performance / Airflow Issue" },
      { value: "blower", label: "Blower / Fan Issue" },
      { value: "touch_panel", label: "Touch Panel / Controls Issue" },
      { value: "light", label: "Light Issue" },
      { value: "electrical", label: "Electrical / Power Issue" },
      { value: "vibration", label: "Vibration / Noise Issue" },
      { value: "other", label: "Other" },
    ],
  },

  branches: [
    // ---------------------------------------------------------------- Hood Perf
    {
      key: "hood_performance",
      label: "Hood Performance / Airflow Issue",
      kind: "split",
      preSplit: [
        describe("hp_q4"),
        uploadMedia("hp_q5"),
        {
          id: "hp_q6",
          legacyLabel: "QUESTION 6",
          prompt: "What best describes the issue?",
          type: "multi",
          options: o(
            "Hood is not drawing smoke effectively",
            "Poor suction",
            "Smoke escapes from front of hood",
            "Smoke escapes from sides of hood",
            "Smoke blows back into kitchen or patio",
            "Hood airflow seems weaker than expected",
            "Other",
          ),
        },
      ],
      split: {
        id: "hp_install_location",
        legacyLabel: "Is the hood installed:",
        prompt: "Is the hood installed indoors or outdoors?",
        type: "single",
        options: [
          { value: "indoors", label: "Indoors" },
          { value: "outdoors", label: "Outdoors" },
        ],
      },
      paths: [
        {
          value: "indoors",
          label: "Indoors",
          questions: [
            {
              id: "hp_in_q7",
              legacyLabel: "QUESTION 7",
              prompt: "What issue are you experiencing? (Select all that apply)",
              type: "multi",
              options: o(
                "Smoke escapes from front of hood",
                "Smoke escapes from sides of hood",
                "Weak airflow or poor suction",
                "Cooking odors remain in kitchen",
                "Excessive noise",
                "Other",
              ),
            },
            {
              id: "hp_in_q8",
              legacyLabel: "QUESTION 8",
              prompt: "When does the issue occur?",
              type: "multi",
              options: o(
                "All the time",
                "During high-heat cooking only",
                "During normal cooking",
                "Occasionally",
              ),
            },
            {
              id: "hp_in_q9",
              legacyLabel: "QUESTION 9",
              prompt: "Please briefly describe the issue.",
              type: "text",
              optional: true,
              placeholder: "Explain here…",
            },
            {
              id: "hp_in_q10",
              legacyLabel: "QUESTION 10",
              prompt: "What type of cooking appliance is below the hood?",
              type: "multi",
              options: o(
                "Gas Range",
                "Gas Cooktop",
                "Electric Range",
                "Electric Cooktop",
                "Induction Cooktop",
                "Professional Style Range",
                "Other",
              ),
            },
            {
              id: "hp_in_q11",
              legacyLabel: "QUESTION 11",
              prompt: "What is the width of the cooking surface?",
              type: "multi",
              options: o('24"', '30"', '36"', '48"', '60"', "Other"),
            },
            {
              id: "hp_in_q12",
              legacyLabel: "QUESTION 12",
              prompt: "What Proline hood model is installed?",
              type: "text",
              optional: true,
              placeholder: "e.g. PLJW 104",
            },
            {
              id: "hp_in_q13",
              legacyLabel: "QUESTION 13",
              prompt: "What is the width of the hood?",
              type: "multi",
              options: o('30"', '36"', '42"', '48"', '54"', '60"', "Other"),
            },
            {
              id: "hp_in_q14",
              legacyLabel: "QUESTION 14",
              prompt:
                "What is the approximate distance from the cooking surface to the bottom of the hood?",
              type: "text",
              optional: true,
              placeholder: "Distance in inches",
            },
            {
              id: "hp_in_q15",
              legacyLabel: "QUESTION 15",
              prompt: "Is the hood centered directly over the cooking surface?",
              type: "single",
              options: o("Yes", "No", "Unsure"),
            },
            {
              id: "hp_in_q16",
              legacyLabel: "QUESTION 16",
              prompt:
                "Does the hood extend beyond the cooking surface on both sides?",
              type: "single",
              options: o("Yes", "No", "Unsure"),
            },
            {
              id: "hp_in_q17",
              legacyLabel: "QUESTION 17",
              prompt: "What duct size is installed?",
              type: "multi",
              options: o('8"', '10"', '12"', "Other", "Unsure"),
            },
            {
              id: "hp_in_q18",
              legacyLabel: "QUESTION 18",
              prompt:
                "What is the approximate total duct length from the hood to the termination?",
              type: "multi",
              options: o(
                "Less than 10 feet",
                "10–20 feet",
                "20–30 feet",
                "30–40 feet",
                "More than 40 feet",
                "Unsure",
              ),
            },
            {
              id: "hp_in_q19",
              legacyLabel: "QUESTION 19",
              prompt: "How many 90° elbows are in the duct system?",
              type: "multi",
              options: o("0", "1", "2", "3", "4+"),
            },
            {
              id: "hp_in_q20",
              legacyLabel: "QUESTION 20",
              prompt: "Are there any duct size reductions in the duct system?",
              type: "multi",
              options: o("Yes", "No", "Unsure"),
              followUp: {
                id: "hp_in_q20_desc",
                prompt: "If yes, please describe the reduction(s).",
                showWhen: ["yes"],
                placeholder: "Describe here…",
              },
            },
            {
              id: "hp_in_q21",
              legacyLabel: "QUESTION 21",
              prompt: "What type of termination cap is installed?",
              type: "multi",
              options: o(
                "Roof Cap",
                "Wall Cap",
                "Gooseneck",
                "Custom Fabricated Cap",
                "Unsure",
              ),
            },
            {
              id: "hp_in_q22",
              legacyLabel: "QUESTION 22",
              prompt:
                "Can air be felt exiting the roof or wall cap while the hood is operating?",
              type: "single",
              options: o("Yes", "No", "Unsure"),
            },
            {
              id: "hp_in_q23",
              legacyLabel: "QUESTION 23",
              prompt: "Is the home equipped with Make-Up Air (MUA)?",
              type: "single",
              options: o("Yes", "No", "Unsure"),
            },
            {
              id: "hp_in_q24",
              legacyLabel: "QUESTION 24",
              prompt: "Does opening a nearby window improve hood performance?",
              type: "single",
              options: o("Yes", "No", "Unsure", "Not Tested"),
            },
            {
              id: "hp_in_q25",
              legacyLabel: "QUESTION 25",
              prompt: "Are any of the following operating at the same time?",
              type: "multi",
              options: o(
                "HVAC System",
                "Dryer",
                "Bathroom Exhaust Fan",
                "Whole House Fan",
                "None",
                "Unsure",
              ),
            },
            {
              id: "hp_in_q27",
              legacyLabel: "QUESTION 27",
              prompt: "Please upload the following:",
              type: "upload",
              optional: true,
              options: uploadChecklist,
            },
            additionalInfo("hp_in_q28", "QUESTION 28"),
          ],
        },
        {
          value: "outdoors",
          label: "Outdoors",
          questions: [
            {
              id: "hp_out_q7",
              legacyLabel: "QUESTION 7",
              prompt: "What issue are you experiencing? (Select all that apply)",
              type: "multi",
              options: o(
                "Smoke escapes from the front of the hood",
                "Smoke escapes from the sides of the hood",
                "Smoke is not being captured effectively",
                "Hood seems weak or has poor airflow",
                "Excessive noise",
                "Other",
              ),
            },
            {
              id: "hp_out_q8",
              legacyLabel: "QUESTION 8",
              prompt: "When does the issue occur?",
              type: "multi",
              options: o(
                "All the time",
                "During high-heat cooking only",
                "During smoking or low-and-slow cooking",
                "Only on windy days",
                "Occasionally",
              ),
            },
            {
              id: "hp_out_q9",
              legacyLabel: "QUESTION 9",
              prompt: "Please briefly describe the issue.",
              type: "text",
              optional: true,
              placeholder: "Explain here…",
            },
            {
              id: "hp_out_q10",
              legacyLabel: "QUESTION 10",
              prompt: "What type of appliance is installed below the hood?",
              type: "multi",
              options: o(
                "Gas Grill",
                "Pellet Grill",
                "Charcoal Grill",
                "Griddle",
                "Combination Cooking Appliance",
                "Other",
              ),
            },
            {
              id: "hp_out_q11",
              legacyLabel: "QUESTION 11",
              prompt: "What is the width of the primary cooking appliance?",
              type: "multi",
              options: o('30"', '32"', '36"', '42"', '48"', '54"', '60"+', "Other"),
            },
            {
              id: "hp_out_q12",
              legacyLabel: "QUESTION 12",
              prompt: "What Proline hood model is installed?",
              type: "text",
              optional: true,
              placeholder: "e.g. PLJI 102",
            },
            {
              id: "hp_out_q13",
              legacyLabel: "QUESTION 13",
              prompt: "What is the width of the hood?",
              type: "multi",
              options: o('36"', '42"', '48"', '54"', '60"', '72"', "Other"),
            },
            {
              id: "hp_out_q14",
              legacyLabel: "QUESTION 14",
              prompt:
                "What is the approximate distance from the cooking surface to the bottom of the hood?",
              type: "text",
              optional: true,
              placeholder: "Distance in inches",
            },
            {
              id: "hp_out_q15",
              legacyLabel: "QUESTION 15",
              prompt: "Is the hood centered directly over the cooking surface?",
              type: "single",
              options: o("Yes", "No", "Unsure"),
            },
            {
              id: "hp_out_q16",
              legacyLabel: "QUESTION 16",
              prompt:
                "Does the hood extend beyond the front edge of the cooking surface?",
              type: "single",
              options: o("Yes", "No", "Unsure"),
            },
            {
              id: "hp_out_q17",
              legacyLabel: "QUESTION 17",
              prompt: "What duct size is installed?",
              type: "multi",
              options: o('8"', '10"', '12"', "Other", "Unsure"),
            },
            {
              id: "hp_out_q18",
              legacyLabel: "QUESTION 18",
              prompt: "How many duct runs are connected to the hood?",
              type: "multi",
              options: o("Single Duct", "Dual Duct"),
            },
            {
              id: "hp_out_q19",
              legacyLabel: "QUESTION 19",
              prompt:
                "What is the approximate total duct length from the hood to the termination?",
              type: "multi",
              options: o(
                "Less than 10 feet",
                "10–20 feet",
                "20–30 feet",
                "30–40 feet",
                "More than 40 feet",
                "Unsure",
              ),
            },
            {
              id: "hp_out_q20",
              legacyLabel: "QUESTION 20",
              prompt: "How many 90° elbows are in the duct system?",
              type: "multi",
              options: o("0", "1", "2", "3", "4+"),
            },
            {
              id: "hp_out_q21",
              legacyLabel: "QUESTION 21",
              prompt: "Are there any duct size reductions in the duct system?",
              type: "multi",
              options: o("Yes", "No", "Unsure"),
              followUp: {
                id: "hp_out_q21_desc",
                prompt: "If yes, please describe the reduction(s).",
                showWhen: ["yes"],
                placeholder: "Describe here…",
              },
            },
            {
              id: "hp_out_q22",
              legacyLabel: "QUESTION 22",
              prompt: "What type of termination cap is installed?",
              type: "multi",
              options: o(
                "Mushroom Cap",
                "Standard Roof Cap",
                "Wall Cap",
                "Gooseneck",
                "Custom Fabricated Cap",
                "Unsure",
              ),
            },
            {
              id: "hp_out_q23",
              legacyLabel: "QUESTION 23",
              prompt:
                "Can smoke be visibly seen exiting the termination cap while the hood is operating?",
              type: "single",
              options: o("Yes", "No", "Unsure"),
            },
            {
              id: "hp_out_q24",
              legacyLabel: "QUESTION 24",
              prompt: "Where is the hood installed?",
              type: "multi",
              options: o(
                "Open Patio",
                "Covered Patio",
                "Lanai",
                "Outdoor Kitchen Structure",
                "Other",
              ),
            },
            {
              id: "hp_out_q25",
              legacyLabel: "QUESTION 25",
              prompt: "Is the installation area exposed to frequent wind?",
              type: "single",
              options: o("Yes", "No", "Unsure"),
            },
            {
              id: "hp_out_q26",
              legacyLabel: "QUESTION 26",
              prompt:
                "Are there nearby walls, screens, glass panels, shutters, or other wind barriers?",
              type: "single",
              options: o("Yes", "No"),
            },
            {
              id: "hp_out_q27",
              legacyLabel: "QUESTION 27",
              prompt: "Please upload the following:",
              type: "upload",
              optional: true,
              options: uploadChecklist,
            },
            additionalInfo("hp_out_q28", "QUESTION 28"),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------ Blower
    {
      key: "blower",
      label: "Blower / Fan Issue",
      kind: "linear",
      questions: [
        describe("blower_q4"),
        uploadMedia("blower_q5"),
        {
          id: "blower_q6",
          legacyLabel: "QUESTION 6",
          prompt: "Does the blower operate?",
          type: "multi",
          options: o("Yes", "No", "Sometimes"),
        },
        {
          id: "blower_q7",
          legacyLabel: "QUESTION 7",
          prompt: "What happens when the blower is activated?",
          type: "multi",
          options: o(
            "Nothing happens",
            "Humming sound only",
            "Starts then stops",
            "Runs on some speeds only",
            "Runs continuously",
            "Other",
          ),
        },
        {
          id: "blower_q8",
          legacyLabel: "QUESTION 8",
          prompt: "Which speeds are affected?",
          type: "multi",
          options: o("Speed 1", "Speed 2", "Speed 3", "Speed 4", "All Speeds"),
        },
        {
          id: "blower_q9",
          legacyLabel: "QUESTION 9",
          prompt: "Has the blower ever worked properly?",
          type: "multi",
          options: o("Yes", "No"),
        },
        {
          id: "blower_q10",
          legacyLabel: "QUESTION 10",
          prompt: "Upload a video showing the blower operation.",
          type: "upload",
          optional: true,
        },
        additionalInfo("blower_q11", "QUESTION 11"),
      ],
    },

    // ------------------------------------------------------------- Touch Panel
    {
      key: "touch_panel",
      label: "Touch Panel / Controls Issue",
      kind: "linear",
      questions: [
        describe("touch_q4"),
        uploadMedia("touch_q5"),
        {
          id: "touch_q6",
          legacyLabel: "QUESTION 6",
          prompt: "Is the display illuminated?",
          type: "multi",
          options: o("Yes", "No", "Intermittent"),
        },
        {
          id: "touch_q7",
          legacyLabel: "QUESTION 7",
          prompt: "What issue are you experiencing?",
          type: "multi",
          options: o(
            "No response to button presses",
            "Some buttons do not work",
            "Display is blank",
            "Display shows incorrect information",
            "Random beeping",
            "Hood turns on by itself",
            "Other",
          ),
        },
        {
          id: "touch_q8",
          legacyLabel: "QUESTION 8",
          prompt: "Does the issue affect:",
          type: "multi",
          options: o(
            "Blower Controls",
            "Light Controls",
            "Timer Functions",
            "Entire Control Panel",
          ),
        },
        {
          id: "touch_q9",
          legacyLabel: "QUESTION 9",
          // NOTE: the source diagram reads "blower operation" here — almost
          // certainly a copy-paste artifact in a Touch Panel branch. Kept
          // verbatim per "diagram = source of truth"; confirm with the owner.
          prompt: "Upload a video showing the blower operation.",
          type: "upload",
          optional: true,
        },
        additionalInfo("touch_q10", "QUESTION 10"),
      ],
    },

    // ------------------------------------------------------------------- Light
    {
      key: "light",
      label: "Light Issue",
      kind: "linear",
      questions: [
        describe("light_q4"),
        uploadMedia("light_q5"),
        {
          id: "light_q6",
          legacyLabel: "QUESTION 6",
          prompt: "What issue are you experiencing?",
          type: "multi",
          options: o(
            "One light out",
            "Multiple lights out",
            "All lights out",
            "Lights flicker",
            "Lights dim unexpectedly",
            "Lights will not turn off",
            "Other",
          ),
        },
        {
          id: "light_q7",
          legacyLabel: "QUESTION 7",
          prompt: "Are the blower functions working normally?",
          type: "multi",
          options: o("Yes", "No"),
        },
        {
          id: "light_q8",
          legacyLabel: "QUESTION 8",
          prompt: "Have the bulbs been replaced?",
          type: "multi",
          options: o("Yes", "No"),
        },
        {
          id: "light_q9",
          legacyLabel: "QUESTION 9",
          prompt: "If replaced, did the issue remain?",
          type: "multi",
          options: o("Yes", "No"),
        },
        {
          id: "light_q10",
          legacyLabel: "QUESTION 10",
          // NOTE: the source diagram reads "of the display" here — likely a
          // copy-paste artifact in a Light branch. Kept verbatim per
          // "diagram = source of truth"; confirm with the owner.
          prompt: "Upload photo or video of the display.",
          type: "upload",
          optional: true,
        },
        additionalInfo("light_q11", "QUESTION 11"),
      ],
    },

    // -------------------------------------------------------------- Electrical
    {
      key: "electrical",
      label: "Electrical / Power Issue",
      kind: "linear",
      questions: [
        describe("elec_q4"),
        uploadMedia("elec_q5"),
        {
          id: "elec_q6",
          legacyLabel: "QUESTION 6",
          prompt: "What issue are you experiencing?",
          type: "multi",
          options: o(
            "Hood completely dead",
            "Intermittent power loss",
            "Tripping breaker",
            "Burning smell",
            "Sparks",
            "Other",
          ),
        },
        {
          id: "elec_q7",
          legacyLabel: "QUESTION 7",
          prompt: "Has power been verified at the outlet or junction box?",
          type: "multi",
          options: o("Yes", "No", "Unsure"),
        },
        {
          id: "elec_q8",
          legacyLabel: "QUESTION 8",
          prompt: "Has the breaker been checked?",
          type: "multi",
          options: o("Yes", "No"),
        },
        {
          id: "elec_q9",
          legacyLabel: "QUESTION 9",
          prompt: "Upload photos of the electrical connection if accessible.",
          type: "upload",
          optional: true,
        },
        additionalInfo("elec_q10", "QUESTION 10"),
      ],
    },

    // --------------------------------------------------------------- Vibration
    {
      key: "vibration",
      label: "Vibration / Noise Issue",
      kind: "linear",
      questions: [
        describe("vib_q4"),
        uploadMedia("vib_q5"),
        {
          id: "vib_q6",
          legacyLabel: "QUESTION 6",
          prompt: "What type of noise are you hearing?",
          type: "multi",
          options: o(
            "Rattling",
            "Vibration",
            "Grinding",
            "Humming",
            "Buzzing",
            "Whistling",
            "Other",
          ),
        },
        {
          id: "vib_q7",
          legacyLabel: "QUESTION 7",
          prompt: "When does the noise occur?",
          type: "multi",
          options: o("Speed 1", "Speed 2", "Speed 3", "Speed 4", "All Speeds"),
        },
        {
          id: "vib_q8",
          legacyLabel: "QUESTION 8",
          prompt: "Does the noise change when the filters are removed?",
          type: "multi",
          options: o("Yes", "No", "Not Tested"),
        },
        {
          id: "vib_q9",
          legacyLabel: "QUESTION 9",
          prompt: "Upload video with sound showing the issue.",
          type: "upload",
          optional: true,
        },
        additionalInfo("vib_q10", "QUESTION 10"),
      ],
    },

    // ------------------------------------------------------------------- Other
    {
      key: "other",
      label: "Other",
      kind: "linear",
      questions: [
        describe("other_q4"),
        uploadMedia("other_q5"),
        additionalInfo("other_q6", "QUESTION 6"),
      ],
    },
  ],
};
