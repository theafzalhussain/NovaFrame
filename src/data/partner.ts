/* ================================================================
   Student Partner & Campus Ambassador program — shared definitions
   ----------------------------------------------------------------
   Imported by the React site and the Express API, so validation
   lists and the calculator's maths stay identical on both sides.
   Money in this program is always integer paise (₹1 = 100 paise).
   ================================================================ */

/** States and union territories of India, plus a catch-all for students abroad. */
export const REGIONS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
  "Outside India",
] as const;

export const YEARS_OF_STUDY = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "Postgraduate", "Recent graduate"] as const;

export const PARTNER_STATUSES = ["active", "suspended"] as const;
export const PARTNER_TIERS = ["partner", "ambassador"] as const;
export const APPLICATION_STATUSES = ["pending", "approved", "rejected"] as const;
export const CLIENT_PAYMENT_STATUSES = ["pending", "verified", "rejected", "refunded"] as const;
export const PAYOUT_STATUSES = ["requested", "paid", "rejected"] as const;
export const PAYMENT_METHODS = ["UPI", "Bank transfer", "Card", "Cash", "Cheque", "Razorpay", "Other"] as const;

export type PartnerStatus = (typeof PARTNER_STATUSES)[number];
export type PartnerTier = (typeof PARTNER_TIERS)[number];

/** Public program terms (served by GET /api/partners/config; these are the fallbacks). */
export type PartnerConfig = {
  commissionPercent: number;
  holdDays: number;
  minPayout: number; // rupees
  attributionDays: number;
};

export const DEFAULT_PARTNER_CONFIG: PartnerConfig = { commissionPercent: 20, holdDays: 7, minPayout: 500, attributionDays: 180 };

/* ------------------------------------------------------------------ */
/* Validation patterns                                                */
/* ------------------------------------------------------------------ */
export const UPI_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const ACCOUNT_RE = /^\d{9,18}$/;
export const REFERRAL_RE = /^[A-Z0-9]{4,16}$/;

/** At least 8 characters with a letter and a number. */
export function partnerPasswordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 200) return "That password is too long.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Mix letters and numbers.";
  return null;
}

/* ------------------------------------------------------------------ */
/* Commission maths (the server applies the same rule in SQL)         */
/* ------------------------------------------------------------------ */
/** Commission on one payment: floor(paise × percent / 100), never fractional paise. */
export function commissionPaise(basePaise: number, percent: number) {
  const bps = Math.round(percent * 100);
  return Math.floor((Math.max(0, Math.round(basePaise)) * bps) / 10_000);
}

export type InstallmentPlan = { id: string; label: string; split: number[] };

/** Common billing schedules. Splits are percentages that add up to 100. */
export const INSTALLMENT_PLANS: InstallmentPlan[] = [
  { id: "full", label: "Full payment", split: [100] },
  { id: "50-50", label: "2 installments", split: [50, 50] },
  { id: "40-30-30", label: "3 installments", split: [40, 30, 30] },
  { id: "25x4", label: "4 installments", split: [25, 25, 25, 25] },
];

/**
 * Splits a project value into installments (in paise). The last installment takes the
 * rounding remainder, so the parts always add up to the full value.
 */
export function splitInstallments(totalPaise: number, split: number[]) {
  const total = Math.max(0, Math.round(totalPaise));
  let used = 0;
  return split.map((pct, i) => {
    const part = i === split.length - 1 ? total - used : Math.floor((total * pct) / 100);
    used += part;
    return part;
  });
}
