import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icons";
import { Button, Eyebrow, PageHero, Reveal } from "../components/ui";
import { api, track, type PaymentConfig, type PaymentVerifyPayload } from "../lib/api";
import { confirmationPath, saveConfirmation } from "../lib/confirmation";
import { useContent } from "../lib/content";
import { loadRazorpay, openCheckout } from "../lib/razorpay";
import { useRouter } from "../lib/router";
import { whatsappLink } from "../lib/site";
import { cn } from "../utils/cn";

type FormState = { name: string; email: string; phone: string; companyName: string; purpose: string; amount: string; website: string };
const EMPTY: FormState = { name: "", email: "", phone: "", companyName: "", purpose: "", amount: "", website: "" };
const PURPOSES = ["Project advance", "Milestone payment", "Final payment", "Maintenance & support", "Consultation"];
const MAX_AMOUNT = 5_000_000;

type Stage = "idle" | "starting" | "checkout" | "verifying";

function Field({ label, hint, error, htmlFor, children, required }: { label: string; hint?: string; error?: string; htmlFor?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="field-label">
          {label} {required ? <span className="text-gold-400">*</span> : null}
        </label>
        {hint ? <span className="text-[11px] text-smoke">{hint}</span> : null}
      </div>
      <div className="mt-2">{children}</div>
      {error ? (
        <p className="mt-1.5 text-[12px] text-ember" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function formatMoney(amount: number, currency = "INR", decimals = 0) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
}

/** Network hiccups shouldn't lose a successful payment — retry the confirmation a couple of times. */
async function verifyWithRetry(payload: PaymentVerifyPayload) {
  let res = await api.verifyPayment(payload);
  for (let attempt = 1; attempt < 3 && !res.ok && (res.status === 0 || (res.status ?? 0) >= 500); attempt++) {
    await new Promise((r) => setTimeout(r, attempt * 1500));
    res = await api.verifyPayment(payload);
  }
  return res;
}

export default function PayPage() {
  const { settings } = useContent();
  const { query, navigate } = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [stage, setStage] = useState<Stage>("idle");
  const [formError, setFormError] = useState("");
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [configState, setConfigState] = useState<"loading" | "ready" | "unavailable">("loading");

  const busy = stage !== "idle";
  const currency = config?.currency ?? "INR";

  // Shareable pre-filled links: #/pay?amount=25000&for=Website%20advance
  useEffect(() => {
    const amount = query.get("amount");
    const purpose = query.get("for") ?? query.get("purpose");
    setForm((f) => ({ ...f, amount: amount && /^\d+$/.test(amount) ? amount : f.amount, purpose: purpose ?? f.purpose }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    void api.paymentConfig().then((res) => {
      if (!alive) return;
      if (res.ok && res.data) {
        setConfig(res.data);
        setConfigState(res.data.enabled ? "ready" : "unavailable");
      } else {
        setConfigState("unavailable");
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const set = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setFormError("");
  };

  const amountNum = useMemo(() => Math.round(Number(form.amount)), [form.amount]);
  const hasAmount = Number.isFinite(amountNum) && amountNum > 0;

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!hasAmount) next.amount = "Enter the amount to pay.";
    else if (amountNum > MAX_AMOUNT) next.amount = `For amounts above ${formatMoney(MAX_AMOUNT, currency)} please contact us.`;
    if (form.purpose.trim().length < 2) next.purpose = "What is this payment for?";
    if (form.name.trim().length < 2) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = "Please enter a valid email address.";
    if (form.phone.trim() && form.phone.replace(/\D/g, "").length < 10) next.phone = "Please enter a valid phone number, or leave it empty.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || configState !== "ready" || !validate()) return;
    setFormError("");
    setStage("starting");

    // 1) Load Razorpay Checkout.
    if (!(await loadRazorpay())) {
      setStage("idle");
      setFormError("Couldn't load the secure payment window. Please check your connection and try again.");
      return;
    }

    // 2) Create the order on our server — the amount is fixed server-side.
    const orderRes = await api.createPaymentOrder({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      companyName: form.companyName.trim(),
      purpose: form.purpose.trim(),
      amount: amountNum,
      website: form.website,
    });
    if (!orderRes.ok || !orderRes.data) {
      setStage("idle");
      if (orderRes.errors) setErrors(orderRes.errors as Partial<Record<keyof FormState, string>>);
      else setFormError(orderRes.error ?? "Couldn't start the payment. Please try again.");
      return;
    }
    const order = orderRes.data;
    track("payment_started", { purpose: form.purpose, amount: amountNum });

    // 3) Razorpay Checkout (cards, UPI, net banking, wallets).
    setStage("checkout");
    const result = await openCheckout({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: settings.name,
      description: form.purpose.trim(),
      image: window.location.protocol === "https:" ? `${window.location.origin}/brand/logo.png` : undefined,
      order_id: order.orderId,
      prefill: { name: order.name, email: order.email, contact: order.phone || undefined },
      notes: { reference: order.reference },
      theme: { color: "#d4ad66" },
    });
    if (result.status !== "success") {
      setStage("idle");
      setFormError(
        result.error
          ? `Payment not completed — ${result.error} No money was taken; if your bank shows a debit, it is reversed automatically.`
          : "The payment window was closed before the payment finished. Nothing was charged — you can try again whenever you're ready.",
      );
      return;
    }

    // 4) Verify Razorpay's signature on our server before confirming anything.
    setStage("verifying");
    const verifyRes = await verifyWithRetry(result.response);
    if (!verifyRes.ok || !verifyRes.data) {
      setStage("idle");
      const network = verifyRes.status === 0 || (verifyRes.status ?? 0) >= 500;
      setFormError(
        network
          ? `Your payment went through, but we couldn't confirm it automatically. Please don't pay again — contact us with payment ID ${result.response.razorpay_payment_id} and we'll confirm it right away.`
          : (verifyRes.error ?? "We couldn't verify this payment. If money was deducted, it will be refunded automatically — please contact us."),
      );
      return;
    }

    const r = verifyRes.data;
    track("payment_completed", { purpose: r.purpose, amount: r.amount });
    const confirmation = {
      kind: "payment" as const,
      reference: r.reference,
      name: r.name,
      email: r.email,
      phone: r.phone || form.phone.trim(),
      companyName: r.companyName || form.companyName.trim(),
      purpose: r.purpose,
      amount: r.amount,
      currency: r.currency,
      paymentId: r.paymentId,
      orderId: r.orderId,
      method: r.method ?? null,
      paidAt: r.paidAt,
      testMode: r.testMode,
      offline: false,
      mail: Boolean(r.mail),
      createdAt: new Date().toISOString(),
    };
    saveConfirmation(confirmation);
    navigate(confirmationPath(confirmation), { replace: true });
  };

  const buttonLabel =
    stage === "starting"
      ? "Preparing secure checkout…"
      : stage === "checkout"
        ? "Complete payment in the Razorpay window…"
        : stage === "verifying"
          ? "Confirming payment…"
          : hasAmount
            ? `Pay ${formatMoney(amountNum, currency)} securely`
            : "Pay securely";

  return (
    <>
      <PageHero
        eyebrow="Secure payment"
        title="Pay Novaframe Studio"
        highlight="safely online."
        description="Settle an invoice, advance or milestone by UPI, card, net banking or wallet. Payments are processed by Razorpay — we never see or store your card or bank details."
      >
        <Button href={whatsappLink(settings, `Hi ${settings.short}! I have a question about a payment.`)} variant="line" icon="whatsapp" track="pay_whatsapp">
          Questions? WhatsApp us
        </Button>
      </PageHero>

      <section className="pb-24">
        <div className="shell grid items-start gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <Reveal>
            <div className="lux-card gold-edge relative overflow-hidden p-6 md:p-10">
              {stage === "verifying" ? (
                <div className="absolute inset-0 z-20 grid place-items-center bg-ink-950/90 p-6 backdrop-blur-sm" role="status" aria-live="assertive">
                  <div className="text-center">
                    <span className="spinner text-[30px]" aria-hidden />
                    <p className="display mt-6 text-[1.6rem] text-ivory">Confirming your payment…</p>
                    <p className="mt-2 text-[13.5px] text-mist">This takes a few seconds. Please don't close or refresh this tab.</p>
                  </div>
                </div>
              ) : null}

              {configState === "unavailable" ? (
                <div className="py-4 text-center md:py-8">
                  <span className="icon-tile mx-auto h-14 w-14">
                    <Icon name="lock" className="h-6 w-6" />
                  </span>
                  <h2 className="display mt-7 text-[1.9rem] leading-tight">Online payments are briefly unavailable.</h2>
                  <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-relaxed text-mist">
                    Message us and we'll share a secure payment link or our bank details directly — usually within minutes during working hours.
                  </p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Button href={whatsappLink(settings, `Hi ${settings.short}! I'd like to make a payment.`)} icon="whatsapp">
                      WhatsApp us
                    </Button>
                    <Button href={`mailto:${settings.email}?subject=${encodeURIComponent("Payment request")}`} variant="line" icon="mail">
                      Email us
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={pay} noValidate aria-busy={busy}>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="eyebrow">Payment details</p>
                      <h2 className="display mt-4 text-[1.9rem] leading-tight md:text-[2.3rem]">How much, and for what?</h2>
                    </div>
                    <span className="label">takes ~1 minute</span>
                  </div>

                  {config?.testMode ? (
                    <div className="mt-6 rounded-xl border border-ember/40 bg-ember/10 px-4 py-3 text-[12.5px] leading-relaxed text-parchment">
                      <span className="font-mono text-[10.5px] tracking-[0.16em] text-ember uppercase">Test mode</span> — Razorpay test keys are active, so no real money
                      moves. Pay with UPI ID <span className="font-mono text-gold-200">success@razorpay</span> or a Razorpay test card.
                    </div>
                  ) : null}

                  {/* Honeypot */}
                  <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                    <label>
                      Website
                      <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
                    </label>
                  </div>

                  <p className="label mt-9">
                    <span className="text-gold-400">01</span> · The payment
                  </p>
                  <div className="mt-5 grid gap-5 sm:grid-cols-[0.8fr_1.2fr]">
                    <Field label={`Amount (${currency})`} required error={errors.amount} htmlFor="p-amount">
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[15px] font-semibold text-gold-300" aria-hidden>
                          {currency === "INR" ? "₹" : currency}
                        </span>
                        <input
                          id="p-amount"
                          className="field pl-9 text-[16px] font-semibold"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="25000"
                          value={form.amount}
                          onChange={(e) => set("amount", e.target.value.replace(/[^\d]/g, "").slice(0, 8))}
                          aria-invalid={Boolean(errors.amount)}
                        />
                      </div>
                    </Field>
                    <Field label="What is this for?" required error={errors.purpose} htmlFor="p-purpose">
                      <input
                        id="p-purpose"
                        className="field"
                        placeholder="Website advance, milestone 2…"
                        maxLength={160}
                        value={form.purpose}
                        onChange={(e) => set("purpose", e.target.value)}
                        aria-invalid={Boolean(errors.purpose)}
                      />
                    </Field>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Common payment purposes">
                    {PURPOSES.map((p) => (
                      <button key={p} type="button" aria-pressed={form.purpose === p} onClick={() => set("purpose", p)} className="choice rounded-full px-3.5 py-1.5 text-[12.5px] font-medium">
                        {p}
                      </button>
                    ))}
                  </div>

                  <p className="label mt-10">
                    <span className="text-gold-400">02</span> · About you
                  </p>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <Field label="Full name" required error={errors.name} htmlFor="p-name">
                      <input id="p-name" className="field" autoComplete="name" placeholder="Your name" value={form.name} onChange={(e) => set("name", e.target.value)} aria-invalid={Boolean(errors.name)} />
                    </Field>
                    <Field label="Company" hint="optional" htmlFor="p-company">
                      <input id="p-company" className="field" autoComplete="organization" placeholder="Company or brand" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
                    </Field>
                    <Field label="Email" required hint="receipt goes here" error={errors.email} htmlFor="p-email">
                      <input id="p-email" className="field" type="email" autoComplete="email" placeholder="you@company.com" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={Boolean(errors.email)} />
                    </Field>
                    <Field label="Phone / WhatsApp" hint="optional" error={errors.phone} htmlFor="p-phone">
                      <input id="p-phone" className="field" type="tel" autoComplete="tel" placeholder="+91 …" value={form.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={Boolean(errors.phone)} />
                    </Field>
                  </div>

                  {formError ? (
                    <div className="mt-7 flex gap-3 rounded-xl border border-ember/40 bg-ember/10 px-4 py-3.5 text-[13px] leading-relaxed text-parchment" role="alert">
                      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-ember" />
                      <span>{formError}</span>
                    </div>
                  ) : null}

                  <div className="mt-9 flex flex-col gap-4 border-t border-gold-300/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex max-w-xs items-start gap-2 text-[12px] leading-relaxed text-smoke">
                      <Icon name="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500" />
                      Encrypted checkout by Razorpay. You'll get an official receipt by email the moment it succeeds.
                    </p>
                    <button type="submit" className="btn btn-gold btn-lg shine" disabled={busy || configState !== "ready"}>
                      {busy ? <span className="spinner" aria-hidden /> : <Icon name="lock" className="h-4 w-4" />}
                      {buttonLabel}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </Reveal>

          <Reveal delay={120} className="lg:sticky lg:top-28">
            <aside className="lux-card overflow-hidden" aria-label="Payment summary">
              <div className="p-6 md:p-7">
                <Eyebrow>Payment summary</Eyebrow>
                <dl className="mt-6 space-y-3 text-[13.5px]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-mist">Paying</dt>
                    <dd className="text-right font-semibold text-parchment">{settings.legal}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-mist">For</dt>
                    <dd className={cn("text-right font-semibold [overflow-wrap:anywhere]", form.purpose.trim() ? "text-parchment" : "text-smoke")}>{form.purpose.trim() || "—"}</dd>
                  </div>
                </dl>
                <div className="hairline my-6" />
                <p className="label">Total</p>
                <p className="display mt-2 text-[2.4rem] leading-none text-gold-100">{hasAmount ? formatMoney(amountNum, currency, 2) : formatMoney(0, currency, 2)}</p>
                <p className="mt-2 text-[12px] text-smoke">Charged in {currency} through Razorpay's secure checkout.</p>
                <div className="mt-6 flex flex-wrap gap-1.5">
                  {["UPI", "Cards", "Net banking", "Wallets"].map((m) => (
                    <span key={m} className="chip text-[11.5px]">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              <div className="border-t border-gold-300/10 bg-ink-950/40 p-6 md:p-7">
                <ul className="space-y-4">
                  {[
                    ["lock", "Bank-grade security", "Card and UPI details go straight to Razorpay (PCI-DSS) — never to us."],
                    ["mail", "Instant official receipt", "Emailed to you the moment your payment succeeds."],
                    ["check-circle", "Confirmed on our side", "Every payment is verified by our server before we confirm it."],
                  ].map(([icon, t, d]) => (
                    <li key={t} className="flex gap-3.5">
                      <span className="icon-tile h-9 w-9 shrink-0 rounded-[11px]">
                        <Icon name={icon} className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-[13.5px] font-semibold text-ivory">{t}</span>
                        <span className="block text-[12.5px] leading-relaxed text-mist">{d}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-[12.5px] leading-relaxed text-mist">
                  Prefer a bank transfer or have a custom invoice?{" "}
                  <a href={whatsappLink(settings, `Hi ${settings.short}! I'd like to pay by bank transfer.`)} className="text-gold-200 underline underline-offset-4" target="_blank" rel="noopener noreferrer">
                    Message us
                  </a>{" "}
                  and we'll help.
                </p>
              </div>
            </aside>
          </Reveal>
        </div>
      </section>
    </>
  );
}
