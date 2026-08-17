# Ranges & Cooktops questionnaire — DRAFT for support review

**Status: not built, not live.** This is the equivalent of the FigJam diagram the
Range Hood flow was transcribed from. Once your support team marks it up, I'll
transcribe it into `lib/flow/rangesFlow.ts` the same way.

## Where this came from, and how much to trust it

| Part | Grounding | Confidence |
| --- | --- | --- |
| Product architecture (GE / GG / PLST, burner counts, voltages) | `Reference - Ranges & Cooktops Specs (PLSR, PLST)` | **High** — from your specs |
| Warranty framing (1 year parts + labour) | `Brand - Policies` | **High** |
| LP conversion as a failure mode | Your LP conversion manual + LP-convertible spec | **Medium** |
| The failure modes themselves, and every branch below | **My inference** from gas-appliance behaviour | **Low — needs your review** |

The vault says this outright in `KB - Ranges & Cooktops`: *"Range-specific
troubleshooting (ignition, oven, convection) is not yet documented — KB -
Troubleshooting & Care is hood-centric today."* I found nothing to contradict
that: the only "ignition" mentions anywhere are spec sheets describing it as a
feature. **So treat the branch content as a starting proposal, not knowledge.**

---

## The thing I'd change about the hood flow's shape

**Gas appliances need an emergency exit the hood flow doesn't have.**

A hood problem is an inconvenience. A gas smell is a call-the-gas-company-now
event, and the current design would answer it with "a specialist will email you
within one to two business days." That's the wrong answer at the wrong speed.

So this flow opens with a safety gate **before** anything else, and it does not
create a ticket — it stops.

---

## Screen 0 — Safety gate (before any questions)

> **Do any of these apply right now?**
> - I can smell gas
> - I can hear hissing near the appliance
> - I see scorching, melting, or smoke that isn't from cooking
>
> ☐ Yes, one of these  ☐ No, none of these

**If Yes → hard stop.** No questionnaire, no ticket, no email:

> **Stop and leave the building.** Don't switch anything on or off, including
> lights. From outside, call your gas utility's emergency line or 911. Once
> you're safe, contact Proline about the appliance.

*Review question for you: do you want the gas-utility wording, or would legal
prefer something narrower?*

---

## Section A — Product information

| # | Question | Type | Notes |
| --- | --- | --- | --- |
| A1 | Order number or email you ordered with | lookup | Same component as hoods |
| A2 | How can we reach you? | contact | Only when no order found |
| A3 | Which Proline model? | text | Only when no order found |
| A4 | Does it have an oven? | single: Yes, it's a range with an oven / No, it's a cooktop only / Not sure | **Splits PLSR from PLST.** Asked only if the model is unknown |
| A5 | Is the oven gas or electric? | single: Gas / Electric / Not sure | **Splits GG from GE.** Only if A4 = has an oven |
| A6 | What fuel is it running on? | single: Natural gas / Propane (LP) / Not sure | |
| A7 | Was it converted to propane after purchase? | single: Yes / No / Not sure | Only if A6 = Propane. **High-value question** — see LP branch |
| A8 | Roughly how old is it? | single: <1 yr / 1–3 / 3–5 / 5+ / Unsure | Drives the 1-year warranty conversation |
| A9 | Who installed it? | single: Licensed installer / Plumber or gas fitter / Myself or a handyman / Came with the home / Unsure | Gas hookup issues track strongly to install |

**Why A4–A5 matter:** GE has an *electric* oven on 240V, GG has a *gas* oven on
120V, PLST has no oven at all. "The oven won't heat" is three different
diagnoses depending which one it is, and customers rarely know their suffix.

---

## Screen B — Issue type (multi-select, as with hoods)

1. Burner won't light, or lights poorly
2. Flame looks wrong (yellow, uneven, too low, too high)
3. Oven won't heat, or heats wrong
4. Broiler or convection problem
5. Controls, knobs, or display
6. No power at all
7. Oven door, glass, or hinges
8. Finish, scratches, or a damaged part
9. Something else

*(Item 3 and 4 hidden when A4 = cooktop only.)*

---

## Branch 1 — Burner won't light / lights poorly

| # | Question | Type |
| --- | --- | --- |
| 1.1 | Which burners? | multi: One specific burner / Several / All of them / Front only / Rear only |
| 1.2 | What happens when you turn the knob? | single: No clicking, no flame / Clicks but won't light / Lights then goes out / Lights only if held in |
| 1.3 | Do the *other* burners light normally? | single: Yes / No / Only some |
| 1.4 | Has the burner cap been removed and refitted since it last worked? | single: Yes / No / Unsure |
| 1.5 | Has anything boiled over onto that burner recently? | single: Yes / No / Unsure |
| 1.6 | Describe what's happening | text (optional) |
| 1.7 | Photo of the burner, and video with sound of the ignition attempt | upload |

**Diagnostic logic I'd propose** *(unverified)*: all burners not clicking →
power or ignition module. One burner clicking but not lighting → burner cap
seated wrong, or a blocked port, both usually customer-fixable. Lights then dies
→ flame sensing / thermocouple. Lights only while held → same. Boil-over is the
single most common cause of one dead burner.

---

## Branch 2 — Flame looks wrong

| # | Question | Type |
| --- | --- | --- |
| 2.1 | What does the flame look like? | multi: Yellow or orange tips / Lifting off the burner / Very low / Uneven around the ring / Roaring or too large |
| 2.2 | All burners, or just some? | single |
| 2.3 | Is it running on propane? | single: Yes / No / Not sure |
| 2.4 | If propane — was the LP conversion kit fitted? | single: Yes / No / Not sure |
| 2.5 | Did this start immediately after installation or conversion? | single: Yes / No |
| 2.6 | Photo of the flame, burners on high, lights dimmed | upload |

