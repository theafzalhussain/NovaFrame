/**
 * Student Partner program — browser client
 * ----------------------------------------
 * Public program endpoints, the session-authenticated partner portal and the admin
 * console's partner tools. Every call goes to the live API only (no offline fallback):
 * money and accounts must never be simulated in the browser.
 */
import { DEFAULT_PARTNER_CONFIG, type PartnerConfig, type PartnerStatus, type PartnerTier } from "../data/partner";
import { clearPartnerToken, request, setPartnerToken } from "./api";

const live = { fallback: false } as const;

/* ------------------------------------------------------------------ */
/* Formatting                                                         */
/* ------------------------------------------------------------------ */
const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const rupeesExact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹2,000 or ₹2,000.10 — paise are shown only when there are some. */
export function formatPaise(paise: number) {
  const value = (paise || 0) / 100;
  return Number.isInteger(value) ? rupees.format(value) : rupeesExact.format(value);
}

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
export type Wallet = {
  heldPaise: number;
  availablePaise: number;
  requestedPaise: number;
  paidOutPaise: number;
  lifetimePaise: number;
  reversedPaise?: number;
  currency?: "INR";
};

export type PartnerProfile = {
  id: number;
  partnerCode: string;
  referralCode: string;
  fullName: string;
  email: string;
  phone: string;
  college: string;
  course: string;
  graduationYear: number | null;
  city: string;
  region: string;
  tier: PartnerTier;
  status: PartnerStatus;
  showOnLeaderboard: boolean;
  createdAt: string;
  payout: { upiId: string; bankAccountName: string; bankAccountMasked: string; bankIfsc: string; panMasked: string };
};

export type PartnerMe = {
  partner: PartnerProfile;
  wallet: Wallet;
  stats: { leads: number; converted: number; clicks: number; rank: number | null };
  ambassadorStatus: "pending" | "approved" | "rejected" | null;
  program: PartnerConfig;
};

export type PartnerLead = {
  id: number;
  reference: string;
  client: string;
  company: string;
  email: string;
  service: string;
  stage: "submitted" | "in_discussion" | "converted" | "closed";
  via: "submitted" | "referral_link";
  paidPaise: number;
  installments: number;
  commissionPaise: number;
  createdAt: string;
};

export type Commission = {
  id: number;
  amountPaise: number;
  basePaise: number;
  rateBps: number;
  status: "earned" | "reversed";
  state: "held" | "available" | "reversed";
  availableAt: string;
  createdAt: string;
  reversedReason: string | null;
  installment: string | null;
  paymentReference: string;
  paidOn: string | null;
  clientName: string;
};

export type Payout = {
  id: number;
  reference: string;
  amountPaise: number;
  method: "upi" | "bank";
  destination: string;
  status: "requested" | "paid" | "rejected";
  utr: string | null;
  note: string | null;
  requestedAt: string;
  processedAt: string | null;
};

