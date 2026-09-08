# NutriClock Rules V1
**Status:** Draft for product/rules review  
**Ruleset version:** `1.0.0-draft`  
**Evidence registry version:** `2026-09-03`  
**Reviewed:** 2026-09-03
## Purpose
This document is the human-readable companion to `NutriClock_Rules_V1.json`. It freezes the V1 medical/timing semantics that Codex is permitted to implement. Rules marked **ACTIVE** may be used by NutriClock. Rules marked **RULE_REVIEW_REQUIRED** must remain inert until explicitly approved.
### Governing constraints
- No runtime medical research or LLM medical inference.
- Medication times are fixed user-entered anchors.
- Clinical warnings do not affect scheduling scores.
- Hard constraints are non-overridable.
- Missing or ambiguous timing semantics are not guessed.
- Absence of a supported rule must never be presented as proof of no interaction.
## Audit summary
- **Active rules:** 19
- **Review-required rules:** 13
- **Evidence records:** 14
- **Retired rules:** 0

The review-required set is deliberate. Several source statements use ranges such as **4–6 hours**, or say **at the same time / different times** without providing the exact machine interval required by the current domain model. Those rules are kept inactive rather than silently choosing a number.
## Active rules
| Rule ID | Classification | Effect | Source → Target | Machine timing | Overridable | Evidence |
|---|---|---|---|---|---:|---|
| `iron_common_oral_meal_timing` | `strong_preference` | `prefer_empty_stomach` | `iron` → `routine:meal` | 30 min source→target / 120 min target→source | Yes | `ev_nhs_ferrous_sulfate` |
| `iron_vitamin_c_together` | `strong_preference` | `prefer_together` | `iron` → `vitamin_c` | None | Yes | `ev_nhs_ferrous_sulfate`, `ev_nih_vitamin_c_hp` |
| `iron_levothyroxine_240` | `hard_schedule_constraint` | `require_separation` | `iron` → `levothyroxine` | 240 min symmetric | No | `ev_nih_iron_hp`, `ev_medlineplus_levothyroxine` |
| `iron_ppi_warning` | `clinical_warning` | `warning` | `iron` → `proton_pump_inhibitor` | None | No | `ev_nih_iron_hp` |
| `iron_levodopa_warning` | `clinical_warning` | `warning` | `iron` → `levodopa` | None | No | `ev_nih_iron_hp` |
| `vitamin_d3_fat_meal` | `strong_preference` | `prefer_meal_characteristic` | `vitamin_d3` → `routine:meal` | None | Yes | `ev_nih_vitamin_d_hp` |
| `vitamin_b12_ppi_warning` | `clinical_warning` | `warning` | `vitamin_b12` → `proton_pump_inhibitor` | None | No | `ev_nih_vitamin_b12_hp` |
| `vitamin_b12_metformin_warning` | `clinical_warning` | `warning` | `vitamin_b12` → `metformin` | None | No | `ev_nih_vitamin_b12_hp` |
| `calcium_carbonate_with_food` | `strong_preference` | `prefer_with_food` | `calcium` → `routine:meal` | None | Yes | `ev_nih_calcium_hp` |
| `calcium_over_500mg_information` | `informational` | `informational` | `calcium` → `calcium` | None | No | `ev_nih_calcium_hp` |
| `calcium_carbonate_levothyroxine_240` | `hard_schedule_constraint` | `require_separation` | `calcium` → `levothyroxine` | 240 min symmetric | No | `ev_nih_calcium_hp`, `ev_medlineplus_levothyroxine` |
| `calcium_quinolone_120` | `hard_schedule_constraint` | `require_separation` | `calcium` → `quinolone_antibiotic` | 120 min symmetric | No | `ev_nih_calcium_hp` |
| `dolutegravir_calcium_asymmetric` | `hard_schedule_constraint` | `require_separation` | `dolutegravir` → `calcium` | 120 min source→target / 360 min target→source | No | `ev_nih_calcium_hp` |
| `magnesium_oral_bisphosphonate_120` | `hard_schedule_constraint` | `require_separation` | `magnesium` → `oral_bisphosphonate` | 120 min symmetric | No | `ev_nih_magnesium_hp` |
| `magnesium_ppi_warning` | `clinical_warning` | `warning` | `magnesium` → `proton_pump_inhibitor` | None | No | `ev_nih_magnesium_hp` |
| `zinc_penicillamine_60` | `hard_schedule_constraint` | `require_separation` | `zinc` → `penicillamine` | 60 min symmetric | No | `ev_nih_zinc_hp`, `ev_medlineplus_penicillamine` |
| `folate_methotrexate_warning` | `clinical_warning` | `warning` | `folate` → `methotrexate` | None | No | `ev_nih_folate_hp` |
| `folate_antiepileptic_warning` | `clinical_warning` | `warning` | `folate` → `selected_antiepileptic` | None | No | `ev_nih_folate_hp` |
| `omega3_anticoagulant_warning` | `clinical_warning` | `warning` | `omega_3` → `warfarin_selected_anticoagulant` | None | No | `ev_nih_omega3_hp` |

