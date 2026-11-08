import { FORM5_FIELDS, type Form5Values } from "@/lib/domain/form5-spec"
import { defineRules, type Rule } from "@/lib/domain/rules/engine"

/**
 * The automated checks and remarks of sections 8 and 9 of Verohallinto's 2026
 * data file specification for Form 5, over the fields the book fills. Each
 * rule's `source` is the check's number in the specification. A breach lists
 * the codes involved. The double-entry equity checks (743, #806 and #410) are
 * not here, since the book is single-entry and never writes 916. A check that
 * asks for a field to be present, such as #424 or #839, is kept by the file
 * writer, which always writes those fields.
 */
export interface Form5Breach {
  codes: readonly number[]
}

type Form5Rule = Rule<Form5Values, Form5Breach>

/** A percentage field (`D3,2`) holds hundredths, so 100 % is 10 000. */
const PERCENT_100 = 10_000

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
  /*
   * The specification asks for at most 25 %. A remaining balance of 1 200 € or
   * less may be depreciated at once (EVL 30 §), which this remark still flags,
   * as OmaVero does.
   */
  rule(
    "depreciationMaximum",
    1410,
    "warn",
    [800, 801, 802, 804],
    (v) => 4 * v(804) <= Math.max(0, v(800) + v(801) - v(802))
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
  /*
   * Private use of a car is entered as the driving details: 396 is 1 when the
   * private share was deducted in the books, and 313 is then the private share
   * of the costs (382), which the specification requires to match.
   */
  rule("carDetail", 1882, "blocker", [313, 271, 273, 381, 396], (v) =>
    v(313) > 0 ? v(396) === 1 && v(273) > 0 && v(381) > 0 : true
  ),
  rule("carPrivateShare", 824, "blocker", [313, 382, 396], (v) =>
    v(396) === 1 ? v(313) > 0 && v(313) === v(382) : true
  ),
  rule("carTotalDistance", 825, "blocker", [389, 390], (v) =>
    v(390) > 0 ? v(389) >= v(390) : true
  ),
  rule("netWorthShares", 408, "blocker", [369, 370], (v) =>
    v(369) !== 0 || v(370) !== 0 ? v(369) + v(370) === PERCENT_100 : true
  ),
  rule("workShares", 409, "blocker", [371, 372], (v) =>
    v(371) !== 0 || v(372) !== 0 ? v(371) + v(372) === PERCENT_100 : true
  ),
  /*
   * A field in the specification's `R` or `+` format takes no minus sign. The
   * result is the one that can go wrong, which is why 358 and 359 are split.
   */
  {
    id: "form5.unsigned",
    severity: "blocker",
    source: "Form 5 spec 2026 section 7, format",
    check: (v) => {
      const negative = FORM5_FIELDS.filter(
        (field) =>
          (field.format.startsWith("R") || field.format.startsWith("+")) &&
          v(field.code) < 0
      ).map((field) => field.code)
      return negative.length > 0 ? [{ codes: negative }] : []
    },
  },
  rule(
    "listedCooperative",
    2048,
    "warn",
    [325, 326],
    (v) => v(325) === 0 && v(326) === 0
  ),
  rule("listedDividend", 1321, "warn", [319, 320], (v) => v(319) >= v(320)),
  rule("otherDividend", 1455, "warn", [321, 322], (v) => v(321) >= v(322)),
  rule("surplusShare", 1322, "warn", [327, 328], (v) =>
    v(327) > 0 ? 4 * v(328) >= v(327) : true
  ),
])
