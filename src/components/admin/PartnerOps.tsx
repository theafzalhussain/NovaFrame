/**
 * Admin — Student Partner program: client payments (the only source of commission),
 * partner payouts and Campus Ambassador approvals.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { PAYMENT_METHODS, commissionPaise } from "../../data/partner";
import { admin, type AdminUser, type Lead } from "../../lib/api";
import {
  formatPaise,
  paiseToRupees,
  partnerAdmin,
  type AdminApplication,
  type AdminPayout,
  type ClientPayment,
  type PaymentInput,
} from "../../lib/partner";
import { prettyDate, timeAgo } from "../../lib/site";
import { Icon } from "../Icons";
import { cn } from "../../utils/cn";
import { Badge, EmptyState, FieldShell, LoadingBlock, Modal, PageHeader, SearchInput, Segmented, useConfirm, useToast } from "./AdminUI";
import { FLAG_LABELS, LoadError, PromptModal, exportCsv } from "./PartnerProgram";

/* ================================================================== */
/* Client payments                                                    */
/* ================================================================== */
type PaymentStatus = "all" | ClientPayment["status"];
type PaymentForm = { enquiryId: string; amount: string; installmentLabel: string; method: string; externalRef: string; paidOn: string; notes: string };
const today = () => new Date().toLocaleDateString("en-CA");
const EMPTY_PAYMENT: PaymentForm = { enquiryId: "", amount: "", installmentLabel: "", method: "UPI", externalRef: "", paidOn: today(), notes: "" };

function PaymentModal({ editing, percent, onClose, onSaved }: { editing: ClientPayment | null; percent: number; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<PaymentForm>(() =>
    editing
      ? {
          enquiryId: editing.enquiryId ? String(editing.enquiryId) : "",
          amount: paiseToRupees(editing.amountPaise).replace(/\.00$/, ""),
          installmentLabel: editing.installment ?? "",
          method: editing.method ?? "",
          externalRef: editing.externalRef ?? "",
          paidOn: editing.paidOn ?? "",
          notes: editing.notes ?? "",
        }
      : { ...EMPTY_PAYMENT, paidOn: today() },
  );

  useEffect(() => {
    void admin.leads().then((res) => res.ok && setLeads(res.data ?? []));
  }, []);

  const options = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = leads.filter((l) => !s || `${l.name} ${l.email} ${l.reference} ${l.companyName ?? ""} ${l.partner ?? ""}`.toLowerCase().includes(s));
    // Partner-referred clients first: those are the ones that earn commission.
    return [...list].sort((a, b) => Number(Boolean(b.partner)) - Number(Boolean(a.partner))).slice(0, 200);
  }, [leads, search]);
  const selected = leads.find((l) => String(l.id) === form.enquiryId);
  const paise = Math.round(Number(form.amount) * 100);
  const preview = selected?.partner && Number.isFinite(paise) && paise > 0 ? commissionPaise(paise, percent) : 0;

  const submit = async () => {
    const payload: PaymentInput = {
      enquiryId: Number(form.enquiryId),
      amount: Number(form.amount),
      installmentLabel: form.installmentLabel,
      method: form.method,
      externalRef: form.externalRef,
      paidOn: form.paidOn,
      notes: form.notes,
    };
    setBusy(true);
    const res = editing ? await partnerAdmin.updatePayment(editing.id, payload) : await partnerAdmin.recordPayment(payload);
    setBusy(false);
    if (res.ok) {
      toast(editing ? "Payment updated." : "Payment recorded — verify it once the money shows in your account.");
      onSaved();
      onClose();
    } else toast(res.error ?? "Couldn't save the payment.", "error");
  };

  return (
    <Modal
      title={editing ? `Edit ${editing.reference}` : "Record a client payment"}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-gold btn-sm" disabled={busy || !form.enquiryId || !(paise > 0)} onClick={() => void submit()}>
            {busy ? "Saving…" : editing ? "Save" : "Record as pending"}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldShell label="Client (lead)" required className="sm:col-span-2" hint={`${leads.length} leads`}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, reference, partner…" />
          <select className="field field-sm mt-2" size={5} value={form.enquiryId} onChange={(e) => setForm({ ...form, enquiryId: e.target.value })}>
            {options.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} · {l.email} · {l.reference}
                {l.partner ? ` · ★ ${l.partner}` : ""}
              </option>
            ))}
          </select>
        </FieldShell>
        <FieldShell label="Amount received (₹)" required>
          <input className="field field-sm font-mono" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, "") })} />
        </FieldShell>
        <FieldShell label="Installment">
          <input className="field field-sm" list="installment-labels" placeholder="e.g. Advance (40%)" value={form.installmentLabel} onChange={(e) => setForm({ ...form, installmentLabel: e.target.value })} />
          <datalist id="installment-labels">
            {["Full payment", "Advance (40%)", "Advance (50%)", "Milestone 2", "Milestone 3", "Final payment", "Monthly retainer"].map((x) => (
              <option key={x} value={x} />
            ))}
          </datalist>
        </FieldShell>
        <FieldShell label="Method">
          <select className="field field-sm" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option value="">—</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </FieldShell>
        <FieldShell label="Transaction ref / UTR" hint="prevents double entry">
          <input className="field field-sm font-mono" value={form.externalRef} onChange={(e) => setForm({ ...form, externalRef: e.target.value })} />
        </FieldShell>
        <FieldShell label="Received on">
          <input type="date" className="field field-sm" value={form.paidOn} onChange={(e) => setForm({ ...form, paidOn: e.target.value })} />
        </FieldShell>
        <FieldShell label="Notes">
          <input className="field field-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </FieldShell>
      </div>
      <div className="mt-5 rounded-2xl border border-gold-300/15 bg-gold-400/[0.05] px-4 py-3 text-[13px] text-sand">
        {selected?.partner ? (
          <>
            Referred by <span className="font-semibold text-gold-100">{selected.partner}</span>. Once you <strong>verify</strong> this payment, the server credits{" "}
            <span className="font-mono font-semibold text-gold-200">{formatPaise(preview)}</span> ({percent}%) to their wallet.
          </>
        ) : selected ? (
          "This client wasn't referred by a partner — no commission will be created."
        ) : (
          "Pick the client this payment came from. Payments start as pending and earn nothing until verified."
        )}
      </div>
    </Modal>
  );
}