export type AmbassadorApplication = {
  id: number;
  college: string;
  yearOfStudy: string;
  motivation: string;
  reach: string;
  socialLinks: string | null;
  status: "pending" | "approved" | "rejected";
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type LeaderboardEntry = {
  rank: number;
  name: string;
  college: string;
  region: string;
  tier: PartnerTier;
  earnedPaise: number;
  leads: number;
  converted: number;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  college: string;
  course?: string;
  graduationYear?: number | null;
  city?: string;
  region: string;
  upiId?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  pan?: string;
  acceptTerms: boolean;
  ambassador?: { yearOfStudy: string; motivation: string; reach: string; socialLinks?: string } | null;
  website?: string; // honeypot
};

export type LeadPayload = { name: string; email: string; phone?: string; companyName?: string; service?: string; budget?: string; details: string };
export type ApplicationPayload = { college?: string; yearOfStudy: string; motivation: string; reach: string; socialLinks?: string };

/* ------------------------------------------------------------------ */
/* Public + partner endpoints                                         */
/* ------------------------------------------------------------------ */
type AuthResult = { token: string; expiresAt: string; partner: PartnerProfile; wallet?: Wallet; ambassadorApplied?: boolean };

export const partnerApi = {
  config: async (): Promise<PartnerConfig> => {
    const res = await request<PartnerConfig>("GET", "/partners/config", undefined, { ...live, timeoutMs: 5000 });
    return res.ok && res.data ? res.data : DEFAULT_PARTNER_CONFIG;
  },
  leaderboard: (period: "month" | "all") =>
    request<{ period: string; updatedAt: string; entries: LeaderboardEntry[] }>("GET", `/partners/leaderboard?period=${period}`, undefined, live),

  async register(payload: RegisterPayload) {
    const res = await request<AuthResult>("POST", "/partners/register", payload, { ...live, timeoutMs: 15000 });
    if (res.ok && res.data?.token) setPartnerToken(res.data.token);
    return res;
  },
  async login(email: string, password: string) {
    const res = await request<AuthResult>("POST", "/partners/login", { email, password }, { ...live, timeoutMs: 15000 });
    if (res.ok && res.data?.token) setPartnerToken(res.data.token);
    return res;
  },
  async logout() {
    await request("POST", "/partner/logout");
    clearPartnerToken();
  },

  me: () => request<PartnerMe>("GET", "/partner/me"),
  updateProfile: (patch: Partial<Pick<PartnerProfile, "fullName" | "phone" | "college" | "course" | "graduationYear" | "city" | "region" | "showOnLeaderboard">>) =>
    request<PartnerProfile>("PATCH", "/partner/me", patch),
  updatePayout: (payload: {
    currentPassword: string;
    upiId?: string;
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    pan?: string;
    removeBank?: boolean;
  }) => request<PartnerProfile>("PUT", "/partner/payout-details", payload),
  changePassword: (currentPassword: string, newPassword: string) => request("POST", "/partner/password", { currentPassword, newPassword }),

  leads: () => request<PartnerLead[]>("GET", "/partner/leads"),
  submitLead: (payload: LeadPayload) => request<{ id: number; reference: string }>("POST", "/partner/leads", payload),
  earnings: () => request<{ wallet: Wallet; program: PartnerConfig; commissions: Commission[]; payouts: Payout[] }>("GET", "/partner/earnings"),
  requestPayout: (payload: { amount?: number; all?: boolean; method: "upi" | "bank" }) =>
    request<{ reference: string; amountPaise: number; destination: string; wallet: Wallet }>("POST", "/partner/payouts", payload),
  applications: () => request<AmbassadorApplication[]>("GET", "/partner/ambassador"),
  apply: (payload: ApplicationPayload) => request<{ id: number; status: string }>("POST", "/partner/ambassador", payload),
};

/* ------------------------------------------------------------------ */
/* Admin endpoints                                                    */
/* ------------------------------------------------------------------ */
export type AdminPartner = Omit<PartnerProfile, "payout"> & {
  payout: { upiId: string; bankAccountName: string; bankAccountNumber: string; bankIfsc: string; pan: string };
  suspendedReason: string | null;
  suspendedAt: string | null;
  flags: string[];
  adminNotes: string;
  signupIp: string | null;
  lastLoginAt: string | null;
  updatedAt: string;
};
export type AdminPartnerRow = AdminPartner & { leads: number; converted: number; wallet: Wallet };

export type AdminPartnerDetail = {
  partner: AdminPartner;
  wallet: Wallet;
  clicks: number;
  leads: { id: number; reference: string; name: string; email: string; service: string; status: string; source: string; createdAt: string; paidPaise: number }[];
  commissions: (Omit<Commission, "state" | "paidOn"> & { clientName: string })[];
  payouts: (Payout & { processedBy: string | null })[];
  applications: (AmbassadorApplication & { reviewedBy: string | null })[];
};

export type AdminPartnerLead = {
  id: number;
  reference: string;
  name: string;
  companyName: string | null;
  email: string;
  phone: string | null;
  service: string;
  budget: string;
  status: string;
  source: string;
  valueEstimate: number | null;
  details: string;
  createdAt: string;
  partnerId: number;
  partnerName: string;
  partnerCode: string;
  college: string;
  region: string;
  partnerStatus: PartnerStatus;
  paidPaise: number;
  commissionPaise: number;
};

export type ClientPayment = {
  id: number;
  reference: string;
  enquiryId: number | null;
  partnerId: number | null;
  clientName: string;
  clientEmail: string | null;
  amountPaise: number;
  currency: string;
  installment: string | null;
  method: string | null;
  externalRef: string | null;
  paidOn: string | null;
  source: "manual" | "razorpay";
  status: "pending" | "verified" | "rejected" | "refunded";
  recordedBy: string | null;
  recordedById: number | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  notes: string | null;
  createdAt: string;
  leadReference: string | null;
  partnerName: string | null;
  partnerCode: string | null;
  college: string | null;
  commissionId: number | null;
  commissionPaise: number | null;
  commissionStatus: "earned" | "reversed" | null;
};

export type AdminPayout = Payout & {
  partnerId: number;
  partnerName: string;
  partnerCode: string;
  college: string;
  region: string;
  partnerStatus: PartnerStatus;
  flags: string | null;
  processedBy: string | null;
  upiId: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
};

export type AdminCommission = {
  id: number;
  partnerId: number;
  partnerName: string;
  partnerCode: string;
  college: string;
  region: string;
  clientPaymentId: number;
  paymentReference: string;
  clientName: string;
  installment: string | null;
  basePaise: number;
  rateBps: number;
  amountPaise: number;
  status: "earned" | "reversed";
  availableAt: string;
  reversedReason: string | null;
  reversedBy: string | null;
  createdAt: string;
};

export type AdminApplication = AmbassadorApplication & {
  partnerId: number;
  partnerName: string;
  partnerCode: string;
  email: string;
  phone: string;
  region: string;
  tier: PartnerTier;
  partnerStatus: PartnerStatus;
  reviewedBy: string | null;
  leads: number;
};

export type PartnerOverview = {
  program: PartnerConfig;
  kpis: {
    partners: number;
    active: number;
    suspended: number;
    ambassadors: number;
    newThisWeek: number;
    flagged: number;
    leads: number;
    converted: number;
    verifiedRevenuePaise: number;
    pendingPayments: number;
    commissionEarnedPaise: number;
    commissionHeldPaise: number;
    commissionReversedPaise: number;
    payoutsRequested: number;
    payoutsRequestedPaise: number;
    payoutsPaidPaise: number;
    liabilityPaise: number;
    pendingApplications: number;
  };
  colleges: { label: string; value: number }[];
  regions: { label: string; value: number }[];
};

export type PartnerFilters = { q?: string; college?: string; region?: string; status?: string; tier?: string; flagged?: boolean };
export type PaymentInput = { enquiryId: number; amount: number; installmentLabel?: string; method?: string; externalRef?: string; paidOn?: string; notes?: string };

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && v !== false) search.set(k, v === true ? "1" : String(v));
  const s = search.toString();
  return s ? `?${s}` : "";
};

