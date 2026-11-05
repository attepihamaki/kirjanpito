import type { Form5Values } from "@/lib/domain/form5-spec"
import { defineRules, type Rule } from "@/lib/domain/rules/engine"

/**
 * The automated checks and remarks of sections 8 and 9 of Verohallinto's 2026
 * data file specification for Form 5, over the fields the book fills. Each
 * rule's `source` is the check's number in the specification. A breach lists
 * the codes involved. Checks on a field the book never fills (the car use
 * detail, the double-entry equity, the spouse split) are not here, since they
 * hold trivially.
 */
export interface Form5Breach {
  codes: readonly number[]
}

type Form5Rule = Rule<Form5Values, Form5Breach>

function sumRule(
  total: number,
  parts: readonly number[],
  number: number
): Form5Rule {
  return {
    id: `form5.${total}`,
    severity: "blocker",
    source: `Form 5 spec 2026 #${number}`,
    check: (v) =>
      v(total) === parts.reduce((acc, code) => acc + v(code), 0)
        ? []
        : [{ codes: [total, ...parts] }],
  }
}

function rule(
  id: string,
  number: number,
  severity: Form5Rule["severity"],
  codes: readonly number[],
  holds: (v: Form5Values) => boolean
): Form5Rule {
  return {
    id: `form5.${id}`,
    severity,
    source: `Form 5 spec 2026 #${number}`,
    check: (v) => (holds(v) ? [] : [{ codes }]),
  }
}

export const FORM5_RULES = defineRules<Form5Values, Form5Breach>([
  sumRule(
    316,
    [300, 318, 301, 313, 314, 315, 320, 322, 326, 328, 323, 312, 324],
    1411
  ),
  sumRule(
    355,
    [333, 334, 335, 336, 338, 342, 343, 344, 347, 349, 353, 364, 354],
    1034
  ),
  rule("entertainmentPortion", 399, "blocker", [341, 342], (v) =>
    v(341) > 0 ? v(342) > 0 : true
  ),
  rule(
    "entertainmentHalf",
    834,
    "blocker",
    [341, 342],
    (v) => 2 * v(342) <= v(341)
  ),
  rule("entertainmentBase", 836, "blocker", [341, 342], (v) =>
    v(342) > 0 ? v(341) > 0 : true
  ),
  rule("interestPortion", 837, "blocker", [346, 347], (v) =>
    v(347) > 0 ? v(346) > 0 && v(347) <= v(346) : true
  ),
  rule(
    "additionalDeductions",
    402,
    "blocker",
    [364, 388, 392],
    (v) => v(364) === v(388) + v(392)
  ),
  rule("additionalDeductionsGiven", 401, "blocker", [364, 388, 392], (v) =>
    v(364) > 0 ? v(388) > 0 || v(392) > 0 : true
  ),
  rule(
    "result",
    403,
    "blocker",
    [316, 355, 358, 359],
    (v) => v(358) - v(359) === v(316) - v(355)
  ),
  rule(
    "resultOnce",
    802,
    "blocker",
    [358, 359],
    (v) => v(358) === 0 || v(359) === 0
  ),
  rule(
    "depreciationClosing",
    1456,
    "blocker",
    [800, 801, 802, 804, 805, 806],
    (v) =>
      v(800) + v(801) >= v(802)
        ? v(806) === v(800) + v(801) - v(802) - v(804) - v(805)
        : true
  ),
  rule("depreciationHasBase", 425, "blocker", [800, 801, 804], (v) =>
    v(804) > 0 ? v(800) > 0 || v(801) > 0 : true
  ),
  rule(
    "depreciationMaximum",
    1410,
    "warn",
    [800, 801, 802, 804],
    (v) => 4 * v(804) <= v(800) + v(801) - v(802)
  ),
  sumRule(718, [703, 704, 705, 706, 708, 709, 714, 745, 711, 716], 25),
  rule(
    "adjustedDeficit",
    1406,
    "blocker",
    [747, 749, 750],
    (v) => v(747) <= v(749) + v(750)
  ),
  rule(
    "netWorthOnce",
    991,
    "blocker",
    [733, 734],
    (v) => v(733) === 0 || v(734) === 0
  ),
  rule(
    "operatingReserve",
    1320,
    "blocker",
    [871, 394],
    (v) => 10 * v(871) <= 3 * v(394)
  ),
  rule("listedDividend", 1321, "warn", [319, 320], (v) => v(319) >= v(320)),
  rule("otherDividend", 1455, "warn", [321, 322], (v) => v(321) >= v(322)),
  rule("surplusShare", 1322, "warn", [327, 328], (v) =>
    v(327) > 0 ? 4 * v(328) >= v(327) : true
  ),
])