export function ClientPaymentsPanel({ user }: { user: AdminUser }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<ClientPayment[] | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [q, setQ] = useState("");
  const [percent, setPercent] = useState(20);
  const [modal, setModal] = useState<null | "new" | ClientPayment>(null);
  const [prompt, setPrompt] = useState<null | { kind: "reject" | "refund"; row: ClientPayment }>(null);

  const load = useCallback(async () => {
    const res = await partnerAdmin.payments();
    if (res.ok) {
      setRows(res.data ?? []);
      setError("");
    } else {
      setRows([]);
      setError(res.error ?? "Couldn't load payments.");
    }
  }, []);
  useEffect(() => {
    void load();
    void partnerAdmin.overview().then((res) => res.ok && res.data && setPercent(res.data.program.commissionPercent));
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows?.length ?? 0 };
    for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? [])
      .filter((r) => status === "all" || r.status === status)
      .filter((r) => !s || `${r.reference} ${r.clientName} ${r.clientEmail ?? ""} ${r.partnerName ?? ""} ${r.partnerCode ?? ""} ${r.externalRef ?? ""}`.toLowerCase().includes(s));
  }, [rows, status, q]);

  const verify = async (r: ClientPayment) => {
    const ok = await confirm({
      title: `Verify ${formatPaise(r.amountPaise)} from ${r.clientName}?`,
      body: `Only confirm once the money is in your account. ${r.partnerName ? `${r.partnerName} will be credited ${percent}% automatically.` : "No partner commission applies."} Verified payments can't be edited, only refunded.`,
      confirmLabel: "Yes, money received",
    });
    if (!ok) return;
    const res = await partnerAdmin.verifyPayment(r.id);
    if (res.ok) {
      toast(res.data?.commissionPaise ? `Verified. ${formatPaise(res.data.commissionPaise)} credited to ${res.data.partnerName}.` : "Verified.");
      void load();
    } else toast(res.error ?? "Couldn't verify.", "error");
  };

  const exportRows = () => {
    exportCsv(
      "client-payments",
      filtered.map((r) => ({
        reference: r.reference,
        recorded: r.createdAt,
        received_on: r.paidOn ?? "",
        client: r.clientName,
        client_email: r.clientEmail ?? "",
        lead_ref: r.leadReference ?? "",
        installment: r.installment ?? "",
        amount_inr: paiseToRupees(r.amountPaise),
        method: r.method ?? "",
        transaction_ref: r.externalRef ?? "",
        source: r.source,
        status: r.status,
        partner_id: r.partnerCode ?? "",
        partner: r.partnerName ?? "",
        college: r.college ?? "",
        commission_inr: r.commissionPaise !== null ? paiseToRupees(r.commissionPaise) : "",
        commission_status: r.commissionStatus ?? "",
        recorded_by: r.recordedBy ?? "",
        verified_by: r.verifiedBy ?? "",
        verified_at: r.verifiedAt ?? "",
        notes: r.notes ?? "",
      })),
    );
    toast(`Exported ${filtered.length} payments.`, "info");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Partner program"
        title="Client payments"
        description={`The only source of partner commission. Razorpay payments from referred clients arrive verified automatically; record bank, UPI or cash payments here and verify them once received. ${percent}% is credited per installment.`}
        actions={
          <>
            <button type="button" onClick={exportRows} className="btn btn-line btn-sm" disabled={!filtered.length}>
              <Icon name="download" className="h-4 w-4" /> Export CSV
            </button>
            <button type="button" onClick={() => setModal("new")} className="btn btn-gold btn-sm">
              <Icon name="plus" className="h-4 w-4" /> Record payment
            </button>
            <button type="button" onClick={() => void load()} className="btn btn-ghost btn-icon h-9 w-9" aria-label="Refresh">
              <Icon name="refresh" className="h-4 w-4" />
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(["pending", "verified", "refunded", "rejected", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn("rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold capitalize transition", status === s ? "border-gold-300/50 bg-gold-400/15 text-gold-100" : "border-gold-300/10 text-mist hover:text-ivory")}
            >
              {s === "pending" ? "To verify" : s} <span className="ml-1 text-[11px] tabular-nums opacity-60">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>
        <SearchInput value={q} onChange={setQ} placeholder="Client, partner, UTR, reference…" className="lg:w-80" />
      </div>

      <div className="lux-card overflow-x-auto">
        {rows === null ? (
          <LoadingBlock />
        ) : error ? (
          <LoadError message={error} onRetry={() => void load()} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="rupee" title={status === "pending" ? "Nothing to verify" : "No payments here"} body="Record a payment when a client pays by bank transfer, UPI or cash." />
        ) : (
          <table className="w-full min-w-[1120px] text-left">
            <thead>
              <tr className="border-b border-gold-300/10">
                {["Payment", "Client", "Partner", "Amount", "Commission", "Status", ""].map((h, i) => (
                  <th key={i} scope="col" className="label px-5 py-3.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const ownRecord = r.recordedById === user.id && user.role !== "owner";
                return (
                  <tr key={r.id} className="border-b border-gold-300/[0.06] align-top last:border-0">
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-[12.5px] font-semibold text-ivory">{r.reference}</p>
                      <p className="text-[11.5px] text-smoke">
                        {r.installment || "Payment"} · {r.paidOn ? prettyDate(r.paidOn) : timeAgo(r.createdAt)}
                      </p>
                      <p className="text-[11.5px] text-smoke">
                        {r.method || "—"}
                        {r.externalRef ? <span className="font-mono"> · {r.externalRef}</span> : null}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-[13.5px] font-semibold text-parchment">{r.clientName}</p>
                      <p className="text-[11.5px] text-smoke">{r.leadReference ?? "lead removed"}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[12.5px]">
                      {r.partnerName ? (
                        <>
                          <p className="text-sand">{r.partnerName}</p>
                          <p className="font-mono text-[11px] text-smoke">{r.partnerCode}</p>
                        </>
                      ) : (
                        <span className="text-smoke">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[13px] font-semibold text-ivory">{formatPaise(r.amountPaise)}</td>
                    <td className="px-5 py-3.5 font-mono text-[12.5px]">
                      {r.commissionPaise !== null ? (
                        <span className={r.commissionStatus === "reversed" ? "text-smoke line-through" : "text-gold-200"}>{formatPaise(r.commissionPaise)}</span>
                      ) : r.status === "pending" && r.partnerName ? (
                        <span className="text-smoke">on verify</span>
                      ) : (
                        <span className="text-smoke">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge value={r.status} />
                      <p className="mt-1 text-[11px] text-smoke">
                        {r.source === "razorpay" ? "Razorpay · auto-verified" : r.verifiedBy ? `by ${r.verifiedBy}` : r.recordedBy ? `recorded by ${r.recordedBy}` : ""}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {r.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-gold btn-sm"
                              disabled={ownRecord}
                              title={ownRecord ? "Another admin or the owner must verify a payment you recorded" : undefined}
                              onClick={() => void verify(r)}
                            >
                              <Icon name="check" className="h-4 w-4" /> Verify
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal(r)}>
                              Edit
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPrompt({ kind: "reject", row: r })}>
                              Reject
                            </button>
                          </>
                        ) : null}
                        {r.status === "verified" ? (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPrompt({ kind: "refund", row: r })}>
                            Refund
                          </button>
                        ) : null}
                        {r.status === "pending" || r.status === "rejected" ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon h-8 w-8"
                            aria-label="Delete payment"
                            onClick={async () => {
                              const ok = await confirm({ title: `Delete ${r.reference}?`, confirmLabel: "Delete", tone: "danger" });
                              if (!ok) return;
                              const res = await partnerAdmin.removePayment(r.id);
                              if (res.ok) {
                                toast("Payment deleted.");
                                void load();
                              } else toast(res.error ?? "Delete failed.", "error");
                            }}
                          >
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal ? <PaymentModal editing={modal === "new" ? null : modal} percent={percent} onClose={() => setModal(null)} onSaved={() => void load()} /> : null}
      {prompt ? (
        <PromptModal
          title={prompt.kind === "reject" ? `Reject ${prompt.row.reference}?` : `Refund ${prompt.row.reference}?`}
          body={
            prompt.kind === "reject"
              ? "Use this when the money never arrived. No commission is created."
              : `Marks ${formatPaise(prompt.row.amountPaise)} as returned to the client and reverses the partner's commission on it.`
          }
          label="Reason"
          minLength={prompt.kind === "refund" ? 3 : 0}
          confirmLabel={prompt.kind === "reject" ? "Reject payment" : "Refund & reverse commission"}
          tone="danger"
          onClose={() => setPrompt(null)}
          onSubmit={async (reason) => {
            const res = prompt.kind === "reject" ? await partnerAdmin.rejectPayment(prompt.row.id, reason) : await partnerAdmin.refundPayment(prompt.row.id, reason);
            if (!res.ok) {
              toast(res.error ?? "Action failed.", "error");
              return false;
            }
            toast(prompt.kind === "reject" ? "Payment rejected." : "Refunded and commission reversed.");
            void load();
            return true;
          }}
        />
      ) : null}
    </div>
  );
}

/* ================================================================== */
/* Payouts                                                            */
/* ================================================================== */
export function PayoutsPanel() {
  const toast = useToast();
  const [rows, setRows] = useState<AdminPayout[] | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"requested" | "paid" | "rejected" | "all">("requested");
  const [prompt, setPrompt] = useState<null | { kind: "pay" | "reject"; row: AdminPayout }>(null);

  const load = useCallback(async () => {
    const res = await partnerAdmin.payouts();
    if (res.ok) {
      setRows(res.data ?? []);
      setError("");
    } else {
      setRows([]);
      setError(res.error ?? "Couldn't load payouts.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const filtered = (rows ?? []).filter((r) => status === "all" || r.status === status);
  const openTotal = (rows ?? []).filter((r) => r.status === "requested").reduce((s, r) => s + r.amountPaise, 0);

  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text);
    toast("Copied.", "info");
  };

  const exportRows = () => {
    exportCsv(
      "payouts",
      filtered.map((r) => ({
        reference: r.reference,
        requested: r.requestedAt,
        partner_id: r.partnerCode,
        partner: r.partnerName,
        college: r.college,
        region: r.region,
        amount_inr: paiseToRupees(r.amountPaise),
        method: r.method,
        upi: r.method === "upi" ? r.upiId ?? "" : "",
        bank_account_name: r.method === "bank" ? r.bankAccountName ?? "" : "",
        bank_account_number: r.method === "bank" ? r.bankAccountNumber ?? "" : "",
        bank_ifsc: r.method === "bank" ? r.bankIfsc ?? "" : "",
        status: r.status,
        utr: r.utr ?? "",
        note: r.note ?? "",
        processed_by: r.processedBy ?? "",
        processed_at: r.processedAt ?? "",
      })),
    );
    toast(`Exported ${filtered.length} payouts.`, "info");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Partner program"
        title="Payouts"
        description={`Withdrawal requests from partners. Send the money from your bank or UPI app, then mark it paid with the transaction reference (UTR). ${formatPaise(openTotal)} is waiting.`}
        actions={
          <>
            <button type="button" onClick={exportRows} className="btn btn-line btn-sm" disabled={!filtered.length}>
              <Icon name="download" className="h-4 w-4" /> Export CSV
            </button>
            <button type="button" onClick={() => void load()} className="btn btn-ghost btn-icon h-9 w-9" aria-label="Refresh">
              <Icon name="refresh" className="h-4 w-4" />
            </button>
          </>
        }
      />
      <Segmented
        value={status}
        onChange={setStatus}
        options={[
          { value: "requested", label: `To pay ${(rows ?? []).filter((r) => r.status === "requested").length}` },
          { value: "paid", label: "Paid" },
          { value: "rejected", label: "Rejected" },
          { value: "all", label: "All" },
        ]}
      />
      <div className="lux-card overflow-x-auto">
        {rows === null ? (
          <LoadingBlock />
        ) : error ? (
          <LoadError message={error} onRetry={() => void load()} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="rupee" title={status === "requested" ? "No withdrawals waiting" : "Nothing here"} body="Partners request withdrawals from their dashboard once commission clears the hold period." />
        ) : (
          <table className="w-full min-w-[1000px] text-left">
            <thead>
              <tr className="border-b border-gold-300/10">
                {["Partner", "Amount", "Send to", "Requested", "Status", ""].map((h, i) => (
                  <th key={i} scope="col" className="label px-5 py-3.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const flags = (r.flags ?? "").split(",").filter(Boolean);
                const target = r.method === "upi" ? r.upiId ?? "" : `${r.bankAccountName ?? ""} · ${r.bankAccountNumber ?? ""} · ${r.bankIfsc ?? ""}`;
                return (
                  <tr key={r.id} className="border-b border-gold-300/[0.06] align-top last:border-0">
                    <td className="px-5 py-3.5">
                      <p className="text-[14px] font-semibold text-ivory">{r.partnerName}</p>
                      <p className="text-[11.5px] text-smoke">
                        <span className="font-mono">{r.partnerCode}</span> · {r.college}
                      </p>
                      {r.partnerStatus === "suspended" ? <Badge value="suspended" className="mt-1" /> : null}
                      {flags.length ? (
                        <p className="mt-1 flex items-center gap-1 text-[11.5px] text-amber-200">
                          <Icon name="alert" className="h-3 w-3" /> {flags.map((f) => FLAG_LABELS[f] ?? f).join(" · ")}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[14px] font-semibold text-gold-100">{formatPaise(r.amountPaise)}</td>
                    <td className="max-w-[300px] px-5 py-3.5 text-[12.5px] text-sand">
                      <p className="label text-[9.5px]">{r.method === "upi" ? "UPI" : "Bank transfer"}</p>
                      <button type="button" className="mt-1 flex items-center gap-1.5 text-left font-mono text-[12.5px] text-parchment hover:text-gold-200" onClick={() => copy(r.method === "upi" ? r.upiId ?? "" : r.bankAccountNumber ?? "")}>
                        {target} <Icon name="copy" className="h-3 w-3 shrink-0" />
                      </button>
                      <p className="mt-1 text-[11px] text-smoke">At request: {r.destination}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[12.5px] whitespace-nowrap text-smoke">{timeAgo(r.requestedAt)}</td>
                    <td className="px-5 py-3.5">
                      <Badge value={r.status} />
                      {r.utr ? <p className="mt-1 font-mono text-[11px] text-sand">UTR {r.utr}</p> : null}
                      {r.note ? <p className="mt-1 max-w-[200px] text-[11px] text-smoke">{r.note}</p> : null}
                    </td>
                    <td className="px-5 py-3.5">
                      {r.status === "requested" ? (
                        <div className="flex justify-end gap-1.5">
                          <button type="button" className="btn btn-gold btn-sm" onClick={() => setPrompt({ kind: "pay", row: r })}>
                            Mark paid
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPrompt({ kind: "reject", row: r })}>
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {prompt ? (
        <PromptModal
          title={prompt.kind === "pay" ? `Mark ${formatPaise(prompt.row.amountPaise)} as paid?` : "Reject this withdrawal?"}
          body={
            prompt.kind === "pay"
              ? `Send the money to ${prompt.row.partnerName} first, then paste the UPI / bank transaction reference. The partner sees it on their dashboard.`
              : "The amount goes back to the partner's available balance. Tell them why."
          }
          label={prompt.kind === "pay" ? "Transaction reference (UTR)" : "Note for the partner"}
          minLength={prompt.kind === "pay" ? 6 : 3}
          confirmLabel={prompt.kind === "pay" ? "Mark paid" : "Reject"}
          tone={prompt.kind === "pay" ? "default" : "danger"}
          onClose={() => setPrompt(null)}
          onSubmit={async (value) => {
            const res = prompt.kind === "pay" ? await partnerAdmin.markPaid(prompt.row.id, value) : await partnerAdmin.rejectPayout(prompt.row.id, value);
            if (!res.ok) {
              toast(res.error ?? "Action failed.", "error");
              return false;
            }
            toast(prompt.kind === "pay" ? "Payout marked paid." : "Withdrawal rejected.");
            void load();
            return true;
          }}
        />
      ) : null}
    </div>
  );
}

/* ================================================================== */
/* Campus Ambassador applications                                     */
/* ================================================================== */
export function AmbassadorsPanel() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<AdminApplication[] | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [college, setCollege] = useState("");
  const [region, setRegion] = useState("");
  const [prompt, setPrompt] = useState<null | { kind: "approve" | "reject"; row: AdminApplication }>(null);

  const load = useCallback(async () => {
    const res = await partnerAdmin.applications();
    if (res.ok) {
      setRows(res.data ?? []);
      setError("");
    } else {
      setRows([]);
      setError(res.error ?? "Couldn't load applications.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const colleges = useMemo(() => [...new Set((rows ?? []).map((r) => r.college))].sort(), [rows]);
  const regions = useMemo(() => [...new Set((rows ?? []).map((r) => r.region))].sort(), [rows]);
  const filtered = (rows ?? []).filter((r) => (status === "all" || r.status === status) && (!college || r.college === college) && (!region || r.region === region));

  const exportRows = () => {
    exportCsv(
      "ambassador-applications",
      filtered.map((r) => ({
        applied: r.createdAt,
        partner_id: r.partnerCode,
        name: r.partnerName,
        email: r.email,
        phone: r.phone,
        college: r.college,
        region: r.region,
        year_of_study: r.yearOfStudy,
        reach: r.reach,
        motivation: r.motivation,
        social_links: r.socialLinks ?? "",
        leads: r.leads,
        status: r.status,
        review_note: r.reviewNote ?? "",
        reviewed_by: r.reviewedBy ?? "",
        reviewed_at: r.reviewedAt ?? "",
      })),
    );
    toast(`Exported ${filtered.length} applications.`, "info");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Partner program"
        title="Campus Ambassadors"
        description="Applications from partners who want to represent you at their college. Approving one upgrades the partner to Campus Ambassador."
        actions={
          <>
            <button type="button" onClick={exportRows} className="btn btn-line btn-sm" disabled={!filtered.length}>
              <Icon name="download" className="h-4 w-4" /> Export CSV
            </button>
            <button type="button" onClick={() => void load()} className="btn btn-ghost btn-icon h-9 w-9" aria-label="Refresh">
              <Icon name="refresh" className="h-4 w-4" />
            </button>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: "pending", label: `Pending ${(rows ?? []).filter((r) => r.status === "pending").length}` },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
            { value: "all", label: "All" },
          ]}
        />
        <select className="field field-sm w-auto max-w-[240px]" value={college} onChange={(e) => setCollege(e.target.value)} aria-label="Filter by college">
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

      {rows === null ? (
        <div className="lux-card">
          <LoadingBlock />
        </div>
      ) : error ? (
        <div className="lux-card">
          <LoadError message={error} onRetry={() => void load()} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="lux-card">
          <EmptyState icon="award" title={status === "pending" ? "No applications waiting" : "Nothing here"} body="Partners apply while registering or from their dashboard." />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((r) => (
            <article key={r.id} className="lux-card flex flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ivory">{r.partnerName}</p>
                  <p className="text-[12px] text-smoke">
                    <span className="font-mono">{r.partnerCode}</span> · {r.email} · {r.phone}
                  </p>
                </div>
                <Badge value={r.status} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-[12.5px]">
                {[
                  ["College", r.college],
                  ["Year", r.yearOfStudy],
                  ["Region", r.region],
                  ["Leads so far", String(r.leads)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="label text-[9.5px]">{k}</dt>
                    <dd className="mt-0.5 text-parchment">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="label mt-4 text-[9.5px]">Reach</p>
              <p className="mt-1 text-[13px] text-sand">{r.reach}</p>
              <p className="label mt-3 text-[9.5px]">Why them</p>
              <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-wrap text-mist">{r.motivation}</p>
              {r.socialLinks ? <p className="mt-3 text-[12px] break-all text-gold-200">{r.socialLinks}</p> : null}
              {r.reviewNote ? (
                <p className="mt-3 text-[12px] text-smoke">
                  {r.reviewedBy ? `${r.reviewedBy}: ` : ""}“{r.reviewNote}”
                </p>
              ) : null}
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                <span className="mr-auto text-[11.5px] text-smoke">Applied {timeAgo(r.createdAt)}</span>
                {r.status === "pending" ? (
                  <>
                    <button type="button" className="btn btn-gold btn-sm" disabled={r.partnerStatus !== "active"} onClick={() => setPrompt({ kind: "approve", row: r })}>
                      Approve
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPrompt({ kind: "reject", row: r })}>
                      Reject
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="btn btn-ghost btn-icon h-8 w-8"
                  aria-label="Delete application"
                  onClick={async () => {
                    const ok = await confirm({ title: "Delete this application?", body: "The partner's tier doesn't change.", confirmLabel: "Delete", tone: "danger" });
                    if (!ok) return;
                    const res = await partnerAdmin.removeApplication(r.id);
                    if (res.ok) {
                      toast("Application deleted.");
                      void load();
                    } else toast(res.error ?? "Delete failed.", "error");
                  }}
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {prompt ? (
        <PromptModal
          title={prompt.kind === "approve" ? `Approve ${prompt.row.partnerName}?` : `Reject ${prompt.row.partnerName}'s application?`}
          body={prompt.kind === "approve" ? "They become a Campus Ambassador straight away." : "They can apply again later. The note is shown on their dashboard."}
          label={prompt.kind === "approve" ? "Welcome note (optional)" : "Note for the applicant"}
          minLength={prompt.kind === "approve" ? 0 : 3}
          confirmLabel={prompt.kind === "approve" ? "Approve" : "Reject"}
          tone={prompt.kind === "approve" ? "default" : "danger"}
          onClose={() => setPrompt(null)}
          onSubmit={async (note) => {
            const res = prompt.kind === "approve" ? await partnerAdmin.approve(prompt.row.id, note) : await partnerAdmin.reject(prompt.row.id, note);
            if (!res.ok) {
              toast(res.error ?? "Action failed.", "error");
              return false;
            }
            toast(prompt.kind === "approve" ? "Approved — they're now a Campus Ambassador." : "Application rejected.");
            void load();
            return true;
          }}
        />
      ) : null}
    </div>
  );
}