export const partnerAdmin = {
  overview: () => request<PartnerOverview>("GET", "/admin/partners/overview"),
  list: (filters: PartnerFilters = {}) =>
    request<{ partners: AdminPartnerRow[]; facets: { colleges: string[]; regions: string[] } }>("GET", `/admin/partners${qs(filters)}`),
  detail: (id: number) => request<AdminPartnerDetail>("GET", `/admin/partners/${id}`),
  create: (payload: Record<string, unknown>) => request<AdminPartner>("POST", "/admin/partners", payload),
  update: (id: number, patch: Record<string, unknown>) => request<AdminPartner>("PATCH", `/admin/partners/${id}`, patch),
  suspend: (id: number, payload: { reason: string; reverseHeld: boolean; rejectPayouts: boolean }) =>
    request<{ partner: AdminPartner; wallet: Wallet }>("POST", `/admin/partners/${id}/suspend`, payload),
  reactivate: (id: number) => request<AdminPartner>("POST", `/admin/partners/${id}/reactivate`, {}),
  remove: (id: number) => request("DELETE", `/admin/partners/${id}`),

  leads: (filters: { partnerId?: number; college?: string; region?: string } = {}) => request<AdminPartnerLead[]>("GET", `/admin/partner-leads${qs(filters)}`),
  createLead: (payload: LeadPayload & { partnerId: number }) => request<{ id: number; reference: string }>("POST", "/admin/partner-leads", payload),
  updateLead: (id: number, patch: { partnerId?: number | null; status?: string }) => request("PATCH", `/admin/partner-leads/${id}`, patch),
  removeLead: (id: number) => request("DELETE", `/admin/partner-leads/${id}`),

  payments: (filters: { status?: string; partnerId?: number } = {}) => request<ClientPayment[]>("GET", `/admin/client-payments${qs(filters)}`),
  recordPayment: (payload: PaymentInput) => request<ClientPayment>("POST", "/admin/client-payments", payload),
  updatePayment: (id: number, patch: Partial<PaymentInput>) => request<ClientPayment>("PATCH", `/admin/client-payments/${id}`, patch),
  verifyPayment: (id: number) => request<ClientPayment>("POST", `/admin/client-payments/${id}/verify`, {}),
  rejectPayment: (id: number, reason: string) => request<ClientPayment>("POST", `/admin/client-payments/${id}/reject`, { reason }),
  refundPayment: (id: number, reason: string) => request<ClientPayment>("POST", `/admin/client-payments/${id}/refund`, { reason }),
  removePayment: (id: number) => request("DELETE", `/admin/client-payments/${id}`),

  commissions: () => request<AdminCommission[]>("GET", "/admin/partner-commissions"),
  reverseCommission: (id: number, reason: string) => request("POST", `/admin/partner-commissions/${id}/reverse`, { reason }),

  payouts: () => request<AdminPayout[]>("GET", "/admin/partner-payouts"),
  markPaid: (id: number, utr: string, note?: string) => request("POST", `/admin/partner-payouts/${id}/pay`, { utr, note }),
  rejectPayout: (id: number, note: string) => request("POST", `/admin/partner-payouts/${id}/reject`, { note }),

  applications: () => request<AdminApplication[]>("GET", "/admin/ambassadors"),
  approve: (id: number, note?: string) => request("POST", `/admin/ambassadors/${id}/approve`, { note }),
  reject: (id: number, note: string) => request("POST", `/admin/ambassadors/${id}/reject`, { note }),
  removeApplication: (id: number) => request("DELETE", `/admin/ambassadors/${id}`),
};

