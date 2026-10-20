/**
 * Hand-off between a submitted form (contact, call booking, payment) and the
 * confirmation page. Kept in this tab's sessionStorage, so personal details
 * never travel in the URL and a refresh still shows the confirmation.
 */
type Base = {
  reference: string;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  /** The API didn't respond — the visitor must resend by email / WhatsApp. */
  offline: boolean;
  /** The server sends confirmation emails. */
  mail: boolean;
  createdAt: string; // ISO
};

export type EnquiryConfirmation = Base & {
  kind: "enquiry";
  service: string;
  budget: string;
  timeline?: string;
  details: string;
};

export type BookingConfirmation = Base & {
  kind: "booking";
  topic: string;
  date: string; // yyyy-mm-dd (studio timezone)
  time: string; // "10:30 AM"
  budget?: string;
  notes?: string;
};

export type PaymentConfirmation = Base & {
  kind: "payment";
  purpose: string;
  amount: number; // rupees
  currency: string;
  paymentId: string;
  orderId?: string;
  method?: string | null;
  paidAt: string; // ISO
  testMode?: boolean;
};

export type Confirmation = EnquiryConfirmation | BookingConfirmation | PaymentConfirmation;
export type ConfirmationKind = Confirmation["kind"];

const KEY = "nf_confirmation_v1";
const KINDS: ConfirmationKind[] = ["enquiry", "booking", "payment"];
let memory: Confirmation | null = null;

export function saveConfirmation(c: Confirmation) {
  memory = c;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* storage unavailable — the in-memory copy still works for this visit */
  }
}

export function readConfirmation(): Confirmation | null {
  if (memory) return memory;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Confirmation> | null;
    if (parsed && KINDS.includes(parsed.kind as ConfirmationKind) && typeof parsed.reference === "string" && typeof parsed.name === "string") {
      memory = parsed as Confirmation;
      return memory;
    }
  } catch {
    /* ignore corrupt data */
  }
  return null;
}

export function isConfirmationKind(value: string | null): value is ConfirmationKind {
  return KINDS.includes(value as ConfirmationKind);
}

export function confirmationPath(c: Pick<Confirmation, "kind" | "reference">) {
  const q = new URLSearchParams({ type: c.kind });
  if (c.reference) q.set("ref", c.reference);
  return `/confirmation?${q.toString()}`;
}