## Active rule details
### `iron_common_oral_meal_timing`
- **Source:** `iron`
- **Target:** `routine:meal`
- **Classification:** `strong_preference`
- **Effect:** `prefer_empty_stomach`
- **Direction:** `asymmetric`
- **Machine timing:** 30 min source→target / 120 min target→source
- **Overridable:** Yes
- **Conditions:** `[{"type": "supplement_form_is", "supplementId": "iron", "formId": "iron_oral_common"}]`
- **Rationale:** NHS guidance for ferrous sulfate states it works best on an empty stomach, approximately 30 minutes before food or 2 hours after food; food is acceptable if stomach upset occurs.
- **User message:** Iron is usually absorbed better away from food. If taking it without food bothers your stomach, follow your label, pharmacist, or clinician's instructions.
- **Evidence:** `ev_nhs_ferrous_sulfate`

### `iron_vitamin_c_together`
- **Source:** `iron`
- **Target:** `vitamin_c`
- **Classification:** `strong_preference`
- **Effect:** `prefer_together`
- **Direction:** `symmetric`
- **Machine timing:** None
- **Overridable:** Yes
- **Rationale:** Vitamin C can improve nonheme iron absorption, and NHS guidance notes that a clinician or pharmacist may recommend vitamin C with ferrous sulfate.
- **User message:** Vitamin C is paired with iron because vitamin C can support nonheme iron absorption.
- **Evidence:** `ev_nhs_ferrous_sulfate`, `ev_nih_vitamin_c_hp`

### `iron_levothyroxine_240`
- **Source:** `iron`
- **Target:** `levothyroxine`
- **Classification:** `hard_schedule_constraint`
- **Effect:** `require_separation`
- **Direction:** `symmetric`
- **Machine timing:** 240 min symmetric
- **Overridable:** No
- **Rationale:** Authoritative drug guidance advises at least four hours between levothyroxine and ferrous sulfate/iron.
- **User message:** Keep iron at least 4 hours away from your levothyroxine time.
- **Evidence:** `ev_nih_iron_hp`, `ev_medlineplus_levothyroxine`

### `iron_ppi_warning`
- **Source:** `iron`
- **Target:** `proton_pump_inhibitor`
- **Classification:** `clinical_warning`
- **Effect:** `warning`
- **Direction:** `symmetric`
- **Machine timing:** None
- **Overridable:** No
- **Rationale:** Proton-pump inhibitors reduce gastric acidity and can reduce nonheme iron absorption; authoritative sources do not establish a universal timing interval that solves this issue.
- **User message:** A proton-pump inhibitor may affect iron absorption. NutriClock will not invent a separation interval; follow your pharmacist or clinician's guidance.
- **Evidence:** `ev_nih_iron_hp`

### `iron_levodopa_warning`
- **Source:** `iron`
- **Target:** `levodopa`
- **Classification:** `clinical_warning`
- **Effect:** `warning`
- **Direction:** `symmetric`
- **Machine timing:** None
- **Overridable:** No
- **Rationale:** Iron can reduce levodopa absorption/availability, but the approved V1 evidence does not establish one universal supplement scheduling interval for NutriClock to enforce.
- **User message:** Iron may interact with levodopa. NutriClock will not change either regimen; check your prescription instructions or pharmacist guidance.
- **Evidence:** `ev_nih_iron_hp`