/* ------------------------------------------------------------------ */
/* Share links                                                        */
/* ------------------------------------------------------------------ */
/** The link a partner shares. Works on any deployment because the router is hash-based. */
export function referralLink(code: string) {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/?ref=${encodeURIComponent(code)}`;
}

export function shareTargets(link: string, brand: string) {
  const text = `I partner with ${brand} — they build websites, apps and online stores that actually perform. Get in touch through my link:`;
  const full = `${text} ${link}`;
  return [
    { id: "whatsapp", label: "WhatsApp", icon: "whatsapp", href: `https://wa.me/?text=${encodeURIComponent(full)}` },
    { id: "linkedin", label: "LinkedIn", icon: "linkedin", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}` },
    { id: "x", label: "X", icon: "send", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}` },
    { id: "telegram", label: "Telegram", icon: "send", href: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}` },
    { id: "email", label: "Email", icon: "mail", href: `mailto:?subject=${encodeURIComponent(`Need a website? Try ${brand}`)}&body=${encodeURIComponent(full)}` },
  ];
}

/** CSV cells that start with = + - @ are executed as formulas by spreadsheet apps; neutralise them. */
export function csvSafe<T extends Record<string, unknown>>(rows: T[]) {
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === "string" && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v])),
  );
}

export const paiseToRupees = (paise: number) => (paise / 100).toFixed(2);
