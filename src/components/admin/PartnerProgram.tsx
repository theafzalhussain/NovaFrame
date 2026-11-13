/**
 * Admin — Student Partner program: partners (with fraud tools) and partner leads.
 * Money screens (client payments, payouts) and ambassador approvals live in PartnerOps.tsx.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { LEAD_STATUSES } from "../../data/types";
import { REGIONS } from "../../data/partner";
import { isDemoSession } from "../../lib/api";
import { useContent } from "../../lib/content";
import {
  csvSafe,
  formatPaise,
  paiseToRupees,
  partnerAdmin,
  type AdminPartnerDetail,
  type AdminPartnerLead,
  type AdminPartnerRow,
  type PartnerOverview,
} from "../../lib/partner";
import { prettyDate, timeAgo } from "../../lib/site";
import { Icon } from "../Icons";
import { cn } from "../../utils/cn";
import {
  Badge,
  BarList,
  Drawer,
  EmptyState,
  FieldShell,
  Kpi,
  LoadingBlock,
  Modal,
  PageHeader,
  Panel,
  SearchInput,
  Segmented,
  Toggle,
  downloadFile,
  toCsv,
  useConfirm,
  useToast,
} from "./AdminUI";

/* ================================================================== */
/* Shared pieces (also used by PartnerOps.tsx)                        */
/* ================================================================== */
export const FLAG_LABELS: Record<string, string> = {
  self_referral_attempt: "Tried to refer themself",
  payout_details_changed: "Changed payout details",
  many_signups_same_ip: "Many sign-ups from one network",
};