### `vitamin_d3_fat_meal`
- **Source:** `vitamin_d3`
- **Target:** `routine:meal`
- **Classification:** `strong_preference`
- **Effect:** `prefer_meal_characteristic`
- **Direction:** `symmetric`
- **Machine timing:** None
- **Overridable:** Yes
- **Conditions:** `[{"type": "meal_contains_dietary_fat", "value": true}]`
- **Rationale:** The concurrent presence of dietary fat enhances vitamin D absorption, although vitamin D is still absorbed without dietary fat.
- **User message:** When practical, Vitamin D3 is placed with a meal you marked as containing dietary fat.
- **Evidence:** `ev_nih_vitamin_d_hp`

### `vitamin_b12_ppi_warning`
- **Source:** `vitamin_b12`
- **Target:** `proton_pump_inhibitor`
- **Classification:** `clinical_warning`
- **Effect:** `warning`
- **Direction:** `symmetric`
- **Machine timing:** None
- **Overridable:** No
- **Rationale:** Gastric acid inhibitors can interfere with absorption of food-bound vitamin B12; no universal timing interval is established in the approved source.
- **User message:** Proton-pump inhibitors can affect vitamin B12 status. NutriClock does not treat this as a timing problem.
- **Evidence:** `ev_nih_vitamin_b12_hp`

### `vitamin_b12_metformin_warning`
- **Source:** `vitamin_b12`
- **Target:** `metformin`
- **Classification:** `clinical_warning`
- **Effect:** `warning`
- **Direction:** `symmetric`
- **Machine timing:** None
- **Overridable:** No
- **Rationale:** Metformin may reduce vitamin B12 absorption and serum vitamin B12 concentrations; this is not solved by an invented dose-separation interval.
- **User message:** Metformin can affect vitamin B12 status. NutriClock does not change either regimen or invent a separation interval.
- **Evidence:** `ev_nih_vitamin_b12_hp`

### `calcium_carbonate_with_food`
- **Source:** `calcium`
- **Target:** `routine:meal`
- **Classification:** `strong_preference`
- **Effect:** `prefer_with_food`
- **Direction:** `symmetric`
- **Machine timing:** None
- **Overridable:** Yes
- **Conditions:** `[{"type": "supplement_form_is", "supplementId": "calcium", "formId": "calcium_carbonate"}]`
- **Rationale:** Calcium carbonate absorption is more dependent on stomach acid and is improved when taken with a meal.
- **User message:** Calcium carbonate is placed with food when practical.
- **Evidence:** `ev_nih_calcium_hp`

### `calcium_over_500mg_information`
- **Source:** `calcium`
- **Target:** `calcium`
- **Classification:** `informational`
- **Effect:** `informational`
- **Direction:** `symmetric`
- **Machine timing:** None
- **Overridable:** No
- **Conditions:** `[{"type": "dose_at_least", "supplementId": "calcium", "amount": 500.000001, "unit": "mg", "basis": "elemental"}]`
- **Rationale:** NIH notes that the percentage of calcium absorbed from supplements is highest with doses of 500 mg or less at one time. NutriClock must not split or change the entered dose.
- **User message:** Calcium absorption percentage tends to be higher at 500 mg or less at one time. NutriClock will not change your dose; ask a clinician or pharmacist if you have questions about splitting it.
- **Evidence:** `ev_nih_calcium_hp`

### `calcium_carbonate_levothyroxine_240`
- **Source:** `calcium`
- **Target:** `levothyroxine`
- **Classification:** `hard_schedule_constraint`
- **Effect:** `require_separation`
- **Direction:** `symmetric`
- **Machine timing:** 240 min symmetric
- **Overridable:** No
- **Conditions:** `[{"type": "supplement_form_is", "supplementId": "calcium", "formId": "calcium_carbonate"}]`
- **Rationale:** Calcium carbonate can interfere with levothyroxine absorption; authoritative guidance instructs at least four hours of separation.
- **User message:** Keep calcium carbonate at least 4 hours away from your levothyroxine time.
- **Evidence:** `ev_nih_calcium_hp`, `ev_medlineplus_levothyroxine`

