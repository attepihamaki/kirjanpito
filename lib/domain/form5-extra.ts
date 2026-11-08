import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
import { form5Label } from "@/lib/domain/form5-spec"
import type { YearEnd } from "@/lib/domain/form5-balance"
import type { TaxFormRow, TaxFormSection } from "@/lib/domain/tax-form"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

/**
 * The parts of Form 5 that need more than the book's entries (§8.8): the
 * driving details behind the private use of a car, the interest that negative
 * equity makes non-deductible, the owner's transfers, and the few choices and
 * claims the form offers. What the user types in is a `YearEnd`.
 */

/* -------------------------------------------------------------------------
 * Private use of a car (313, 271 to 275, 379 to 382, 396)
 * ---------------------------------------------------------------------- */

export interface CarUse {
  /** 271. */
  business: number
  /** 273. */
  private: number
  /** 274. */
  total: number
  /** 381. */
  costs: Cents
  /** 275: the cost of a kilometre, to the cent. */
  perKm: Cents
  /** 382: the private kilometres' share of the costs, which 313 must equal. */
  privateShare: Cents
}

/** The car's figures, or null while the private kilometres or the costs are missing. */
export function carUse(y: YearEnd): CarUse | null {
  const total = y.carKmBusiness + y.carKmPrivate
  if (y.carKmPrivate <= 0 || y.carCosts <= 0 || total <= 0) return null
  return {
    business: y.carKmBusiness,
    private: y.carKmPrivate,
    total,
    costs: y.carCosts,
    perKm: Math.round(y.carCosts / total),
    privateShare: Math.round((y.carCosts * y.carKmPrivate) / total),
  }
}

/* -------------------------------------------------------------------------
 * Interest that negative equity makes non-deductible (EVL 18.2 §)
 * ---------------------------------------------------------------------- */

export interface InterestCalc {
  /** The business's net worth is negative, so 659 to 653 and 383 are asked for. */
  active: boolean
  /** 659: the negative net worth, without its sign. */
  negativeEquity: Cents
  /** 652, and 747 on the balance sheet. */
  adjusted: Cents
  /** 653, in hundredths of a percent. */
  rate: number
  /** 383: the interest that is not deductible, at most the interest paid. */
  disallowed: Cents
  /** 347: the interest that stays deductible. */
  deductible: Cents
  /** Interest was paid and there is an adjusted deficit, but no rate is entered. */
  rateMissing: boolean
}

/**
 * The non-deductible interest: the adjusted negative equity at the base rate
 * plus 1 %, capped at the interest paid (346). The adjusted equity is the
 * negative net worth less revaluations, the year's loss and earlier losses.
 * OmaVero works the figure out itself, so the result is a number to check.
 */
export function interestCalc(
  interest: Cents,
  netWorth: Cents,
  y: YearEnd
): InterestCalc {
  const negativeEquity = Math.max(0, -netWorth)
  const adjusted = Math.max(
    0,
    negativeEquity - y.revaluations - y.yearLoss - y.priorLosses
  )
  const rate = y.interestRate
  const disallowed = Math.min(interest, Math.round((adjusted * rate) / 10_000))
  return {
    active: negativeEquity > 0,
    negativeEquity,
    adjusted,
    rate,
    disallowed,
    deductible: interest - disallowed,
    rateMissing: adjusted > 0 && interest > 0 && rate === 0,
  }
}

/* -------------------------------------------------------------------------
 * The owner's transfers (384, 385)
 * ---------------------------------------------------------------------- */

export interface OwnerTransfers {
  /** 384: money taken out in the calendar year. */
  withdrawals: Cents
  /** 385: money put in. */
  investments: Cents
}

export function ownerTransfers(
  entries: readonly Entry[],
  cats: CategoryMap,
  year: number
): OwnerTransfers {
  const out = { withdrawals: 0, investments: 0 }
  for (const e of entries) {
    if (yearOf(e.date) !== year) continue
    const line = cats.get(e.catId)?.line
    if (line === "owner-withdrawal") out.withdrawals += calcEntry(e).gross
    else if (line === "owner-investment") out.investments += calcEntry(e).gross
  }
  return out
}