**This is the branch I'm most confident about.** A yellow, lazy flame on propane
almost always means the LP orifices weren't fitted, or natural-gas orifices were
left in. Your models are LP-convertible and you publish a conversion manual, so
this will be a real and recurring case. A2.4 = No or Not sure with A6 = Propane
should be a strong signal to the agent.

*Safety note the agent should carry: a persistently yellow flame on gas can mean
incomplete combustion, which produces carbon monoxide. I'd want your team's
ruling on whether the customer is told to stop using it.*

---

## Branch 3 — Oven won't heat / heats wrong (PLSR only)

| # | Question | Type |
| --- | --- | --- |
| 3.1 | What's happening? | multi: No heat at all / Heats but slowly / Runs hot or cold vs the dial / Uneven baking / Shuts off mid-cook |
| 3.2 | Is the oven gas or electric? | single (skipped if known from A5) |
| 3.3 | Do the *cooktop* burners still work normally? | single: Yes / No / N/A |
| 3.4 | **Electric oven only** — has the breaker been checked? | single: Yes, it's on / It had tripped / Not sure |
| 3.5 | **Gas oven only** — do you hear ignition clicking or see a glow before it lights? | single: Yes / No / Not sure |
| 3.6 | Have you checked it against a separate oven thermometer? | single: Yes / No |
| 3.7 | If yes, what temperature did it read when set to 350°F? | text (optional) |
| 3.8 | Photo of the display or knob setting, plus the thermometer if used | upload |

**Logic** *(unverified)*: cooktop working but oven dead on a **GE** points at the
240V supply or the element; on a **GG** it points at the oven igniter, which is
the classic wear part on a gas oven. "Runs hot or cold vs the dial" is usually
calibration, not a fault, and 3.6–3.7 let the agent settle that in one reply
instead of three.

---

## Branch 4 — Broiler or convection

| # | Question | Type |
| --- | --- | --- |
| 4.1 | Which? | single: Broiler / Convection fan / Both |
| 4.2 | What's wrong? | multi: No heat / No fan / Fan noisy / Uneven results |
| 4.3 | Does the main oven work normally? | single: Yes / No |
| 4.4 | Describe it | text (optional) |
| 4.5 | Photo or video with sound | upload |

---

## Branch 5 — Controls, knobs, display

| # | Question | Type |
| --- | --- | --- |
| 5.1 | What's affected? | multi: A knob / The display / Oven controls unresponsive / Lights on the panel |
| 5.2 | Is it physical (loose, broken, won't turn) or electronic (no response, wrong reading)? | single |
| 5.3 | Does anything else on the appliance still work? | single: Yes / No |
| 5.4 | Photo of the control area | upload |

---

## Branch 6 — No power at all

| # | Question | Type |
| --- | --- | --- |
| 6.1 | Is anything working — lights, display, ignition? | single: Nothing / Some things |
| 6.2 | Has the breaker been checked? | single: Yes, it's on / It had tripped / Not sure — **with a `?` explainer** |
| 6.3 | Has the breaker tripped more than once? | single: Yes / No / Unsure |
| 6.4 | Is it plugged into an outlet, or hardwired? | single: Outlet / Hardwired / Not sure |
| 6.5 | **Gas models only** — do the burners still light with a match? | single: Yes / No / Haven't tried |
| 6.6 | Photo of the outlet or connection, if you can see it safely | upload |

**Repeated breaker trips should escalate hard**, the way the hood flow's
electrical branch does — that's a fault, not a nuisance, and it shouldn't wait
one to two business days.

---

## Branch 7 — Door, glass, hinges

| # | Question | Type |
| --- | --- | --- |
| 7.1 | What's wrong? | multi: Won't close flush / Won't stay open / Glass cracked or shattered / Hinge damaged / Seal or gasket |
| 7.2 | Did it arrive this way? | single: Yes / No / Not sure |
| 7.3 | Photos — closed, open, and a close-up of the damage | upload |

**Routing note:** "Did it arrive this way?" = Yes should behave as a shipping
damage claim, not troubleshooting. Worth confirming how you want that handled —
your returns operations map may already define this.

---

## Branch 8 — Finish, scratches, damaged part

| # | Question | Type |
| --- | --- | --- |
| 8.1 | What's affected? | multi: Stainless finish / Porcelain / Grates / Knobs / Griddle or grill plate / Other |
| 8.2 | Did it arrive this way? | single: Yes / No / Not sure |
| 8.3 | Photos, wide and close-up | upload |

---

## Branch 9 — Something else

| # | Question | Type |
| --- | --- | --- |
| 9.1 | Tell us what's happening | text |
| 9.2 | Photos or video | upload |

---

## Open questions for your team

1. **Is the safety gate wording right?** It's the one screen with real-world
   consequences, and I'd rather your team (or legal) own the exact words.
2. **Yellow flame** — do you want the customer told to stop using the appliance
   pending review, given the carbon-monoxide angle?
3. **Shipping damage** (7.2 / 8.2 = "arrived this way") — should it divert to
   your returns process instead of creating a support case?
4. **Repeat breaker trips** — same escalation treatment as the hood electrical
   branch?
5. **Anything obviously missing?** These branches are my inference from how gas
   ranges fail, not from your ticket history. Whoever answers your range calls
   will spot gaps in five minutes that I can't spot at all.
6. **Diagnosis content.** The hood flow has scripted causes behind each branch
   (`lib/diagnoses/content.ts`), Brain-grounded and reviewed. There's no
   equivalent for ranges. The customer never sees these now, but the *agent*
   does, and the AI pre-diagnosis is grounded partly in them — so they'd want
   writing before this feels as good as the hood flow.