### `calcium_quinolone_120`
- **Source:** `calcium`
- **Target:** `quinolone_antibiotic`
- **Classification:** `hard_schedule_constraint`
- **Effect:** `require_separation`
- **Direction:** `symmetric`
- **Machine timing:** 120 min symmetric
- **Overridable:** No
- **Rationale:** NIH guidance states that taking a quinolone antibiotic 2 hours before or 2 hours after calcium supplements prevents the documented absorption effect.
- **User message:** Keep calcium at least 2 hours away from this quinolone antibiotic time.
- **Evidence:** `ev_nih_calcium_hp`

### `dolutegravir_calcium_asymmetric`
- **Source:** `dolutegravir`
- **Target:** `calcium`
- **Classification:** `hard_schedule_constraint`
- **Effect:** `require_separation`
- **Direction:** `asymmetric`
- **Machine timing:** 120 min source→target / 360 min target→source
- **Overridable:** No
- **Rationale:** FDA-label-derived guidance summarized by NIH advises dolutegravir 2 hours before or 6 hours after calcium supplements.
- **User message:** Calcium must be scheduled around your fixed dolutegravir time using the supported 2-hour-before / 6-hour-after rule.
- **Evidence:** `ev_nih_calcium_hp`

### `magnesium_oral_bisphosphonate_120`
- **Source:** `magnesium`
- **Target:** `oral_bisphosphonate`
- **Classification:** `hard_schedule_constraint`
- **Effect:** `require_separation`
- **Direction:** `symmetric`
- **Machine timing:** 120 min symmetric
- **Overridable:** No
- **Rationale:** NIH guidance recommends at least 2 hours between magnesium-rich supplements/medications and oral bisphosphonates.
- **User message:** Keep magnesium at least 2 hours away from this oral bisphosphonate time.
- **Evidence:** `ev_nih_magnesium_hp`

### `magnesium_ppi_warning`
- **Source:** `magnesium`
- **Target:** `proton_pump_inhibitor`
- **Classification:** `clinical_warning`
- **Effect:** `warning`
- **Direction:** `symmetric`
- **Machine timing:** None
- **Overridable:** No
- **Rationale:** Long-term PPI use can cause low magnesium in some people; an arbitrary supplement timing interval does not resolve this issue.
- **User message:** Long-term proton-pump inhibitor use can affect magnesium status. NutriClock does not treat this as a timing problem.
- **Evidence:** `ev_nih_magnesium_hp`

### `zinc_penicillamine_60`
- **Source:** `zinc`
- **Target:** `penicillamine`
- **Classification:** `hard_schedule_constraint`
- **Effect:** `require_separation`
- **Direction:** `symmetric`
- **Machine timing:** 60 min symmetric
- **Overridable:** No
- **Rationale:** Authoritative guidance recommends at least one hour between zinc supplements and penicillamine.
- **User message:** Keep zinc at least 1 hour away from your penicillamine time.
- **Evidence:** `ev_nih_zinc_hp`, `ev_medlineplus_penicillamine`

### `folate_methotrexate_warning`
- **Source:** `folate`
- **Target:** `methotrexate`
- **Classification:** `clinical_warning`
- **Effect:** `warning`
- **Direction:** `symmetric`
- **Machine timing:** None
- **Overridable:** No
- **Rationale:** The relationship between folate and methotrexate depends on clinical context and cannot safely be reduced to a universal timing rule.
- **User message:** Clinical review recommended: folate use with methotrexate depends on why methotrexate was prescribed. NutriClock will not change either regimen.
- **Evidence:** `ev_nih_folate_hp`

### `folate_antiepileptic_warning`
- **Source:** `folate`
- **Target:** `selected_antiepileptic`
- **Classification:** `clinical_warning`
- **Effect:** `warning`
- **Direction:** `symmetric`
- **Machine timing:** None
- **Overridable:** No
- **Rationale:** Certain antiepileptic medicines can affect folate status, and folate supplements can affect serum levels of some antiepileptic medicines.
- **User message:** Folate can have clinically important interactions with some antiepileptic medicines. NutriClock will not try to solve this by moving a dose.
- **Evidence:** `ev_nih_folate_hp`