export function exportCsv(name: string, rows: Record<string, unknown>[]) {
  downloadFile(`partner-${name}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(csvSafe(rows)), "text/csv");
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const demo = isDemoSession();
  return (
    <EmptyState
      icon={demo ? "server" : "alert"}
      title={demo ? "The partner program needs the live API" : "Couldn't load this list"}
      body={demo ? "Partner accounts, payments and payouts are real money, so they are never simulated in the demo workspace. Start the API and sign in." : message}
      action={
        demo ? undefined : (
          <button type="button" className="btn btn-line btn-sm" onClick={onRetry}>
            <Icon name="refresh" className="h-4 w-4" /> Retry
          </button>
        )
      }
    />
  );
}

/** One-field confirmation dialog (reason, UTR, note…), with optional extra controls. */
export function PromptModal({
  title,
  body,
  label,
  placeholder,
  minLength = 0,
  confirmLabel = "Confirm",
  tone = "default",
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  body?: ReactNode;
  label: string;
  placeholder?: string;
  minLength?: number;
  confirmLabel?: string;
  tone?: "default" | "danger";
  onClose: () => void;
  onSubmit: (value: string) => Promise<boolean>;
  children?: ReactNode;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = value.trim().length >= minLength;
  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const done = await onSubmit(value.trim());
    setBusy(false);
    if (done) onClose();
  };
  return (
    <Modal
      title={title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={cn("btn btn-sm", tone === "danger" ? "btn-danger" : "btn-gold")} disabled={!valid || busy} onClick={() => void submit()}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      {body ? <div className="mb-4 text-[13.5px] leading-relaxed text-mist">{body}</div> : null}
      <FieldShell label={label} required={minLength > 0}>
        <textarea autoFocus rows={3} className="field" value={value} placeholder={placeholder} onChange={(e) => setValue(e.target.value)} />
      </FieldShell>
      {children ? <div className="mt-4 space-y-2">{children}</div> : null}
    </Modal>
  );
}

/* ================================================================== */
/* Partners                                                           */
/* ================================================================== */
const EMPTY_NEW = { fullName: "", email: "", phone: "", college: "", region: "", upiId: "", password: "", tier: "partner" };

function CreatePartnerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_NEW);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof EMPTY_NEW, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    setBusy(true);
    const res = await partnerAdmin.create(form);
    setBusy(false);
    if (res.ok) {
      toast(`Partner ${res.data?.partnerCode} created. Share the temporary password privately.`);
      onCreated();
      onClose();
    } else toast(res.error ?? "Couldn't create the partner.", "error");
  };
  return (
    <Modal
      title="Add a partner"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-gold btn-sm" disabled={busy} onClick={() => void submit()}>
            {busy ? "Creating…" : "Create partner"}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldShell label="Full name" required>
          <input className="field field-sm" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </FieldShell>
        <FieldShell label="Mobile" required>
          <input className="field field-sm" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </FieldShell>
        <FieldShell label="Email" required className="sm:col-span-2">
          <input className="field field-sm" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </FieldShell>
        <FieldShell label="College" required className="sm:col-span-2">
          <input className="field field-sm" value={form.college} onChange={(e) => set("college", e.target.value)} />
        </FieldShell>
        <FieldShell label="State / region" required>
          <select className="field field-sm" value={form.region} onChange={(e) => set("region", e.target.value)}>
            <option value="">Select</option>
            {REGIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </FieldShell>
        <FieldShell label="Tier">
          <select className="field field-sm" value={form.tier} onChange={(e) => set("tier", e.target.value)}>
            <option value="partner">Student Partner</option>
            <option value="ambassador">Campus Ambassador</option>
          </select>
        </FieldShell>
        <FieldShell label="UPI ID" required hint="or add a bank later">
          <input className="field field-sm font-mono" value={form.upiId} onChange={(e) => set("upiId", e.target.value)} />
        </FieldShell>
        <FieldShell label="Temporary password" required hint="8+, letters & numbers">
          <input className="field field-sm font-mono" value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="off" />
        </FieldShell>
      </div>
    </Modal>
  );
}

function PartnerDrawer({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState<AdminPartnerDetail | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [tab, setTab] = useState<"leads" | "commissions" | "payouts" | "applications">("commissions");
  const [prompt, setPrompt] = useState<null | "suspend" | "password" | { reverse: number }>(null);
  const [reverseHeld, setReverseHeld] = useState(false);
  const [rejectPayouts, setRejectPayouts] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await partnerAdmin.detail(id);
    if (res.ok && res.data) {
      const p = res.data.partner;
      setData(res.data);
      setForm({
        fullName: p.fullName,
        email: p.email,
        phone: p.phone,
        college: p.college,
        course: p.course,
        graduationYear: p.graduationYear ? String(p.graduationYear) : "",
        city: p.city,
        region: p.region,
        upiId: p.payout.upiId,
        bankAccountName: p.payout.bankAccountName,
        bankAccountNumber: p.payout.bankAccountNumber,
        bankIfsc: p.payout.bankIfsc,
        pan: p.payout.pan,
        tier: p.tier,
        adminNotes: p.adminNotes,
        showOnLeaderboard: p.showOnLeaderboard,
      });
    } else toast(res.error ?? "Couldn't load the partner.", "error");
  }, [id, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const res = await partnerAdmin.update(id, { ...form, graduationYear: form.graduationYear ? Number(form.graduationYear) : null });
    setSaving(false);
    if (res.ok) {
      toast("Partner saved.");
      onChanged();
      void load();
    } else toast(res.error ?? "Save failed.", "error");
  };

  if (!data) {
    return (
      <Drawer title="Partner" onClose={onClose}>
        <LoadingBlock />
      </Drawer>
    );
  }

  const p = data.partner;
  const w = data.wallet;
  const suspended = p.status === "suspended";

  return (
    <>
      <Drawer
        title={p.fullName}
        width="max-w-3xl"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{p.partnerCode}</span>· ref <span className="font-mono">{p.referralCode}</span>· joined {prettyDate(p.createdAt)}
            {p.lastLoginAt ? ` · last seen ${timeAgo(p.lastLoginAt)}` : ""}
          </span>
        }
        onClose={onClose}
        footer={
          <>
            <button
              type="button"
              className="btn btn-danger btn-sm mr-auto"
              onClick={async () => {
                const ok = await confirm({ title: "Delete this partner?", body: "Only possible when they have no payment history. Their leads stay in the CRM, unlinked.", confirmLabel: "Delete partner", tone: "danger" });
                if (!ok) return;
                const res = await partnerAdmin.remove(id);
                if (res.ok) {
                  toast("Partner deleted.");
                  onChanged();
                  onClose();
                } else toast(res.error ?? "Delete failed.", "error");
              }}
            >
              <Icon name="trash" className="h-4 w-4" /> Delete
            </button>
            {suspended ? (
              <button
                type="button"
                className="btn btn-line btn-sm"
                onClick={async () => {
                  const res = await partnerAdmin.reactivate(id);
                  if (res.ok) {
                    toast("Partner reactivated.");
                    onChanged();
                    void load();
                  } else toast(res.error ?? "Couldn't reactivate.", "error");
                }}
              >
                <Icon name="check-circle" className="h-4 w-4" /> Reactivate
              </button>
            ) : (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setPrompt("suspend")}>
                <Icon name="shield" className="h-4 w-4" /> Suspend
              </button>
            )}
            <button type="button" className="btn btn-gold btn-sm" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </>
        }
      >
        <div className="space-y-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge value={p.status} />
            <Badge value={p.tier} label={p.tier === "ambassador" ? "Campus Ambassador" : "Student Partner"} />
            <span className="text-[12px] text-smoke">{data.clicks} link visits · {data.leads.length} leads</span>
          </div>

          {suspended ? (
            <div className="rounded-2xl border border-ember/40 bg-ember/10 px-4 py-3 text-[13px] text-parchment">
              Suspended {p.suspendedAt ? timeAgo(p.suspendedAt) : ""}: {p.suspendedReason}
            </div>
          ) : null}
          {p.flags.length ? (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-300/[0.07] px-4 py-3 text-[13px] text-amber-100">
              <Icon name="alert" className="h-4 w-4" />
              {p.flags.map((f) => FLAG_LABELS[f] ?? f).join(" · ")}
              <button
                type="button"
                className="btn btn-ghost btn-sm ml-auto"
                onClick={async () => {
                  const res = await partnerAdmin.update(id, { clearFlags: true });
                  if (res.ok) {
                    toast("Flags cleared.");
                    onChanged();
                    void load();
                  }
                }}
              >
                Mark reviewed
              </button>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ["Available", w.availablePaise],
              ["On hold", w.heldPaise],
              ["Paid out", w.paidOutPaise],
              ["Lifetime", w.lifetimePaise],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-2xl border border-gold-300/10 bg-ink-950/50 px-4 py-3">
                <p className="label text-[9.5px]">{k}</p>
                <p className={cn("mt-1 font-mono text-[15px] font-semibold", Number(v) < 0 ? "text-ember" : "text-gold-100")}>{formatPaise(Number(v))}</p>
              </div>
            ))}
          </div>
          <p className="-mt-4 text-[11.5px] text-smoke">Wallet balances are calculated from verified commissions and payouts — they can't be edited.</p>

          <div>
            <p className="label mb-3">Profile</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["fullName", "Full name"],
                  ["email", "Email"],
                  ["phone", "Mobile"],
                  ["college", "College"],
                  ["course", "Course"],
                  ["graduationYear", "Graduation year"],
                  ["city", "City"],
                ] as const
              ).map(([k, label]) => (
                <FieldShell key={k} label={label}>
                  <input className="field field-sm" value={String(form[k] ?? "")} onChange={(e) => set(k, e.target.value)} />
                </FieldShell>
              ))}
              <FieldShell label="State / region">
                <select className="field field-sm" value={String(form.region ?? "")} onChange={(e) => set("region", e.target.value)}>
                  {REGIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </FieldShell>
              <FieldShell label="Tier">
                <select className="field field-sm" value={String(form.tier)} onChange={(e) => set("tier", e.target.value)}>
                  <option value="partner">Student Partner</option>
                  <option value="ambassador">Campus Ambassador</option>
                </select>
              </FieldShell>
            </div>
          </div>

          <div>
            <p className="label mb-3">Payout details</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["upiId", "UPI ID"],
                  ["bankAccountName", "Account holder"],
                  ["bankAccountNumber", "Account number"],
                  ["bankIfsc", "IFSC"],
                  ["pan", "PAN"],
                ] as const
              ).map(([k, label]) => (
                <FieldShell key={k} label={label}>
                  <input className="field field-sm font-mono" value={String(form[k] ?? "")} onChange={(e) => set(k, e.target.value)} />
                </FieldShell>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <FieldShell label="Internal notes">
              <textarea rows={3} className="field" value={String(form.adminNotes ?? "")} onChange={(e) => set("adminNotes", e.target.value)} placeholder="Visible to admins only" />
            </FieldShell>
            <Toggle checked={Boolean(form.showOnLeaderboard)} onChange={(v) => set("showOnLeaderboard", v)} label="Show on public leaderboard" />
            <button type="button" className="btn btn-line btn-sm" onClick={() => setPrompt("password")}>
              <Icon name="key" className="h-4 w-4" /> Set a temporary password
            </button>
          </div>

          <div>
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: "commissions", label: `Commissions ${data.commissions.length}` },
                { value: "payouts", label: `Payouts ${data.payouts.length}` },
                { value: "leads", label: `Leads ${data.leads.length}` },
                { value: "applications", label: `Applications ${data.applications.length}` },
              ]}
            />
            <div className="mt-4 overflow-x-auto rounded-2xl border border-gold-300/10">
              {tab === "commissions" ? (
                data.commissions.length ? (
                  <table className="w-full min-w-[620px] text-left text-[12.5px]">
                    <tbody>
                      {data.commissions.map((c) => (
                        <tr key={c.id} className="border-b border-gold-300/[0.06] last:border-0">
                          <td className="px-4 py-2.5 text-parchment">
                            {c.clientName}
                            <span className="block font-mono text-[11px] text-smoke">
                              {c.paymentReference} · {c.installment || "payment"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-sand">{formatPaise(c.basePaise)} × {c.rateBps / 100}%</td>
                          <td className={cn("px-4 py-2.5 font-mono font-semibold", c.status === "reversed" ? "text-smoke line-through" : "text-gold-200")}>{formatPaise(c.amountPaise)}</td>
                          <td className="px-4 py-2.5">
                            <Badge value={c.status} />
                            {c.reversedReason ? <span className="mt-1 block text-[11px] text-smoke">{c.reversedReason}</span> : null}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {c.status === "earned" ? (
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPrompt({ reverse: c.id })}>
                                Reverse
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-4 py-8 text-center text-[13px] text-smoke">No commissions yet.</p>
                )
              ) : null}
              {tab === "payouts" ? (
                data.payouts.length ? (
                  <table className="w-full min-w-[560px] text-left text-[12.5px]">
                    <tbody>
                      {data.payouts.map((o) => (
                        <tr key={o.id} className="border-b border-gold-300/[0.06] last:border-0">
                          <td className="px-4 py-2.5 font-mono font-semibold text-ivory">{formatPaise(o.amountPaise)}</td>
                          <td className="px-4 py-2.5 text-sand">{o.destination}</td>
                          <td className="px-4 py-2.5">
                            <Badge value={o.status} />
                          </td>
                          <td className="px-4 py-2.5 text-right text-smoke">
                            {o.utr ? <span className="block font-mono text-sand">UTR {o.utr}</span> : null}
                            {prettyDate(o.processedAt ?? o.requestedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-4 py-8 text-center text-[13px] text-smoke">No payouts yet.</p>
                )
              ) : null}
              {tab === "leads" ? (
                data.leads.length ? (
                  <table className="w-full min-w-[560px] text-left text-[12.5px]">
                    <tbody>
                      {data.leads.map((l) => (
                        <tr key={l.id} className="border-b border-gold-300/[0.06] last:border-0">
                          <td className="px-4 py-2.5 text-parchment">
                            {l.name}
                            <span className="block text-[11px] text-smoke">{l.email}</span>
                          </td>
                          <td className="px-4 py-2.5 text-sand">{l.service}</td>
                          <td className="px-4 py-2.5">
                            <Badge value={l.status} />
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-sand">{formatPaise(l.paidPaise)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-4 py-8 text-center text-[13px] text-smoke">No leads yet.</p>
                )
              ) : null}
              {tab === "applications" ? (
                data.applications.length ? (
                  <ul className="divide-y divide-gold-300/[0.06]">
                    {data.applications.map((a) => (
                      <li key={a.id} className="px-4 py-3 text-[12.5px]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-parchment">
                            {a.college} · {a.yearOfStudy}
                          </span>
                          <Badge value={a.status} />
                        </div>
                        <p className="mt-1.5 text-mist">{a.motivation}</p>
                        <p className="mt-1 text-smoke">Reach: {a.reach}</p>
                        {a.reviewNote ? <p className="mt-1 text-smoke">Note: {a.reviewNote}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-8 text-center text-[13px] text-smoke">No ambassador applications.</p>
                )
              ) : null}
            </div>
          </div>
        </div>
      </Drawer>

      {prompt === "suspend" ? (
        <PromptModal
          title={`Suspend ${p.fullName}?`}
          body="They are signed out at once and can't sign in, register leads, earn new commission or withdraw. The reason is shown to them."
          label="Reason"
          placeholder="e.g. Fake leads reported by clients"
          minLength={3}
          confirmLabel="Suspend partner"
          tone="danger"
          onClose={() => setPrompt(null)}
          onSubmit={async (reason) => {
            const res = await partnerAdmin.suspend(id, { reason, reverseHeld, rejectPayouts });
            if (!res.ok) {
              toast(res.error ?? "Couldn't suspend.", "error");
              return false;
            }
            toast("Partner suspended.");
            onChanged();
            void load();
            return true;
          }}
        >
          <Toggle checked={rejectPayouts} onChange={setRejectPayouts} label="Reject open withdrawal requests" />
          <Toggle checked={reverseHeld} onChange={setReverseHeld} label="Reverse commission still on hold" description={`${formatPaise(w.heldPaise)} on hold right now`} />
        </PromptModal>
      ) : null}
      {prompt === "password" ? (
        <PromptModal
          title="Set a temporary password"
          body="All of the partner's sessions are signed out. Share the password privately and ask them to change it from their profile."
          label="Temporary password (8+, letters & numbers)"
          minLength={8}
          confirmLabel="Set password"
          onClose={() => setPrompt(null)}
          onSubmit={async (password) => {
            const res = await partnerAdmin.update(id, { password });
            if (!res.ok) {
              toast(res.error ?? "Couldn't set the password.", "error");
              return false;
            }
            toast("Temporary password set.");
            return true;
          }}
        />
      ) : null}
      {prompt && typeof prompt === "object" ? (
        <PromptModal
          title="Reverse this commission?"
          body="The amount is removed from the partner's wallet. If it was already paid out, their balance goes negative and is recovered from future earnings. This can't be undone."
          label="Reason (shown to the partner)"
          minLength={3}
          confirmLabel="Reverse commission"
          tone="danger"
          onClose={() => setPrompt(null)}
          onSubmit={async (reason) => {
            const res = await partnerAdmin.reverseCommission(prompt.reverse, reason);
            if (!res.ok) {
              toast(res.error ?? "Couldn't reverse.", "error");
              return false;
            }
            toast("Commission reversed.");
            onChanged();
            void load();
            return true;
          }}
        />
      ) : null}
    </>
  );
}

export function PartnersPanel({ focusId }: { focusId?: number | null }) {
  const toast = useToast();
  const [overview, setOverview] = useState<PartnerOverview | null>(null);
  const [rows, setRows] = useState<AdminPartnerRow[] | null>(null);
  const [facets, setFacets] = useState<{ colleges: string[]; regions: string[] }>({ colleges: [], regions: [] });
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [college, setCollege] = useState("");
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [tier, setTier] = useState("");
  const [flagged, setFlagged] = useState(false);
  const [openId, setOpenId] = useState<number | null>(focusId ?? null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    const [list, ov] = await Promise.all([
      partnerAdmin.list({ q: debounced, college, region, status: status === "all" ? "" : status, tier, flagged }),
      partnerAdmin.overview(),
    ]);
    if (list.ok && list.data) {
      setRows(list.data.partners);
      setFacets(list.data.facets);
      setError("");
    } else {
      setRows([]);
      setError(list.error ?? "Couldn't load partners.");
    }
    if (ov.ok && ov.data) setOverview(ov.data);
  }, [debounced, college, region, status, tier, flagged]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportPartners = () => {
    if (!rows?.length) return;
    exportCsv(
      "partners",
      rows.map((p) => ({
        partner_id: p.partnerCode,
        referral_code: p.referralCode,
        name: p.fullName,
        email: p.email,
        phone: p.phone,
        college: p.college,
        course: p.course,
        graduation_year: p.graduationYear ?? "",
        city: p.city,
        region: p.region,
        tier: p.tier,
        status: p.status,
        flags: p.flags.join(" "),
        leads: p.leads,
        converted: p.converted,
        lifetime_inr: paiseToRupees(p.wallet.lifetimePaise),
        on_hold_inr: paiseToRupees(p.wallet.heldPaise),
        available_inr: paiseToRupees(p.wallet.availablePaise),
        paid_out_inr: paiseToRupees(p.wallet.paidOutPaise),
        upi: p.payout.upiId,
        bank_account_name: p.payout.bankAccountName,
        bank_account_number: p.payout.bankAccountNumber,
        bank_ifsc: p.payout.bankIfsc,
        pan: p.payout.pan,
        joined: p.createdAt,
      })),
    );
    toast(`Exported ${rows.length} partners.`, "info");
  };

  const exportLedger = async () => {
    const res = await partnerAdmin.commissions();
    if (!res.ok || !res.data) return toast(res.error ?? "Couldn't load the ledger.", "error");
    exportCsv(
      "commission-ledger",
      res.data.map((c) => ({
        commission_id: c.id,
        date: c.createdAt,
        partner_id: c.partnerCode,
        partner: c.partnerName,
        college: c.college,
        region: c.region,
        client: c.clientName,
        payment_ref: c.paymentReference,
        installment: c.installment ?? "",
        client_paid_inr: paiseToRupees(c.basePaise),
        rate_percent: c.rateBps / 100,
        commission_inr: paiseToRupees(c.amountPaise),
        status: c.status,
        available_from: c.availableAt,
        reversed_reason: c.reversedReason ?? "",
        reversed_by: c.reversedBy ?? "",
      })),
    );
    toast(`Exported ${res.data.length} ledger entries.`, "info");
  };

  const k = overview?.kpis;
  const filtersOn = Boolean(q || college || region || status !== "all" || tier || flagged);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Partner program"
        title="Partners"
        description={`Student Partners and Campus Ambassadors. Commission is ${overview?.program.commissionPercent ?? 20}% of each verified client payment, held ${overview?.program.holdDays ?? 7} days.`}
        actions={
          <>
            <button type="button" onClick={exportPartners} className="btn btn-line btn-sm" disabled={!rows?.length}>
              <Icon name="download" className="h-4 w-4" /> Partners CSV
            </button>
            <button type="button" onClick={() => void exportLedger()} className="btn btn-line btn-sm">
              <Icon name="download" className="h-4 w-4" /> Commission ledger
            </button>
            <button type="button" onClick={() => setCreating(true)} className="btn btn-gold btn-sm">
              <Icon name="plus" className="h-4 w-4" /> Add partner
            </button>
            <button type="button" onClick={() => void load()} className="btn btn-ghost btn-icon h-9 w-9" aria-label="Refresh">
              <Icon name="refresh" className="h-4 w-4" />
            </button>
          </>
        }
      />

      {k ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Partners" icon="users" value={k.partners} hint={`${k.active} active · ${k.suspended} suspended · +${k.newThisWeek} this week`} />
          <Kpi label="Verified partner revenue" icon="trending" value={formatPaise(k.verifiedRevenuePaise)} hint={`${k.converted} of ${k.leads} leads converted`} />
          <Kpi label="Commission owed" icon="rupee" value={formatPaise(k.liabilityPaise)} hint={`${formatPaise(k.commissionHeldPaise)} on hold · ${formatPaise(k.payoutsPaidPaise)} paid`} />
          <Kpi label="Needs action" icon="bell" value={k.payoutsRequested + k.pendingPayments + k.pendingApplications} hint={`${k.payoutsRequested} payouts · ${k.pendingPayments} payments · ${k.pendingApplications} applications`} />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Name, email, phone, Partner ID…" className="xl:w-80" />
        <div className="flex flex-wrap items-center gap-2">
          <select className="field field-sm w-auto max-w-[220px]" value={college} onChange={(e) => setCollege(e.target.value)} aria-label="Filter by college">
            <option value="">All colleges</option>
            {facets.colleges.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select className="field field-sm w-auto max-w-[200px]" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Filter by region">
            <option value="">All regions</option>
            {facets.regions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <select className="field field-sm w-auto" value={tier} onChange={(e) => setTier(e.target.value)} aria-label="Filter by tier">
            <option value="">All tiers</option>
            <option value="partner">Partners</option>
            <option value="ambassador">Ambassadors</option>
          </select>
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
            ]}
          />
          <button
            type="button"
            onClick={() => setFlagged((v) => !v)}
            aria-pressed={flagged}
            className={cn("rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition", flagged ? "border-amber-300/50 bg-amber-300/10 text-amber-100" : "border-gold-300/10 text-mist hover:text-ivory")}
          >
            <Icon name="alert" className="mr-1 inline h-3.5 w-3.5" /> Flagged{k?.flagged ? ` ${k.flagged}` : ""}
          </button>
          {filtersOn ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setQ("");
                setCollege("");
                setRegion("");
                setStatus("all");
                setTier("");
                setFlagged(false);
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="lux-card overflow-x-auto">
        {rows === null ? (
          <LoadingBlock />
        ) : error ? (
          <LoadError message={error} onRetry={() => void load()} />
        ) : rows.length === 0 ? (
          <EmptyState icon="users" title={filtersOn ? "No partners match" : "No partners yet"} body={filtersOn ? "Try other filters." : "Partners appear here as soon as students register at /partner."} />
        ) : (
          <table className="w-full min-w-[1000px] text-left">
            <thead>
              <tr className="border-b border-gold-300/10">
                {["Partner", "College · region", "Tier", "Status", "Leads", "Lifetime", "Available", "Joined"].map((h) => (
                  <th key={h} scope="col" className="label px-5 py-3.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} onClick={() => setOpenId(p.id)} className="cursor-pointer border-b border-gold-300/[0.06] transition last:border-0 hover:bg-gold-300/[0.035]">
                  <td className="px-5 py-3.5">
                    <p className="flex items-center gap-2 text-[14px] font-semibold text-ivory">
                      {p.fullName}
                      {p.flags.length ? (
                        <span title="Flagged for review">
                          <Icon name="alert" className="h-3.5 w-3.5 text-amber-200" />
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[12px] text-smoke">
                      <span className="font-mono">{p.partnerCode}</span> · {p.email}
                    </p>
                  </td>
                  <td className="max-w-[240px] px-5 py-3.5 text-[13px] text-sand">
                    <span className="block truncate">{p.college}</span>
                    <span className="block text-[12px] text-smoke">{p.region}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge value={p.tier} />
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge value={p.status} />
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[12.5px] text-sand">
                    {p.leads} <span className="text-smoke">/ {p.converted} won</span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[12.5px] text-gold-200">{formatPaise(p.wallet.lifetimePaise)}</td>
                  <td className={cn("px-5 py-3.5 font-mono text-[12.5px]", p.wallet.availablePaise < 0 ? "text-ember" : "text-sand")}>{formatPaise(p.wallet.availablePaise)}</td>
                  <td className="px-5 py-3.5 text-[12.5px] whitespace-nowrap text-smoke">{timeAgo(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {overview && (overview.colleges.length || overview.regions.length) ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Top colleges">
            <BarList items={overview.colleges} />
          </Panel>
          <Panel title="Top regions">
            <BarList items={overview.regions} />
          </Panel>
        </div>
      ) : null}

      {openId ? <PartnerDrawer id={openId} onClose={() => setOpenId(null)} onChanged={() => void load()} /> : null}
      {creating ? <CreatePartnerModal onClose={() => setCreating(false)} onCreated={() => void load()} /> : null}
    </div>
  );
}

/* ================================================================== */
/* Partner leads                                                      */
/* ================================================================== */
const EMPTY_LEAD = { partnerId: "", name: "", email: "", phone: "", companyName: "", service: "", budget: "", details: "" };

export function PartnerLeadsPanel({ openLead }: { openLead: (id: number) => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { collections } = useContent();
  const [rows, setRows] = useState<AdminPartnerLead[] | null>(null);
  const [partners, setPartners] = useState<AdminPartnerRow[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [college, setCollege] = useState("");
  const [region, setRegion] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_LEAD);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [leads, list] = await Promise.all([
      partnerAdmin.leads({ partnerId: partnerId ? Number(partnerId) : undefined, college, region }),
      partnerAdmin.list(),
    ]);
    if (leads.ok) {
      setRows(leads.data ?? []);
      setError("");
    } else {
      setRows([]);
      setError(leads.error ?? "Couldn't load partner leads.");
    }
    if (list.ok && list.data) setPartners(list.data.partners);
  }, [partnerId, college, region]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter((l) => !s || `${l.name} ${l.email} ${l.companyName ?? ""} ${l.reference} ${l.partnerName} ${l.partnerCode}`.toLowerCase().includes(s));
  }, [rows, q]);

  const colleges = useMemo(() => [...new Set(partners.map((p) => p.college))].sort(), [partners]);
  const regions = useMemo(() => [...new Set(partners.map((p) => p.region))].sort(), [partners]);

  const patch = async (id: number, body: { partnerId?: number | null; status?: string }, message: string) => {
    const res = await partnerAdmin.updateLead(id, body);
    if (res.ok) {
      toast(message);
      void load();
    } else toast(res.error ?? "Update failed.", "error");
  };

  const create = async () => {
    setBusy(true);
    const res = await partnerAdmin.createLead({ ...form, partnerId: Number(form.partnerId) });
    setBusy(false);
    if (res.ok) {
      toast(`Lead ${res.data?.reference} created.`);
      setCreating(false);
      setForm(EMPTY_LEAD);
      void load();
    } else toast(res.error ?? "Couldn't create the lead.", "error");
  };

  const exportRows = () => {
    exportCsv(
      "leads",
      filtered.map((l) => ({
        lead_ref: l.reference,
        created: l.createdAt,
        client: l.name,
        company: l.companyName ?? "",
        email: l.email,
        phone: l.phone ?? "",
        service: l.service,
        budget: l.budget,
        stage: l.status,
        source: l.source,
        partner_id: l.partnerCode,
        partner: l.partnerName,
        college: l.college,
        region: l.region,
        verified_paid_inr: paiseToRupees(l.paidPaise),
        commission_inr: paiseToRupees(l.commissionPaise),
      })),
    );
    toast(`Exported ${filtered.length} leads.`, "info");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Partner program"
        title="Partner leads"
        description="Every client referred by a partner — through their link or registered from their dashboard. Reassign, unlink or move stages here; full notes live in the Leads CRM."
        actions={
          <>
            <button type="button" onClick={exportRows} className="btn btn-line btn-sm" disabled={!filtered.length}>
              <Icon name="download" className="h-4 w-4" /> Export CSV
            </button>
            <button type="button" onClick={() => setCreating(true)} className="btn btn-gold btn-sm" disabled={!partners.length}>
              <Icon name="plus" className="h-4 w-4" /> Add lead
            </button>
            <button type="button" onClick={() => void load()} className="btn btn-ghost btn-icon h-9 w-9" aria-label="Refresh">
              <Icon name="refresh" className="h-4 w-4" />
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Client, email, partner…" className="xl:w-80" />
        <div className="flex flex-wrap gap-2">
          <select className="field field-sm w-auto max-w-[240px]" value={partnerId} onChange={(e) => setPartnerId(e.target.value)} aria-label="Filter by partner">
            <option value="">All partners</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} · {p.partnerCode}
              </option>
            ))}
          </select>
          <select className="field field-sm w-auto max-w-[220px]" value={college} onChange={(e) => setCollege(e.target.value)} aria-label="Filter by college">
            <option value="">All colleges</option>
            {colleges.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select className="field field-sm w-auto max-w-[200px]" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Filter by region">
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="lux-card overflow-x-auto">
        {rows === null ? (
          <LoadingBlock />
        ) : error ? (
          <LoadError message={error} onRetry={() => void load()} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="inbox" title={rows.length ? "No leads match" : "No partner leads yet"} body="Referred enquiries, bookings and payments show up here automatically." />
        ) : (
          <table className="w-full min-w-[1080px] text-left">
            <thead>
              <tr className="border-b border-gold-300/10">
                {["Client", "Partner", "Stage", "Verified paid", "Commission", "Received", ""].map((h, i) => (
                  <th key={i} scope="col" className="label px-5 py-3.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-gold-300/[0.06] last:border-0">
                  <td className="px-5 py-3.5">
                    <button type="button" onClick={() => openLead(l.id)} className="text-left">
                      <span className="block text-[14px] font-semibold text-ivory hover:text-gold-200">{l.name}</span>
                      <span className="block text-[12px] text-smoke">
                        {l.companyName ? `${l.companyName} · ` : ""}
                        {l.email} · via {l.source}
                      </span>
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      className="field field-sm w-auto max-w-[220px]"
                      value={l.partnerId}
                      onChange={(e) => {
                        const next = e.target.value;
                        void (async () => {
                          if (next === "") {
                            const ok = await confirm({ title: "Remove the referral link?", body: "The lead stays in the CRM. Future payments from this client won't earn this partner commission.", confirmLabel: "Unlink", tone: "danger" });
                            if (ok) void patch(l.id, { partnerId: null }, "Referral link removed.");
                          } else void patch(l.id, { partnerId: Number(next) }, "Lead reassigned.");
                        })();
                      }}
                      aria-label="Referring partner"
                    >
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} · {p.partnerCode}
                        </option>
                      ))}
                      <option value="">— Unlink partner —</option>
                    </select>
                    <span className="mt-1 block text-[11.5px] text-smoke">
                      {l.college} · {l.region}
                      {l.partnerStatus === "suspended" ? " · suspended" : ""}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <select className="field field-sm w-auto capitalize" value={l.status} onChange={(e) => void patch(l.id, { status: e.target.value }, `Moved to ${e.target.value}.`)} aria-label="Pipeline stage">
                      {LEAD_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[12.5px] text-sand">{formatPaise(l.paidPaise)}</td>
                  <td className="px-5 py-3.5 font-mono text-[12.5px] text-gold-200">{formatPaise(l.commissionPaise)}</td>
                  <td className="px-5 py-3.5 text-[12.5px] whitespace-nowrap text-smoke">{timeAgo(l.createdAt)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon h-8 w-8"
                      aria-label="Delete lead"
                      title="Delete lead"
                      onClick={async () => {
                        const ok = await confirm({ title: `Delete ${l.name}'s lead?`, body: "Only possible when it has no verified payments. This removes it from the CRM too.", confirmLabel: "Delete lead", tone: "danger" });
                        if (!ok) return;
                        const res = await partnerAdmin.removeLead(l.id);
                        if (res.ok) {
                          toast("Lead deleted.");
                          void load();
                        } else toast(res.error ?? "Delete failed.", "error");
                      }}
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating ? (
        <Modal
          title="Add a partner lead"
          onClose={() => setCreating(false)}
          footer={
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-gold btn-sm" disabled={busy || !form.partnerId} onClick={() => void create()}>
                {busy ? "Saving…" : "Create lead"}
              </button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldShell label="Referring partner" required className="sm:col-span-2">
              <select className="field field-sm" value={form.partnerId} onChange={(e) => setForm({ ...form, partnerId: e.target.value })}>
                <option value="">Select</option>
                {partners
                  .filter((p) => p.status === "active")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} · {p.partnerCode} · {p.college}
                    </option>
                  ))}
              </select>
            </FieldShell>
            <FieldShell label="Client name" required>
              <input className="field field-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FieldShell>
            <FieldShell label="Company">
              <input className="field field-sm" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </FieldShell>
            <FieldShell label="Client email" required>
              <input className="field field-sm" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </FieldShell>
            <FieldShell label="Phone">
              <input className="field field-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </FieldShell>
            <FieldShell label="Service">
              <select className="field field-sm" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                <option value="">Not sure yet</option>
                {collections.services.map((s) => (
                  <option key={s.id}>{s.title}</option>
                ))}
              </select>
            </FieldShell>
            <FieldShell label="Budget">
              <input className="field field-sm" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </FieldShell>
            <FieldShell label="Details" required className="sm:col-span-2">
              <textarea rows={3} className="field" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
            </FieldShell>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
