import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "../components/Icons";
import Leaderboard from "../components/Leaderboard";
import { Reveal } from "../components/ui";
import { REGIONS, YEARS_OF_STUDY, partnerPasswordProblem } from "../data/partner";
import { getPartnerToken, track } from "../lib/api";
import { useContent } from "../lib/content";
import {
  formatPaise,
  partnerApi,
  referralLink,
  shareTargets,
  type AmbassadorApplication,
  type Commission,
  type PartnerLead,
  type PartnerMe,
  type Payout,
  type Wallet,
} from "../lib/partner";
import { Link, useRouter } from "../lib/router";
import { prettyDate, timeAgo } from "../lib/site";
import { cn } from "../utils/cn";

type Errors = Record<string, string | undefined>;

/* ------------------------------------------------------------------ */
/* Small building blocks                                              */
/* ------------------------------------------------------------------ */
function Field({ label, hint, error, htmlFor, children, required, className }: { label: string; hint?: ReactNode; error?: string; htmlFor?: string; children: ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={className}>
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

const PILL: Record<string, string> = {
  active: "border-sage/50 bg-sage/15 text-[#dff3e6]",
  available: "border-sage/50 bg-sage/15 text-[#dff3e6]",
  paid: "border-sage/50 bg-sage/15 text-[#dff3e6]",
  approved: "border-sage/50 bg-sage/15 text-[#dff3e6]",
  converted: "border-sage/50 bg-sage/15 text-[#dff3e6]",
  held: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  requested: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  pending: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  in_discussion: "border-sky-300/30 bg-sky-300/10 text-sky-100",
  submitted: "border-gold-300/50 bg-gold-400/15 text-gold-100",
  ambassador: "border-gold-300/50 bg-gold-400/15 text-gold-100",
  partner: "border-gold-300/25 bg-gold-300/5 text-sand",
  reversed: "border-ember/40 bg-ember/10 text-[#ffd9cc]",
  rejected: "border-ember/40 bg-ember/10 text-[#ffd9cc]",
  closed: "border-smoke/40 bg-smoke/10 text-mist",
};
const LABELS: Record<string, string> = { in_discussion: "In discussion", held: "On hold", requested: "Processing", ambassador: "Campus Ambassador", partner: "Student Partner" };

function Pill({ value }: { value: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize", PILL[value] ?? PILL.partner)}>
      {LABELS[value] ?? value.replace(/_/g, " ")}
    </span>
  );
}

function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px]",
        tone === "error" ? "border-ember/40 bg-ember/10 text-parchment" : tone === "success" ? "border-sage/40 bg-sage/10 text-[#dff3e6]" : "border-gold-300/25 bg-gold-400/[0.07] text-gold-100",
      )}
    >
      <Icon name={tone === "error" ? "alert" : tone === "success" ? "check-circle" : "info"} className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gold-300/30 border-t-gold-300" aria-hidden />;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

/* ------------------------------------------------------------------ */
/* Sign in / Register                                                 */
/* ------------------------------------------------------------------ */
type RegisterForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirm: string;
  college: string;
  course: string;
  graduationYear: string;
  city: string;
  region: string;
  payoutMethod: "upi" | "bank";
  upiId: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  pan: string;
  acceptTerms: boolean;
  applyAmbassador: boolean;
  yearOfStudy: string;
  motivation: string;
  reach: string;
  socialLinks: string;
  website: string;
};

const EMPTY_FORM: RegisterForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirm: "",
  college: "",
  course: "",
  graduationYear: "",
  city: "",
  region: "",
  payoutMethod: "upi",
  upiId: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  pan: "",
  acceptTerms: false,
  applyAmbassador: false,
  yearOfStudy: "",
  motivation: "",
  reach: "",
  socialLinks: "",
  website: "",
};