### `omega3_anticoagulant_warning`
- **Source:** `omega_3`
- **Target:** `warfarin_selected_anticoagulant`
- **Classification:** `clinical_warning`
- **Effect:** `warning`
- **Direction:** `symmetric`
- **Machine timing:** None
- **Overridable:** No
- **Rationale:** Omega-3/fish-oil products can have antiplatelet effects, and patients using anticoagulants may require monitoring; timing separation does not remove the clinical issue.
- **User message:** Omega-3 with warfarin or similar anticoagulants may require monitoring. NutriClock will not invent a separation interval.
- **Evidence:** `ev_nih_omega3_hp`

## Rules requiring approval before activation
| Rule ID | Proposed behavior | Why it remains inactive |
|---|---|---|
| `iron_coffee_120_symmetric` | Prefer keeping iron about 2 hours away from coffee. | Approve the product's symmetric 120-minute interpretation or change this to a directional rule supported by the NHS wording. |
| `iron_tea_120_symmetric` | Prefer keeping iron about 2 hours away from tea. | Approve the symmetric 120-minute interpretation or encode only the explicitly supported direction. |
| `iron_calcium_120_symmetric` | Taking iron and calcium at different times may improve iron absorption. | Product approval is needed before treating 120 minutes as a symmetric machine rule. |
| `magnesium_tetracycline_asymmetric` | Magnesium needs directional separation from this tetracycline antibiotic. | The source states '4 to 6 hours after'; choose an approved exact machine value (e.g. 240 or 360) before activation. |
| `magnesium_quinolone_asymmetric` | Magnesium needs directional separation from this quinolone antibiotic. | The source states '4 to 6 hours after'; approve an exact machine value before activation. |
| `zinc_iron_25mg_same_time` | Avoid taking zinc at the same time as 25 mg or more of elemental supplemental iron. | Add/approve a machine semantic for 'same dosing window' or an exact interval before activation. |
| `zinc_tetracycline_asymmetric` | Zinc needs directional separation from this tetracycline antibiotic. | Approve an exact value for the '4 to 6 hours after' side before activation. |
| `zinc_quinolone_asymmetric` | Zinc needs directional separation from this quinolone antibiotic. | Approve an exact value for the '4 to 6 hours after' side before activation. |
| `vitamin_c_cancer_therapy_warning` | If you are receiving chemotherapy or radiation therapy, discuss vitamin C supplements with your oncology team. | The approved V1 MedicationId catalog does not currently include a cancer-therapy entity/category. |
| `vitamin_d3_orlistat_warning` | Orlistat can reduce vitamin D absorption. NutriClock will not invent a timing fix. | The approved V1 MedicationId catalog does not currently include orlistat. |
| `vitamin_d3_thiazide_warning` | Vitamin D with a thiazide diuretic may require clinical review in some situations. | The approved V1 MedicationId catalog does not currently include thiazide diuretics. |
| `calcium_lithium_warning` | Calcium with lithium may require clinical review. NutriClock will not treat this as a timing problem. | The approved V1 MedicationId catalog does not currently include lithium. |
| `folate_sulfasalazine_warning` | Sulfasalazine can affect folate absorption. NutriClock will not invent a timing interval. | The approved V1 MedicationId catalog does not currently include sulfasalazine. |