/* -------------------------------------------------------------------------
 * The sections
 * ---------------------------------------------------------------------- */

export interface ExtraInput {
  yearEnd: YearEnd
  /** 313 as the book holds it. */
  carBooked: Cents
  interest: InterestCalc
  transfers: OwnerTransfers
}

const NUMBER_HINT = {
  fi: "Tämä on luku, ei euromäärä.",
  en: "This is a number, not an amount.",
}

/**
 * The sections of the fields above. A section appears only when it applies, so
 * a check never reads a field the return does not carry.
 */
export function form5ExtraSections(input: ExtraInput): TaxFormSection[] {
  const { yearEnd: y, interest } = input
  const field = (
    code: number,
    en: string,
    value: number,
    unit?: "number" | "percent"
  ): TaxFormRow => ({
    kind: "field",
    code: String(code),
    label: { fi: form5Label(code), en },
    value,
    portion: false,
    total: false,
    unused: false,
    unit,
    hint: unit === "number" ? NUMBER_HINT : undefined,
  })
  const sections: TaxFormSection[] = []

  const car = carUse(y)
  if (car || input.carBooked > 0) {
    const rows: TaxFormRow[] = []
    if (y.carVehicle) {
      rows.push(field(379, "The fixed assets include", y.carVehicle, "number"))
    }
    rows.push(
      field(271, "Business driving (km)", y.carKmBusiness, "number"),
      field(273, "Private driving (km)", y.carKmPrivate, "number"),
      field(274, "Total kilometres", car?.total ?? 0, "number"),
      field(381, "Total costs", car?.costs ?? 0),
      field(275, "Average cost per kilometre", car?.perKm ?? 0),
      field(382, "Private share of the costs", car?.privateShare ?? 0)
    )
    if (y.carBasis) {
      rows.push(
        field(380, "The car details are based on", y.carBasis, "number")
      )
    }
    rows.push(
      field(396, "Private driving costs", input.carBooked > 0 ? 1 : 2, "number")
    )
    sections.push({
      number: "",
      title: {
        fi: "Auton ja muiden ajoneuvojen käyttö",
        en: "Use of a car and other vehicles",
      },
      rows,
    })
  }

  if (interest.active && interest.adjusted > 0) {
    sections.push({
      number: "",
      title: {
        fi: "Laskelma vähennyskelvottomista korkokuluista",
        en: "Non-deductible interest",
      },
      rows: [
        field(
          659,
          "Negative equity per the balance sheet",
          interest.negativeEquity
        ),
        field(677, "Revaluations in equity", y.revaluations),
        field(650, "Loss of the year", y.yearLoss),
        field(651, "Earlier losses", y.priorLosses),
        field(652, "Adjusted negative equity", interest.adjusted),
        field(653, "Base rate + 1 %", interest.rate, "percent"),
        field(383, "Interest that is not deductible", interest.disallowed),
      ],
    })
  }

  const transferRows: TaxFormRow[] = []
  if (input.transfers.withdrawals > 0) {
    transferRows.push(field(384, "Withdrawals", input.transfers.withdrawals))
  }
  if (input.transfers.investments > 0) {
    transferRows.push(field(385, "Investments", input.transfers.investments))
  }
  if (transferRows.length > 0) {
    sections.push({
      number: "",
      title: {
        fi: "Rahan nostot ja sijoitukset kirjanpidon mukaan",
        en: "Money taken out and put in",
      },
      rows: transferRows,
    })
  }

  const otherRows: TaxFormRow[] = []
  if (y.operatingReserve > 0) {
    otherRows.push(field(871, "Operating reserve", y.operatingReserve))
  }
  if (y.lossToCapital > 0) {
    otherRows.push(
      field(373, "Loss to deduct from capital income", y.lossToCapital)
    )
  }
  if (y.incomeSplit > 0) {
    otherRows.push(
      field(395, "Claim for the business income split", y.incomeSplit, "number")
    )
  }
  if (otherRows.length > 0) {
    sections.push({
      number: "",
      title: { fi: "Muut tiedot", en: "Other details" },
      rows: otherRows,
    })
  }

  return sections
}