function AuthView({ onAuthed, notice }: { onAuthed: () => void; notice: string }) {
  const { query, navigate } = useRouter();
  const { settings } = useContent();
  const mode = query.get("mode") === "register" ? "register" : "login";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<RegisterForm>(() => ({ ...EMPTY_FORM, applyAmbassador: query.get("ambassador") === "1" }));
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const setMode = (next: "login" | "register") => {
    setError("");
    setErrors({});
    navigate(next === "register" ? "/partner?mode=register" : "/partner", { replace: true });
  };

  const set = <K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const login = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await partnerApi.login(email.trim(), password);
    setBusy(false);
    if (res.ok) {
      track("partner_login");
      onAuthed();
    } else setError(res.offline ? "We can't reach the server right now. Please check your connection and try again." : res.error ?? "Sign-in failed.");
  };

  const validate = () => {
    const next: Errors = {};
    if (form.fullName.trim().length < 2) next.fullName = "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = "Please enter a valid email address.";
    if (form.phone.replace(/\D/g, "").length < 10) next.phone = "Enter your 10-digit mobile number.";
    const pw = partnerPasswordProblem(form.password);
    if (pw) next.password = pw;
    if (form.confirm !== form.password) next.confirm = "Passwords don't match.";
    if (form.college.trim().length < 2) next.college = "Please enter your college or university.";
    if (!form.region) next.region = "Choose your state or region.";
    if (form.payoutMethod === "upi" && !form.upiId.trim()) next.upiId = "Enter your UPI ID (e.g. name@okaxis).";
    if (form.payoutMethod === "bank") {
      if (form.bankAccountName.trim().length < 2) next.bankAccountName = "Enter the account holder's name.";
      if (!/^\d{9,18}$/.test(form.bankAccountNumber.replace(/[\s-]/g, ""))) next.bankAccountNumber = "Account numbers are 9–18 digits.";
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.bankIfsc.trim().toUpperCase())) next.bankIfsc = "IFSC is 11 characters, e.g. HDFC0001234.";
    }
    if (form.applyAmbassador) {
      if (!form.yearOfStudy) next["ambassador.yearOfStudy"] = "Choose your year of study.";
      if (form.motivation.trim().length < 30) next["ambassador.motivation"] = "Tell us a little more (at least 30 characters).";
      if (form.reach.trim().length < 5) next["ambassador.reach"] = "Tell us about your clubs, societies or audience.";
    }
    if (!form.acceptTerms) next.acceptTerms = "Please accept the program terms.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const register = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!validate()) {
      setError("Please check the highlighted fields.");
      return;
    }
    setBusy(true);
    const bank = form.payoutMethod === "bank";
    const res = await partnerApi.register({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
      college: form.college.trim(),
      course: form.course.trim(),
      graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
      city: form.city.trim(),
      region: form.region,
      upiId: bank ? "" : form.upiId.trim(),
      bankAccountName: bank ? form.bankAccountName.trim() : "",
      bankAccountNumber: bank ? form.bankAccountNumber.trim() : "",
      bankIfsc: bank ? form.bankIfsc.trim() : "",
      pan: form.pan.trim(),
      acceptTerms: form.acceptTerms,
      ambassador: form.applyAmbassador ? { yearOfStudy: form.yearOfStudy, motivation: form.motivation.trim(), reach: form.reach.trim(), socialLinks: form.socialLinks.trim() } : null,
      website: form.website,
    });
    setBusy(false);
    if (res.ok) {
      track("partner_registered", { ambassador: form.applyAmbassador });
      navigate("/partner?welcome=1", { replace: true });
      onAuthed();
      return;
    }
    if (res.errors) setErrors(res.errors);
    setError(res.offline ? "We can't reach the server right now. Please check your connection and try again." : res.error ?? "Registration failed.");
  };

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 9 }, (_, i) => now - 2 + i);
  }, []);

  return (
    <section className="relative overflow-hidden pt-36 pb-24 md:pt-44">
      <div className="grid-lines absolute inset-0 opacity-60" aria-hidden />
      <div className="shell relative grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <p className="eyebrow">Partner portal</p>
          <h1 className="display mt-6 text-[2.5rem] leading-[1.04] sm:text-5xl">
            {mode === "register" ? "Join the program." : "Welcome back,"} <span className="serif-accent text-gold">{mode === "register" ? "Start earning." : "partner."}</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-sand">
            {mode === "register"
              ? `Get your Partner ID, referral link and wallet in two minutes. Free to join — you earn on every verified payment from clients you bring to ${settings.short}.`
              : "Sign in to see your leads, wallet, payouts and leaderboard rank."}
          </p>
          <ul className="mt-8 space-y-3">
            {[
              ["shield", "Passwords are hashed with PBKDF2-SHA512 — never stored in plain text"],
              ["lock", "Commission is calculated only by our server, from verified payments"],
              ["rupee", "Withdraw to UPI or bank with a transaction reference for every transfer"],
            ].map(([icon, text]) => (
              <li key={text} className="flex items-start gap-3 text-[13.5px] text-mist">
                <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
                {text}
              </li>
            ))}
          </ul>
          <Link to="/earn" className="mt-8 inline-flex items-center gap-2 text-[13.5px] font-semibold text-gold-200 hover:text-gold-100">
            <Icon name="arrow-left" className="h-3.5 w-3.5" /> How the program works
          </Link>
        </Reveal>

        <Reveal delay={80}>
          <div className="lux-card gold-edge relative overflow-hidden p-6 md:p-10">
            <div className="inline-flex rounded-full border border-gold-300/12 bg-ink-950/60 p-1" role="tablist" aria-label="Sign in or register">
              {(
                [
                  ["login", "Sign in"],
                  ["register", "Register"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => setMode(value)}
                  className={cn("rounded-full px-5 py-2 text-[13px] font-semibold transition", mode === value ? "bg-gold-400/20 text-gold-100" : "text-mist hover:text-ivory")}
                >
                  {label}
                </button>
              ))}
            </div>

            {notice ? (
              <div className="mt-6">
                <Notice tone="error">{notice}</Notice>
              </div>
            ) : null}

            {mode === "login" ? (
              <form onSubmit={login} className="mt-7 space-y-5" noValidate>
                <Field label="Email" htmlFor="p-email">
                  <input id="p-email" type="email" autoComplete="username" className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" required />
                </Field>
                <Field label="Password" htmlFor="p-pass">
                  <div className="relative">
                    <input id="p-pass" type={show ? "text" : "password"} autoComplete="current-password" className="field pr-12" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShow((v) => !v)} className="absolute top-1/2 right-1.5 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-smoke hover:text-gold-200" aria-label={show ? "Hide password" : "Show password"}>
                      <Icon name={show ? "eye-off" : "eye"} className="h-4 w-4" />
                    </button>
                  </div>
                </Field>
                {error ? <Notice tone="error">{error}</Notice> : null}
                <button type="submit" disabled={busy || !email || !password} className="btn btn-gold btn-lg shine w-full">
                  {busy ? "Signing in…" : "Sign in"}
                </button>
                <p className="text-center text-[12.5px] text-smoke">
                  Forgot your password? Message us on WhatsApp from your registered number and we'll reset it.
                </p>
              </form>
            ) : (
              <form onSubmit={register} className="mt-7" noValidate>
                <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                  <label>
                    Website
                    <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
                  </label>
                </div>

                <p className="label">
                  <span className="text-gold-400">01</span> · Contact
                </p>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <Field label="Full name" required error={errors.fullName} htmlFor="r-name">
                    <input id="r-name" className="field" autoComplete="name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} aria-invalid={Boolean(errors.fullName)} />
                  </Field>
                  <Field label="Mobile / WhatsApp" required error={errors.phone} htmlFor="r-phone">
                    <input id="r-phone" className="field" type="tel" autoComplete="tel" placeholder="98765 43210" value={form.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={Boolean(errors.phone)} />
                  </Field>
                  <Field label="Email" required error={errors.email} htmlFor="r-email" className="sm:col-span-2">
                    <input id="r-email" className="field" type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={Boolean(errors.email)} />
                  </Field>
                  <Field label="Password" required hint="8+ characters, letters & numbers" error={errors.password} htmlFor="r-pass">
                    <input id="r-pass" className="field" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} aria-invalid={Boolean(errors.password)} />
                  </Field>
                  <Field label="Confirm password" required error={errors.confirm} htmlFor="r-confirm">
                    <input id="r-confirm" className="field" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => set("confirm", e.target.value)} aria-invalid={Boolean(errors.confirm)} />
                  </Field>
                </div>

                <p className="label mt-9">
                  <span className="text-gold-400">02</span> · College
                </p>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <Field label="College / university" required error={errors.college} htmlFor="r-college" className="sm:col-span-2">
                    <input id="r-college" className="field" autoComplete="organization" placeholder="e.g. Delhi University" value={form.college} onChange={(e) => set("college", e.target.value)} aria-invalid={Boolean(errors.college)} />
                  </Field>
                  <Field label="Course" hint="optional" htmlFor="r-course">
                    <input id="r-course" className="field" placeholder="e.g. B.Com, B.Tech CSE" value={form.course} onChange={(e) => set("course", e.target.value)} />
                  </Field>
                  <Field label="Graduation year" hint="optional" error={errors.graduationYear} htmlFor="r-year">
                    <select id="r-year" className="field" value={form.graduationYear} onChange={(e) => set("graduationYear", e.target.value)}>
                      <option value="">Select</option>
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="City" hint="optional" htmlFor="r-city">
                    <input id="r-city" className="field" autoComplete="address-level2" value={form.city} onChange={(e) => set("city", e.target.value)} />
                  </Field>
                  <Field label="State / region" required error={errors.region} htmlFor="r-region">
                    <select id="r-region" className="field" value={form.region} onChange={(e) => set("region", e.target.value)} aria-invalid={Boolean(errors.region)}>
                      <option value="">Select</option>
                      {REGIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <p className="label mt-9">
                  <span className="text-gold-400">03</span> · Where we pay you
                </p>
                <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Payout method">
                  {(
                    [
                      ["upi", "UPI"],
                      ["bank", "Bank account"],
                    ] as const
                  ).map(([value, label]) => (
                    <button key={value} type="button" role="radio" aria-checked={form.payoutMethod === value} onClick={() => set("payoutMethod", value)} className="choice rounded-full px-4 py-2 text-[13px] font-medium">
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  {form.payoutMethod === "upi" ? (
                    <Field label="UPI ID" required error={errors.upiId} htmlFor="r-upi" className="sm:col-span-2">
                      <input id="r-upi" className="field font-mono" placeholder="yourname@okaxis" autoCapitalize="none" value={form.upiId} onChange={(e) => set("upiId", e.target.value)} aria-invalid={Boolean(errors.upiId)} />
                    </Field>
                  ) : (
                    <>
                      <Field label="Account holder name" required error={errors.bankAccountName} htmlFor="r-holder" className="sm:col-span-2">
                        <input id="r-holder" className="field" value={form.bankAccountName} onChange={(e) => set("bankAccountName", e.target.value)} aria-invalid={Boolean(errors.bankAccountName)} />
                      </Field>
                      <Field label="Account number" required error={errors.bankAccountNumber} htmlFor="r-acct">
                        <input id="r-acct" className="field font-mono" inputMode="numeric" autoComplete="off" value={form.bankAccountNumber} onChange={(e) => set("bankAccountNumber", e.target.value)} aria-invalid={Boolean(errors.bankAccountNumber)} />
                      </Field>
                      <Field label="IFSC" required error={errors.bankIfsc} htmlFor="r-ifsc">
                        <input id="r-ifsc" className="field font-mono uppercase" autoComplete="off" placeholder="HDFC0001234" value={form.bankIfsc} onChange={(e) => set("bankIfsc", e.target.value)} aria-invalid={Boolean(errors.bankIfsc)} />
                      </Field>
                    </>
                  )}
                  <Field label="PAN" hint="optional · for TDS records" error={errors.pan} htmlFor="r-pan">
                    <input id="r-pan" className="field font-mono uppercase" autoComplete="off" placeholder="ABCDE1234F" maxLength={10} value={form.pan} onChange={(e) => set("pan", e.target.value)} />
                  </Field>
                </div>
                <p className="mt-3 flex items-start gap-2 text-[12px] text-smoke">
                  <Icon name="lock" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500" />
                  Used only to send your payouts. Your dashboard shows bank numbers masked, and changing them later needs your password.
                </p>

                <button
                  type="button"
                  aria-pressed={form.applyAmbassador}
                  onClick={() => set("applyAmbassador", !form.applyAmbassador)}
                  className="choice mt-9 w-full justify-between px-4 py-3.5 text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <Icon name="award" className="h-4 w-4 shrink-0 text-gold-300" />
                    <span>
                      <span className="block text-[13.5px] font-semibold">Also apply as Campus Ambassador</span>
                      <span className="block text-[12px] text-smoke">Represent us at your college · reviewed by our team</span>
                    </span>
                  </span>
                  <span className="toggle" data-on={form.applyAmbassador} aria-hidden />
                </button>
                {form.applyAmbassador ? (
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <Field label="Year of study" required error={errors["ambassador.yearOfStudy"]} htmlFor="r-yos">
                      <select id="r-yos" className="field" value={form.yearOfStudy} onChange={(e) => set("yearOfStudy", e.target.value)}>
                        <option value="">Select</option>
                        {YEARS_OF_STUDY.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Clubs, societies or audience" required error={errors["ambassador.reach"]} htmlFor="r-reach">
                      <input id="r-reach" className="field" placeholder="e.g. E-Cell core team, 300 members" value={form.reach} onChange={(e) => set("reach", e.target.value)} />
                    </Field>
                    <Field label="Why you?" required hint={`${form.motivation.trim().length}/30+`} error={errors["ambassador.motivation"]} htmlFor="r-why" className="sm:col-span-2">
                      <textarea id="r-why" rows={4} className="field" placeholder="What you'd do on campus and who you could bring in." value={form.motivation} onChange={(e) => set("motivation", e.target.value)} />
                    </Field>
                    <Field label="LinkedIn / Instagram links" hint="optional" htmlFor="r-social" className="sm:col-span-2">
                      <input id="r-social" className="field" placeholder="https://linkedin.com/in/…" value={form.socialLinks} onChange={(e) => set("socialLinks", e.target.value)} />
                    </Field>
                  </div>
                ) : null}

                <label className="mt-8 flex cursor-pointer items-start gap-3 text-[13px] text-sand">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-gold-400" checked={form.acceptTerms} onChange={(e) => set("acceptTerms", e.target.checked)} />
                  <span>
                    I agree to the program rules: genuine referrals only, no self-referrals or spam, and commission is paid only on verified client payments. I accept the{" "}
                    <Link to="/terms" className="text-gold-200 underline-offset-4 hover:underline">
                      terms
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-gold-200 underline-offset-4 hover:underline">
                      privacy policy
                    </Link>
                    .
                  </span>
                </label>
                {errors.acceptTerms ? <p className="mt-1.5 text-[12px] text-ember">{errors.acceptTerms}</p> : null}

                {error ? (
                  <div className="mt-6">
                    <Notice tone="error">{error}</Notice>
                  </div>
                ) : null}
                <button type="submit" disabled={busy} className="btn btn-gold btn-lg shine mt-7 w-full">
                  {busy ? "Creating your account…" : "Create my partner account"}
                </button>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard tabs                                                     */
/* ------------------------------------------------------------------ */
const TABS = [
  { id: "overview", label: "Overview", icon: "home" },
  { id: "leads", label: "Leads", icon: "inbox" },
  { id: "earnings", label: "Earnings", icon: "rupee" },
  { id: "ambassador", label: "Ambassador", icon: "award" },
  { id: "profile", label: "Profile", icon: "user" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function WalletCards({ wallet }: { wallet: Wallet }) {
  const cards = [
    { label: "Available to withdraw", value: wallet.availablePaise, icon: "rupee", hint: "Cleared commission", strong: true },
    { label: "On hold", value: wallet.heldPaise, icon: "clock", hint: "Inside the refund window" },
    { label: "Paid out", value: wallet.paidOutPaise, icon: "check-circle", hint: wallet.requestedPaise ? `${formatPaise(wallet.requestedPaise)} processing` : "Sent to you" },
    { label: "Lifetime earned", value: wallet.lifetimePaise, icon: "trending", hint: "From verified payments" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className={cn("lux-card p-5", c.strong && "gold-edge bg-gradient-to-b from-gold-400/[0.08] to-transparent")}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-[12.5px] font-medium text-mist">{c.label}</p>
            <span className="icon-tile h-9 w-9 rounded-[11px]">
              <Icon name={c.icon} className="h-4 w-4" />
            </span>
          </div>
          <p className={cn("display mt-3 text-[1.9rem] leading-none", c.strong ? "text-gold-100" : "text-ivory", c.value < 0 && "text-ember")}>{formatPaise(c.value)}</p>
          <p className="mt-2.5 text-[12px] text-smoke">{c.hint}</p>
        </div>
      ))}
    </div>
  );
}

function ReferralCard({ code }: { code: string }) {
  const { settings } = useContent();
  const link = referralLink(code);
  const [copied, setCopied] = useState<"" | "link" | "code">("");
  const copy = async (what: "link" | "code") => {
    if (await copyText(what === "link" ? link : code)) {
      setCopied(what);
      track("partner_copy", { what });
      window.setTimeout(() => setCopied(""), 1800);
    }
  };
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  return (
    <div className="lux-card gold-edge p-6 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="label text-gold-300">Your referral link</p>
        <button type="button" onClick={() => void copy("code")} className="chip chip-gold gap-1.5" title="Copy referral code">
          Code <span className="font-mono">{code}</span>
          <Icon name={copied === "code" ? "check" : "copy"} className="h-3 w-3" />
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
        <input readOnly value={link} onFocus={(e) => e.target.select()} className="field font-mono text-[13px]" aria-label="Referral link" />
        <button type="button" onClick={() => void copy("link")} className="btn btn-gold shrink-0">
          <Icon name={copied === "link" ? "check" : "copy"} className="h-4 w-4" /> {copied === "link" ? "Copied" : "Copy link"}
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {canShare ? (
          <button
            type="button"
            className="btn btn-line btn-sm"
            onClick={() => {
              track("partner_share", { via: "native" });
              void navigator.share({ title: settings.name, text: `Need a website or app? ${settings.short} builds them — reach out through my link:`, url: link }).catch(() => {});
            }}
          >
            <Icon name="send" className="h-4 w-4" /> Share
          </button>
        ) : null}
        {shareTargets(link, settings.short).map((t) => (
          <a key={t.id} href={t.href} target="_blank" rel="noopener noreferrer" onClick={() => track("partner_share", { via: t.id })} className="btn btn-ghost btn-sm">
            <Icon name={t.icon} className="h-4 w-4" /> {t.label}
          </a>
        ))}
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-smoke">
        Anyone who opens this link and contacts us, books a call or pays online within 60 days is linked to you automatically.
      </p>
    </div>
  );
}

function OverviewTab({ me, go }: { me: PartnerMe; go: (tab: Tab) => void }) {
  const { stats, partner, program } = me;
  const conversion = stats.leads ? Math.round((stats.converted / stats.leads) * 100) : 0;
  return (
    <div className="space-y-6">
      <WalletCards wallet={me.wallet} />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <ReferralCard code={partner.referralCode} />
        <div className="lux-card p-6 md:p-7">
          <p className="label">Your numbers</p>
          <dl className="mt-5 grid grid-cols-2 gap-5">
            {[
              ["Link visits", stats.clicks],
              ["Leads", stats.leads],
              ["Converted", `${stats.converted}${stats.leads ? ` · ${conversion}%` : ""}`],
              ["All-time rank", stats.rank ? `#${stats.rank}` : "—"],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <dt className="text-[12px] text-smoke">{k}</dt>
                <dd className="display mt-1 text-[1.7rem] leading-none text-ivory">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-2 border-t border-gold-300/10 pt-5">
            <button type="button" onClick={() => go("leads")} className="btn btn-gold btn-sm">
              <Icon name="plus" className="h-4 w-4" /> Register a client
            </button>
            <button type="button" onClick={() => go("earnings")} className="btn btn-line btn-sm">
              Withdraw
            </button>
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="lux-card p-6 md:p-7">
          <p className="label">How you get paid</p>
          <ol className="mt-5 space-y-4">
            {[
              `The client pays us — an advance or any installment.`,
              `We verify the payment and ${program.commissionPercent}% is credited to your wallet automatically.`,
              `After ${program.holdDays} days on hold it becomes available to withdraw.`,
              `Withdraw from ₹${program.minPayout.toLocaleString("en-IN")} to UPI or bank.`,
            ].map((step, i) => (
              <li key={step} className="flex gap-3 text-[13.5px] text-sand">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-gold-300/30 font-mono text-[10px] text-gold-200">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <Leaderboard highlightName={shortName(partner.fullName)} />
      </div>
    </div>
  );
}

function shortName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length < 2 ? parts[0] ?? "" : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

function LeadsTab({ onChanged }: { onChanged: () => void }) {
  const { collections } = useContent();
  const [leads, setLeads] = useState<PartnerLead[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", companyName: "", email: "", phone: "", service: "", budget: "", details: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await partnerApi.leads();
    if (res.ok) setLeads(res.data ?? []);
    else {
      setLeads([]);
      setError(res.error ?? "Couldn't load your leads.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const next: Errors = {};
    if (form.name.trim().length < 2) next.name = "Enter the client's name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = "Enter the client's email address.";
    if (form.details.trim().length < 10) next.details = "Describe what the client needs (at least 10 characters).";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setMessage(null);
    const res = await partnerApi.submitLead({ ...form, name: form.name.trim(), email: form.email.trim(), details: form.details.trim() });
    setBusy(false);
    if (res.ok) {
      track("partner_lead_submitted");
      setMessage({ tone: "success", text: `Lead registered (${res.data?.reference}). Our team will contact the client — you'll see the stage update here.` });
      setForm({ name: "", companyName: "", email: "", phone: "", service: "", budget: "", details: "" });
      setOpen(false);
      void load();
      onChanged();
    } else {
      if (res.errors) setErrors(res.errors);
      setMessage({ tone: "error", text: res.error ?? "Couldn't register the lead." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="display text-[1.8rem]">Your leads</h2>
          <p className="mt-1 text-[13.5px] text-mist">Clients who came through your link and clients you registered. Contact details are hidden for privacy.</p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="btn btn-gold btn-sm shrink-0" aria-expanded={open}>
          <Icon name={open ? "minus" : "plus"} className="h-4 w-4" /> {open ? "Close form" : "Register a client"}
        </button>
      </div>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      {open ? (
        <form onSubmit={submit} className="lux-card gold-edge p-6 md:p-8" noValidate>
          <p className="text-[14px] text-sand">Only register people who have agreed to hear from us. We'll reach out mentioning your name.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Client name" required error={errors.name} htmlFor="l-name">
              <input id="l-name" className="field" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Business / company" hint="optional" htmlFor="l-company">
              <input id="l-company" className="field" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
            </Field>
            <Field label="Client email" required error={errors.email} htmlFor="l-email">
              <input id="l-email" className="field" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Client phone" hint="optional" error={errors.phone} htmlFor="l-phone">
              <input id="l-phone" className="field" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="What they need" hint="optional" htmlFor="l-service">
              <select id="l-service" className="field" value={form.service} onChange={(e) => set("service", e.target.value)}>
                <option value="">Not sure yet</option>
                {collections.services.map((s) => (
                  <option key={s.id} value={s.title}>
                    {s.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Rough budget" hint="optional" htmlFor="l-budget">
              <input id="l-budget" className="field" placeholder="e.g. ₹30,000" value={form.budget} onChange={(e) => set("budget", e.target.value)} />
            </Field>
            <Field label="Details" required error={errors.details} htmlFor="l-details" className="sm:col-span-2">
              <textarea id="l-details" rows={4} className="field" placeholder="What the business does and what they want built." value={form.details} onChange={(e) => set("details", e.target.value)} />
            </Field>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="submit" disabled={busy} className="btn btn-gold">
              {busy ? "Registering…" : "Register lead"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="lux-card overflow-x-auto">
        {leads === null ? (
          <div className="flex items-center justify-center gap-3 py-16 text-[13.5px] text-mist">
            <Spinner /> Loading leads…
          </div>
        ) : error ? (
          <div className="p-6">
            <Notice tone="error">{error}</Notice>
          </div>
        ) : leads.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Icon name="inbox" className="mx-auto h-7 w-7 text-gold-300" />
            <p className="mt-4 text-[15px] font-semibold text-ivory">No leads yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] text-mist">Share your referral link or register a client above. Every lead appears here with its stage and earnings.</p>
          </div>
        ) : (
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-gold-300/10">
                {["Client", "Need", "Stage", "Paid so far", "Your commission", "Added"].map((h) => (
                  <th key={h} scope="col" className="label px-5 py-3.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b border-gold-300/[0.06] last:border-0">
                  <td className="px-5 py-3.5">
                    <p className="text-[14px] font-semibold text-ivory">{l.client}</p>
                    <p className="text-[12px] text-smoke">
                      {l.company ? `${l.company} · ` : ""}
                      {l.email} · {l.via === "submitted" ? "registered by you" : "via your link"}
                    </p>
                  </td>
                  <td className="max-w-[200px] truncate px-5 py-3.5 text-[13px] text-sand">{l.service}</td>
                  <td className="px-5 py-3.5">
                    <Pill value={l.stage} />
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[12.5px] text-sand">
                    {formatPaise(l.paidPaise)}
                    {l.installments ? <span className="ml-1.5 text-smoke">· {l.installments} payment{l.installments === 1 ? "" : "s"}</span> : null}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[13px] font-semibold text-gold-200">{formatPaise(l.commissionPaise)}</td>
                  <td className="px-5 py-3.5 text-[12.5px] whitespace-nowrap text-smoke">{timeAgo(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function EarningsTab({ me, onChanged }: { me: PartnerMe; onChanged: () => void }) {
  const [data, setData] = useState<{ wallet: Wallet; commissions: Commission[]; payouts: Payout[] } | null>(null);
  const [error, setError] = useState("");
  const hasUpi = Boolean(me.partner.payout.upiId);
  const hasBank = Boolean(me.partner.payout.bankAccountMasked);
  const [method, setMethod] = useState<"upi" | "bank">(hasUpi ? "upi" : "bank");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const min = me.program.minPayout;

  const load = useCallback(async () => {
    const res = await partnerApi.earnings();
    if (res.ok && res.data) setData(res.data);
    else setError(res.error ?? "Couldn't load your earnings.");
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const wallet = data?.wallet ?? me.wallet;
  const openRequest = data?.payouts.find((p) => p.status === "requested");
  const canWithdraw = wallet.availablePaise >= min * 100 && !openRequest && (hasUpi || hasBank);

  const withdraw = async (all: boolean) => {
    if (busy) return;
    const rupees = Number(amount);
    if (!all && (!Number.isFinite(rupees) || rupees < min)) {
      setMessage({ tone: "error", text: `Enter at least ₹${min.toLocaleString("en-IN")}.` });
      return;
    }
    setBusy(true);
    setMessage(null);
    const res = await partnerApi.requestPayout(all ? { all: true, method } : { amount: rupees, method });
    setBusy(false);
    if (res.ok && res.data) {
      track("partner_payout_requested");
      setMessage({ tone: "success", text: `Withdrawal of ${formatPaise(res.data.amountPaise)} requested (${res.data.reference}). We'll send it to ${res.data.destination}.` });
      setAmount("");
      void load();
      onChanged();
    } else setMessage({ tone: "error", text: res.error ?? "Couldn't request the withdrawal." });
  };

  return (
    <div className="space-y-6">
      <WalletCards wallet={wallet} />

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="lux-card gold-edge p-6 md:p-7">
          <p className="label text-gold-300">Withdraw</p>
          <p className="display mt-3 text-[2.2rem] leading-none text-ivory">{formatPaise(Math.max(0, wallet.availablePaise))}</p>
          <p className="mt-1.5 text-[12.5px] text-mist">available · minimum ₹{min.toLocaleString("en-IN")}</p>

          {!hasUpi && !hasBank ? (
            <div className="mt-5">
              <Notice>Add a UPI ID or bank account in your profile to withdraw.</Notice>
            </div>
          ) : (
            <>
              <div className="mt-5 flex flex-wrap gap-2" role="radiogroup" aria-label="Send to">
                {hasUpi ? (
                  <button type="button" role="radio" aria-checked={method === "upi"} onClick={() => setMethod("upi")} className="choice rounded-full px-4 py-2 text-[12.5px] font-medium">
                    UPI · {me.partner.payout.upiId}
                  </button>
                ) : null}
                {hasBank ? (
                  <button type="button" role="radio" aria-checked={method === "bank"} onClick={() => setMethod("bank")} className="choice rounded-full px-4 py-2 text-[12.5px] font-medium">
                    Bank · {me.partner.payout.bankAccountMasked}
                  </button>
                ) : null}
              </div>
              <div className="mt-4 flex gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[14px] text-smoke">₹</span>
                  <input
                    inputMode="decimal"
                    className="field pl-8 font-mono"
                    placeholder={String(min)}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                    disabled={!canWithdraw}
                    aria-label="Amount to withdraw in rupees"
                  />
                </div>
                <button type="button" className="btn btn-gold shrink-0" disabled={!canWithdraw || busy} onClick={() => void withdraw(false)}>
                  {busy ? "…" : "Withdraw"}
                </button>
              </div>
              <button type="button" className="btn btn-ghost btn-sm mt-2" disabled={!canWithdraw || busy} onClick={() => void withdraw(true)}>
                Withdraw everything available
              </button>
            </>
          )}
          {openRequest ? (
            <div className="mt-4">
              <Notice>
                {formatPaise(openRequest.amountPaise)} is being processed ({openRequest.reference}). You can request again once it's paid.
              </Notice>
            </div>
          ) : null}
          {message ? (
            <div className="mt-4">
              <Notice tone={message.tone}>{message.text}</Notice>
            </div>
          ) : null}
        </div>

        <div className="lux-card overflow-x-auto">
          <div className="border-b border-gold-300/10 px-5 py-4">
            <p className="text-[14px] font-semibold text-ivory">Withdrawals</p>
          </div>
          {!data ? (
            <div className="flex items-center justify-center gap-3 py-12 text-[13.5px] text-mist">{error ? error : <><Spinner /> Loading…</>}</div>
          ) : data.payouts.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-smoke">No withdrawals yet.</p>
          ) : (
            <table className="w-full min-w-[520px] text-left">
              <tbody>
                {data.payouts.map((p) => (
                  <tr key={p.id} className="border-b border-gold-300/[0.06] last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-mono text-[13px] font-semibold text-ivory">{formatPaise(p.amountPaise)}</p>
                      <p className="text-[11.5px] text-smoke">{p.destination}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Pill value={p.status} />
                      {p.note ? <p className="mt-1 max-w-[220px] text-[11.5px] text-smoke">{p.note}</p> : null}
                    </td>
                    <td className="px-5 py-3 text-right text-[12px] text-smoke">
                      {p.utr ? <p className="font-mono text-sand">UTR {p.utr}</p> : null}
                      {prettyDate(p.processedAt ?? p.requestedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="lux-card overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold-300/10 px-5 py-4">
          <p className="text-[14px] font-semibold text-ivory">Commission history</p>
          <p className="text-[12px] text-smoke">{me.program.commissionPercent}% of each verified client payment</p>
        </div>
        {!data ? (
          <div className="flex items-center justify-center gap-3 py-12 text-[13.5px] text-mist">{error ? error : <><Spinner /> Loading…</>}</div>
        ) : data.commissions.length === 0 ? (
          <p className="px-5 py-12 text-center text-[13px] text-smoke">Commission appears here as soon as a client you referred makes a verified payment.</p>
        ) : (
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-gold-300/10">
                {["Client", "Payment", "Client paid", "Commission", "Status", "Date"].map((h) => (
                  <th key={h} scope="col" className="label px-5 py-3.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.commissions.map((c) => (
                <tr key={c.id} className="border-b border-gold-300/[0.06] last:border-0">
                  <td className="px-5 py-3.5 text-[13.5px] font-semibold text-ivory">{c.clientName}</td>
                  <td className="px-5 py-3.5 text-[12.5px] text-sand">
                    {c.installment || "Payment"}
                    <span className="block font-mono text-[11px] text-smoke">{c.paymentReference}</span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[12.5px] text-sand">{formatPaise(c.basePaise)}</td>
                  <td className={cn("px-5 py-3.5 font-mono text-[13px] font-semibold", c.state === "reversed" ? "text-smoke line-through" : "text-gold-200")}>
                    +{formatPaise(c.amountPaise)}
                  </td>
                  <td className="px-5 py-3.5">
                    <Pill value={c.state} />
                    {c.state === "held" ? <p className="mt-1 text-[11px] text-smoke">until {prettyDate(c.availableAt)}</p> : null}
                    {c.reversedReason ? <p className="mt-1 max-w-[220px] text-[11px] text-smoke">{c.reversedReason}</p> : null}
                  </td>
                  <td className="px-5 py-3.5 text-[12.5px] whitespace-nowrap text-smoke">{prettyDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AmbassadorTab({ me, onChanged }: { me: PartnerMe; onChanged: () => void }) {
  const [apps, setApps] = useState<AmbassadorApplication[] | null>(null);
  const [form, setForm] = useState({ college: me.partner.college, yearOfStudy: "", motivation: "", reach: "", socialLinks: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await partnerApi.applications();
    setApps(res.ok ? res.data ?? [] : []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const next: Errors = {};
    if (!form.yearOfStudy) next.yearOfStudy = "Choose your year of study.";
    if (form.motivation.trim().length < 30) next.motivation = "Tell us a little more (at least 30 characters).";
    if (form.reach.trim().length < 5) next.reach = "Tell us about your clubs, societies or audience.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    const res = await partnerApi.apply(form);
    setBusy(false);
    if (res.ok) {
      track("ambassador_applied");
      setMessage({ tone: "success", text: "Application sent. We review every application personally and will reply here." });
      void load();
      onChanged();
    } else {
      if (res.errors) setErrors(res.errors);
      setMessage({ tone: "error", text: res.error ?? "Couldn't send the application." });
    }
  };

  const pending = apps?.find((a) => a.status === "pending");
  const isAmbassador = me.partner.tier === "ambassador";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="lux-card gold-edge p-6 md:p-8">
        <p className="label text-gold-300">Campus Ambassador</p>
        {isAmbassador ? (
          <>
            <h2 className="display mt-4 text-[2rem] leading-tight">
              You're a <span className="serif-accent text-gold">Campus Ambassador.</span>
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-mist">
              Your badge shows on the leaderboard. Keep sharing your link with student-run businesses, societies and alumni at {me.partner.college}.
            </p>
          </>
        ) : pending ? (
          <>
            <h2 className="display mt-4 text-[2rem] leading-tight">Application under review</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-mist">Sent {timeAgo(pending.createdAt)}. You'll see the decision here — meanwhile, keep earning as a partner.</p>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            <h2 className="display mt-4 text-[1.8rem] leading-tight">Represent us at your college</h2>
            <p className="mt-2 text-[13.5px] text-mist">Same {me.program.commissionPercent}% commission, plus the Ambassador badge and a direct line to our team.</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="College" required htmlFor="a-college" className="sm:col-span-2">
                <input id="a-college" className="field" value={form.college} onChange={(e) => set("college", e.target.value)} />
              </Field>
              <Field label="Year of study" required error={errors.yearOfStudy} htmlFor="a-year">
                <select id="a-year" className="field" value={form.yearOfStudy} onChange={(e) => set("yearOfStudy", e.target.value)}>
                  <option value="">Select</option>
                  {YEARS_OF_STUDY.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Clubs, societies or audience" required error={errors.reach} htmlFor="a-reach">
                <input id="a-reach" className="field" placeholder="e.g. Coding club lead, 400 members" value={form.reach} onChange={(e) => set("reach", e.target.value)} />
              </Field>
              <Field label="Why you?" required hint={`${form.motivation.trim().length}/30+`} error={errors.motivation} htmlFor="a-why" className="sm:col-span-2">
                <textarea id="a-why" rows={5} className="field" placeholder="What you'd do on campus and who you could bring in." value={form.motivation} onChange={(e) => set("motivation", e.target.value)} />
              </Field>
              <Field label="LinkedIn / Instagram links" hint="optional" htmlFor="a-social" className="sm:col-span-2">
                <input id="a-social" className="field" value={form.socialLinks} onChange={(e) => set("socialLinks", e.target.value)} />
              </Field>
            </div>
            <button type="submit" disabled={busy} className="btn btn-gold mt-6">
              {busy ? "Sending…" : "Send application"}
            </button>
          </form>
        )}
        {message ? (
          <div className="mt-5">
            <Notice tone={message.tone}>{message.text}</Notice>
          </div>
        ) : null}
      </div>

      <div className="lux-card p-6 md:p-7">
        <p className="label">Your applications</p>
        {apps === null ? (
          <div className="flex items-center gap-3 py-8 text-[13px] text-mist">
            <Spinner /> Loading…
          </div>
        ) : apps.length === 0 ? (
          <p className="mt-5 text-[13px] text-smoke">You haven't applied yet.</p>
        ) : (
          <ul className="mt-5 space-y-4">
            {apps.map((a) => (
              <li key={a.id} className="rounded-2xl border border-gold-300/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13.5px] font-semibold text-ivory">{a.college}</p>
                  <Pill value={a.status} />
                </div>
                <p className="mt-1 text-[12px] text-smoke">
                  {a.yearOfStudy} · applied {prettyDate(a.createdAt)}
                </p>
                {a.reviewNote ? <p className="mt-2.5 text-[13px] text-sand">“{a.reviewNote}”</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProfileTab({ me, onChanged, onLogout }: { me: PartnerMe; onChanged: () => void; onLogout: () => void }) {
  const p = me.partner;
  const [profile, setProfile] = useState({ fullName: p.fullName, phone: p.phone, college: p.college, course: p.course, graduationYear: p.graduationYear ? String(p.graduationYear) : "", city: p.city, region: p.region });
  const [payout, setPayout] = useState({ upiId: p.payout.upiId, bankAccountName: "", bankAccountNumber: "", bankIfsc: "", pan: "", currentPassword: "", removeBank: false });
  const [passwords, setPasswords] = useState({ current: "", next: "" });
  const [msg, setMsg] = useState<Record<string, { tone: "error" | "success"; text: string } | undefined>>({});
  const [busy, setBusy] = useState("");

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setBusy("profile");
    const res = await partnerApi.updateProfile({ ...profile, graduationYear: profile.graduationYear ? Number(profile.graduationYear) : null });
    setBusy("");
    setMsg((m) => ({ ...m, profile: res.ok ? { tone: "success", text: "Profile saved." } : { tone: "error", text: Object.values(res.errors ?? {})[0] ?? res.error ?? "Couldn't save." } }));
    if (res.ok) onChanged();
  };

  const toggleBoard = async () => {
    const res = await partnerApi.updateProfile({ showOnLeaderboard: !p.showOnLeaderboard });
    setMsg((m) => ({ ...m, board: res.ok ? undefined : { tone: "error", text: res.error ?? "Couldn't update." } }));
    if (res.ok) onChanged();
  };

  const savePayout = async (e: FormEvent) => {
    e.preventDefault();
    setBusy("payout");
    // Blank bank / PAN fields keep what's on file (the server holds the full numbers, the browser never does).
    const res = await partnerApi.updatePayout({
      currentPassword: payout.currentPassword,
      upiId: payout.upiId.trim(),
      bankAccountName: payout.bankAccountName.trim(),
      bankAccountNumber: payout.bankAccountNumber.trim(),
      bankIfsc: payout.bankIfsc.trim(),
      pan: payout.pan.trim(),
      removeBank: payout.removeBank,
    });
    setBusy("");
    setMsg((m) => ({ ...m, payout: res.ok ? { tone: "success", text: "Payout details updated." } : { tone: "error", text: Object.values(res.errors ?? {})[0] ?? res.error ?? "Couldn't save." } }));
    if (res.ok) {
      setPayout((x) => ({ ...x, currentPassword: "", bankAccountName: "", bankAccountNumber: "", bankIfsc: "", pan: "", removeBank: false }));
      onChanged();
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    const problem = partnerPasswordProblem(passwords.next);
    if (problem) {
      setMsg((m) => ({ ...m, password: { tone: "error", text: `New password: ${problem}` } }));
      return;
    }
    setBusy("password");
    const res = await partnerApi.changePassword(passwords.current, passwords.next);
    setBusy("");
    setMsg((m) => ({ ...m, password: res.ok ? { tone: "success", text: "Password changed. Other devices were signed out." } : { tone: "error", text: res.error ?? "Couldn't change it." } }));
    if (res.ok) setPasswords({ current: "", next: "" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={saveProfile} className="lux-card p-6 md:p-7" noValidate>
        <p className="label">Contact & college</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="pf-name">
            <input id="pf-name" className="field field-sm" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
          </Field>
          <Field label="Mobile" htmlFor="pf-phone">
            <input id="pf-phone" className="field field-sm" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </Field>
          <Field label="Email" hint="contact us to change" htmlFor="pf-email" className="sm:col-span-2">
            <input id="pf-email" className="field field-sm" value={p.email} disabled />
          </Field>
          <Field label="College" htmlFor="pf-college" className="sm:col-span-2">
            <input id="pf-college" className="field field-sm" value={profile.college} onChange={(e) => setProfile({ ...profile, college: e.target.value })} />
          </Field>
          <Field label="Course" htmlFor="pf-course">
            <input id="pf-course" className="field field-sm" value={profile.course} onChange={(e) => setProfile({ ...profile, course: e.target.value })} />
          </Field>
          <Field label="Graduation year" htmlFor="pf-year">
            <input id="pf-year" className="field field-sm" inputMode="numeric" value={profile.graduationYear} onChange={(e) => setProfile({ ...profile, graduationYear: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
          </Field>
          <Field label="City" htmlFor="pf-city">
            <input id="pf-city" className="field field-sm" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
          </Field>
          <Field label="State / region" htmlFor="pf-region">
            <select id="pf-region" className="field field-sm" value={profile.region} onChange={(e) => setProfile({ ...profile, region: e.target.value })}>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {msg.profile ? (
          <div className="mt-4">
            <Notice tone={msg.profile.tone}>{msg.profile.text}</Notice>
          </div>
        ) : null}
        <button type="submit" disabled={busy === "profile"} className="btn btn-gold btn-sm mt-5">
          {busy === "profile" ? "Saving…" : "Save profile"}
        </button>
      </form>

      <div className="space-y-6">
        <form onSubmit={savePayout} className="lux-card p-6 md:p-7" noValidate>
          <p className="label">Payout details</p>
          <p className="mt-2 text-[12.5px] text-smoke">
            {p.payout.bankAccountMasked ? `Bank on file: ${p.payout.bankAccountName} · ${p.payout.bankAccountMasked} · ${p.payout.bankIfsc}. Leave the bank fields blank to keep it. ` : ""}
            Changes need your current password and are flagged to our team for security.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="UPI ID" htmlFor="po-upi" className="sm:col-span-2">
              <input id="po-upi" className="field field-sm font-mono" value={payout.upiId} onChange={(e) => setPayout({ ...payout, upiId: e.target.value })} placeholder="yourname@okaxis" />
            </Field>
            <Field label={p.payout.bankAccountMasked ? "New account holder" : "Account holder"} htmlFor="po-holder">
              <input id="po-holder" className="field field-sm" value={payout.bankAccountName} disabled={payout.removeBank} onChange={(e) => setPayout({ ...payout, bankAccountName: e.target.value })} />
            </Field>
            <Field label={p.payout.bankAccountMasked ? "New account number" : "Account number"} htmlFor="po-acct">
              <input id="po-acct" className="field field-sm font-mono" inputMode="numeric" autoComplete="off" value={payout.bankAccountNumber} disabled={payout.removeBank} onChange={(e) => setPayout({ ...payout, bankAccountNumber: e.target.value })} />
            </Field>
            <Field label="IFSC" htmlFor="po-ifsc">
              <input id="po-ifsc" className="field field-sm font-mono uppercase" value={payout.bankIfsc} disabled={payout.removeBank} onChange={(e) => setPayout({ ...payout, bankIfsc: e.target.value })} placeholder={p.payout.bankIfsc || "HDFC0001234"} />
            </Field>
            <Field label="PAN" hint={p.payout.panMasked ? `on file ${p.payout.panMasked}` : "optional"} htmlFor="po-pan">
              <input id="po-pan" className="field field-sm font-mono uppercase" maxLength={10} value={payout.pan} onChange={(e) => setPayout({ ...payout, pan: e.target.value })} />
            </Field>
            {p.payout.bankAccountMasked ? (
              <label className="flex items-center gap-2.5 text-[12.5px] text-sand sm:col-span-2">
                <input type="checkbox" className="h-4 w-4 accent-gold-400" checked={payout.removeBank} onChange={(e) => setPayout({ ...payout, removeBank: e.target.checked })} />
                Remove the bank account on file (UPI only)
              </label>
            ) : null}
            <Field label="Current password" htmlFor="po-pass" className="sm:col-span-2">
              <input id="po-pass" type="password" autoComplete="current-password" className="field field-sm" value={payout.currentPassword} onChange={(e) => setPayout({ ...payout, currentPassword: e.target.value })} />
            </Field>
          </div>
          {msg.payout ? (
            <div className="mt-4">
              <Notice tone={msg.payout.tone}>{msg.payout.text}</Notice>
            </div>
          ) : null}
          <button type="submit" disabled={busy === "payout" || !payout.currentPassword} className="btn btn-line btn-sm mt-5">
            {busy === "payout" ? "Saving…" : "Update payout details"}
          </button>
        </form>

        <form onSubmit={savePassword} className="lux-card p-6 md:p-7" noValidate>
          <p className="label">Password</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Current password" htmlFor="pw-cur">
              <input id="pw-cur" type="password" autoComplete="current-password" className="field field-sm" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
            </Field>
            <Field label="New password" htmlFor="pw-new">
              <input id="pw-new" type="password" autoComplete="new-password" className="field field-sm" value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} />
            </Field>
          </div>
          {msg.password ? (
            <div className="mt-4">
              <Notice tone={msg.password.tone}>{msg.password.text}</Notice>
            </div>
          ) : null}
          <button type="submit" disabled={busy === "password" || !passwords.current || !passwords.next} className="btn btn-line btn-sm mt-5">
            {busy === "password" ? "Saving…" : "Change password"}
          </button>
        </form>

        <div className="lux-card p-6 md:p-7">
          <button type="button" role="switch" aria-checked={p.showOnLeaderboard} onClick={() => void toggleBoard()} className="flex w-full items-center justify-between gap-4 text-left">
            <span>
              <span className="block text-[13.5px] font-semibold text-parchment">Show me on the public leaderboard</span>
              <span className="mt-0.5 block text-[12px] text-smoke">Only your first name, last initial and college are shown.</span>
            </span>
            <span className="toggle" data-on={p.showOnLeaderboard} aria-hidden />
          </button>
          {msg.board ? (
            <div className="mt-4">
              <Notice tone={msg.board.tone}>{msg.board.text}</Notice>
            </div>
          ) : null}
          <button type="button" onClick={onLogout} className="btn btn-ghost btn-sm mt-5">
            <Icon name="logout" className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ me, reload, onLogout }: { me: PartnerMe; reload: () => void; onLogout: () => void }) {
  const { query, navigate } = useRouter();
  const requested = query.get("tab") as Tab | null;
  const tab: Tab = TABS.some((t) => t.id === requested) ? (requested as Tab) : "overview";
  const welcome = query.get("welcome") === "1";
  const go = (next: Tab) => {
    navigate(next === "overview" ? "/partner" : `/partner?tab=${next}`, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const p = me.partner;

  return (
    <section className="relative pt-32 pb-24 md:pt-40">
      <div className="shell">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Partner dashboard</p>
            <h1 className="display mt-5 text-[2.3rem] leading-tight sm:text-[2.9rem]">
              Hi, <span className="serif-accent text-gold">{p.fullName.split(/\s+/)[0]}.</span>
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-mist">
              <span className="chip font-mono">ID {p.partnerCode}</span>
              <Pill value={p.tier} />
              {me.ambassadorStatus === "pending" && p.tier !== "ambassador" ? <Pill value="pending" /> : null}
              <span className="text-smoke">
                {p.college} · joined {prettyDate(p.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={reload} className="btn btn-ghost btn-icon h-10 w-10" aria-label="Refresh" title="Refresh">
              <Icon name="refresh" className="h-4 w-4" />
            </button>
            <button type="button" onClick={onLogout} className="btn btn-line btn-sm">
              <Icon name="logout" className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>

        {welcome ? (
          <div className="mt-6">
            <Notice tone="success">
              Welcome aboard! Your Partner ID is <span className="font-mono font-semibold">{p.partnerCode}</span> and your wallet is ready. Share your link below to start earning.
            </Notice>
          </div>
        ) : null}

        <nav className="mt-8 flex gap-1.5 overflow-x-auto border-b border-gold-300/10 pb-3" aria-label="Dashboard sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition",
                tab === t.id ? "border-gold-300/50 bg-gold-400/15 text-gold-100" : "border-transparent text-mist hover:text-ivory",
              )}
            >
              <Icon name={t.icon} className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="mt-8">
          {tab === "overview" ? <OverviewTab me={me} go={go} /> : null}
          {tab === "leads" ? <LeadsTab onChanged={reload} /> : null}
          {tab === "earnings" ? <EarningsTab me={me} onChanged={reload} /> : null}
          {tab === "ambassador" ? <AmbassadorTab me={me} onChanged={reload} /> : null}
          {tab === "profile" ? <ProfileTab me={me} onChanged={reload} onLogout={onLogout} /> : null}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Entry                                                              */
/* ------------------------------------------------------------------ */
export default function PartnerPortal() {
  const [me, setMe] = useState<PartnerMe | null>(null);
  const [checking, setChecking] = useState(() => Boolean(getPartnerToken()));
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    if (!getPartnerToken()) {
      setMe(null);
      setChecking(false);
      return;
    }
    const res = await partnerApi.me();
    if (res.ok && res.data) {
      setMe(res.data);
      setNotice("");
      setLoadError("");
    } else if (res.offline) setLoadError("We can't reach the server right now. Please check your connection and refresh.");
    else {
      setMe(null);
      if (res.status !== 401) setNotice(res.error ?? "");
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const expired = (e: Event) => {
      setMe(null);
      setNotice((e as CustomEvent<string | undefined>).detail || "Your session expired. Please sign in again.");
    };
    window.addEventListener("wx:partner-auth-expired", expired);
    return () => window.removeEventListener("wx:partner-auth-expired", expired);
  }, []);

  const logout = useCallback(() => {
    void partnerApi.logout();
    setMe(null);
    setNotice("");
  }, []);

  if (checking) {
    return (
      <div className="grid min-h-[75vh] place-items-center pt-24" role="status">
        <span className="flex items-center gap-3 text-[13.5px] text-mist">
          <Spinner /> Opening your dashboard…
        </span>
      </div>
    );
  }
  if (loadError && !me) {
    return (
      <section className="shell grid min-h-[75vh] place-items-center pt-36 pb-24 text-center">
        <div>
          <p className="text-[15px] text-sand">{loadError}</p>
          <button type="button" className="btn btn-gold mt-6" onClick={() => void load()}>
            Try again
          </button>
        </div>
      </section>
    );
  }
  if (!me) return <AuthView onAuthed={() => void load()} notice={notice} />;
  return <Dashboard me={me} reload={() => void load()} onLogout={logout} />;
}