## Evidence registry
| Evidence ID | Organization | Source | Reviewed | Locator |
|---|---|---|---|---|
| `ev_nih_iron_hp` | NIH Office of Dietary Supplements | [Iron — Health Professional Fact Sheet](https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/) | 2026-09-03 | Interactions with Medications; iron absorption context |
| `ev_nih_vitamin_c_hp` | NIH Office of Dietary Supplements | [Vitamin C — Health Professional Fact Sheet](https://ods.od.nih.gov/factsheets/VitaminC-HealthProfessional/) | 2026-09-03 | Introduction; Interactions with Medications |
| `ev_nih_vitamin_d_hp` | NIH Office of Dietary Supplements | [Vitamin D — Health Professional Fact Sheet](https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/) | 2026-09-03 | Absorption; Interactions with Medications |
| `ev_nih_vitamin_b12_hp` | NIH Office of Dietary Supplements | [Vitamin B12 — Health Professional Fact Sheet](https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/) | 2026-09-03 | Interactions with Medications |
| `ev_nih_calcium_hp` | NIH Office of Dietary Supplements | [Calcium — Health Professional Fact Sheet](https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional/) | 2026-09-03 | Dietary Supplements; Interactions with Medications |
| `ev_nih_magnesium_hp` | NIH Office of Dietary Supplements | [Magnesium — Health Professional Fact Sheet](https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/) | 2026-09-03 | Interactions with Medications |
| `ev_nih_zinc_hp` | NIH Office of Dietary Supplements | [Zinc — Health Professional Fact Sheet](https://ods.od.nih.gov/factsheets/Zinc-HealthProfessional/) | 2026-09-03 | Supplement interactions; Interactions with Medications |
| `ev_nih_folate_hp` | NIH Office of Dietary Supplements | [Folate — Health Professional Fact Sheet](https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/) | 2026-09-03 | Interactions with Medications |
| `ev_nih_omega3_hp` | NIH Office of Dietary Supplements | [Omega-3 Fatty Acids — Health Professional Fact Sheet](https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional/) | 2026-09-03 | Interactions with Medications — Warfarin and similar anticoagulants |
| `ev_nhs_ferrous_sulfate` | NHS | [How and when to take ferrous sulfate](https://www.nhs.uk/medicines/ferrous-sulfate/how-and-when-to-take-ferrous-sulfate/) | 2026-09-03 | How to take it |
| `ev_medlineplus_levothyroxine` | MedlinePlus / U.S. National Library of Medicine | [Levothyroxine: Drug Information](https://medlineplus.gov/druginfo/meds/a682461.html) | 2026-09-03 | Special precautions — calcium carbonate and ferrous sulfate |
| `ev_medlineplus_iron_use` | MedlinePlus / U.S. National Library of Medicine | [Taking iron supplements](https://medlineplus.gov/ency/article/007478.htm) | 2026-09-03 | Administration with calcium, milk, caffeine, medications |
| `ev_medlineplus_penicillamine` | MedlinePlus / U.S. National Library of Medicine | [Penicillamine: Drug Information](https://medlineplus.gov/druginfo/meds/a618021.html) | 2026-09-03 | Special precautions — iron and zinc-containing products |
| `ev_medlineplus_tetracycline` | MedlinePlus / U.S. National Library of Medicine | [Tetracycline: Drug Information](https://medlineplus.gov/druginfo/meds/a682098.html) | 2026-09-03 | Special precautions — calcium, zinc, magnesium, and iron |

## Important implementation notes
### 1. Exact machine values vs display copy

Machine timing is exact. User copy may say “about 2 hours” or “about 4 hours,” but an active rule uses exact integer minute values.

### 2. Elemental iron

Any rule depending on an elemental-iron threshold must activate only when the entered iron dose basis is explicitly `elemental`. Product-label compound amounts such as ferrous sulfate weight must not be converted to elemental iron by inference.

### 3. Calcium >500 mg informational rule

NIH states that calcium absorption percentage is highest at doses of 500 mg or less. NutriClock must **not** split or change a user-entered dose. The rule is informational only.

### 4. Flexible timing

Vitamin B12, magnesium, folate, and omega-3 have no universal morning/evening timing rule in V1. In the absence of another active rule, they may return flexible timing.

### 5. Unsupported medications

A medication can still be stored as a fixed user-entered anchor even when NutriClock has no approved rule for it. The app must say coverage is unsupported/limited, never “no interaction.”

### 6. Review-required rules

Codex must load only `status: "active"` rules. `RULE_REVIEW_REQUIRED` entries are documentation and future review inputs only.

## Product/rules review checklist
Before changing any `RULE_REVIEW_REQUIRED` rule to `active`, confirm:

- the exact machine interval or same-window semantic;
- directionality;
- rule classification;
- effect;
- applicability conditions;
- whether override is permitted;
- evidence IDs;
- user-facing copy;
- boundary tests;
- at least one golden/integration scenario when the rule materially affects scheduling.

Semantic changes require a ruleset version bump.
