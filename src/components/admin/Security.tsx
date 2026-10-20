import { useCallback, useEffect, useMemo, useState } from "react";
import { ADMIN_ROLES, type AdminRole } from "../../data/types";
import { admin, isDemoSession, type AdminUser, type AuditEntry, type SessionInfo, type TeamUser } from "../../lib/api";
import { prettyDate, timeAgo } from "../../lib/site";
import { Icon } from "../Icons";
import { Badge, EmptyState, FieldShell, LoadingBlock, Modal, PageHeader, Panel, SearchInput, downloadFile, useConfirm, useToast } from "./AdminUI";

function device(ua: string) {
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "";
  return `${browser}${os ? ` on ${os}` : ""}`;
}

function strongPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint32Array(16));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function SecurityPanel({ user }: { user: AdminUser }) {
  const toast = useToast();
  const confirm = useConfirm();
  const demo = isDemoSession();
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [users, setUsers] = useState<TeamUser[] | null>(null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<{ fullName: string; email: string; role: AdminRole; password: string } | null>(null);
  const isOwner = user.role === "owner";
  // The export endpoint is admin+, so editors don't get a backup button that would 403.
  const canBackup = user.role === "owner" || user.role === "admin";

  const load = useCallback(async () => {
    const s = await admin.sessions();
    setSessions(s.ok ? s.data ?? [] : []);
    if (isOwner) {
      const u = await admin.users();
      setUsers(u.ok ? u.data ?? [] : []);
    }
  }, [isOwner]);

  useEffect(() => {
    void load();
  }, [load]);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 10) return toast("Use at least 10 characters.", "error");
    if (pw.next !== pw.confirm) return toast("The new passwords don't match.", "error");
    setBusy(true);
    const res = await admin.changePassword(pw.current, pw.next);
    setBusy(false);
    if (res.ok) {
      setPw({ current: "", next: "", confirm: "" });
      toast("Password updated. Other sessions were signed out.");
      void load();
    } else toast(res.error ?? "Couldn't change the password.", "error");
  };

  const exportData = async (scope: "content" | "all") => {
    const res = await admin.exportData(scope);
    if (res.ok && res.data) {
      downloadFile(`novaframe-${scope}-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(res.data, null, 2), "application/json");
      toast("Backup downloaded.", "info");
    } else toast(res.error ?? "Export failed.", "error");
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="System" title="Security & team" description="Your account, active sessions, team access and data backups." />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Your account">
          <div className="flex items-center gap-4">
            <span className="icon-tile h-14 w-14 rounded-2xl font-display text-[1.3rem]">{user.fullName.slice(0, 1)}</span>
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold text-ivory">{user.fullName}</p>
              <p className="truncate text-[13px] text-mist">{user.email}</p>
            </div>
            <Badge value={user.role} className="ml-auto" />
          </div>
          <form onSubmit={changePassword} className="mt-7 grid gap-4">
            <p className="label">Change password</p>
            <FieldShell label="Current password">
              <input type="password" autoComplete="current-password" className="field" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} disabled={demo} />
            </FieldShell>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell label="New password" hint="10+ characters">
                <input type="password" autoComplete="new-password" className="field" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} disabled={demo} />
              </FieldShell>
              <FieldShell label="Confirm new password">
                <input type="password" autoComplete="new-password" className="field" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} disabled={demo} />
              </FieldShell>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn btn-gold btn-sm" disabled={busy || demo || !pw.current || !pw.next}>
                <Icon name="lock" className="h-4 w-4" /> {busy ? "Updating…" : "Update password"}
              </button>
            </div>
          </form>
        </Panel>

        <Panel title="Active sessions" padded={false}>
          {sessions === null ? (
            <LoadingBlock />
          ) : (
            <ul className="divide-y divide-gold-300/[0.07]">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="icon-tile h-10 w-10 shrink-0 rounded-xl">
                    <Icon name="layout" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ivory">
                      {device(s.user_agent ?? "")}
                      {s.current ? <Badge value="confirmed" label="This device" /> : null}
                    </span>
                    <span className="block truncate text-[12px] text-smoke">
                      {s.ip_address || "unknown IP"} · active {timeAgo(s.last_seen_at)}
                    </span>
                  </span>
                  {!s.current ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm text-ember"
                      onClick={async () => {
                        const res = await admin.revokeSession(s.id);
                        if (res.ok) {
                          toast("Session signed out.");
                          void load();
                        } else toast(res.error ?? "Couldn't revoke.", "error");
                      }}
                    >
                      Sign out
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {isOwner ? (
        <Panel
          title="Team access"
          action={
            <button type="button" className="btn btn-gold btn-sm" disabled={demo} onClick={() => setInvite({ fullName: "", email: "", role: "editor", password: strongPassword() })}>
              <Icon name="plus" className="h-4 w-4" /> Add member
            </button>
          }
          padded={false}
        >
          {users === null ? (
            <LoadingBlock />
          ) : !users.length ? (
            <EmptyState icon="users" title="Just you for now" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-gold-300/10">
                    {["Member", "Role", "Status", "Last sign-in", ""].map((h) => (
                      <th key={h} className="label px-5 py-3.5 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gold-300/[0.06] last:border-0">
                      <td className="px-5 py-3.5">
                        <p className="text-[14px] font-semibold text-ivory">
                          {u.fullName} {u.id === user.id ? <span className="font-normal text-smoke">(you)</span> : null}
                        </p>
                        <p className="text-[12px] text-smoke">{u.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          className="field field-sm w-32"
                          value={u.role}
                          disabled={demo || u.id === user.id}
                          onChange={async (e) => {
                            const res = await admin.updateUser(u.id, { role: e.target.value as AdminRole });
                            if (res.ok) {
                              toast("Role updated.");
                              void load();
                            } else toast(res.error ?? "Couldn't change role.", "error");
                          }}
                        >
                          {ADMIN_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          disabled={demo || u.id === user.id}
                          onClick={async () => {
                            const res = await admin.updateUser(u.id, { active: !u.active });
                            if (res.ok) {
                              toast(u.active ? "Access suspended." : "Access restored.");
                              void load();
                            } else toast(res.error ?? "Update failed.", "error");
                          }}
                        >
                          <Badge value={u.active ? "confirmed" : "cancelled"} label={u.active ? "Active" : "Suspended"} />
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-[12.5px] text-smoke">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}</td>
                      <td className="px-5 py-3.5 text-right">
                        {u.id !== user.id ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon h-9 w-9 text-ember/80 hover:text-ember"
                            aria-label={`Remove ${u.fullName}`}
                            disabled={demo}
                            onClick={async () => {
                              if (!(await confirm({ title: `Remove ${u.fullName}?`, body: "They lose access to the console immediately.", confirmLabel: "Remove", tone: "danger" }))) return;
                              const res = await admin.deleteUser(u.id);
                              if (res.ok) {
                                toast("Member removed.");
                                void load();
                              } else toast(res.error ?? "Couldn't remove.", "error");
                            }}
                          >
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-gold-300/10 px-5 py-4 text-[12.5px] text-smoke">
            <span className="text-parchment">Owner</span> — everything incl. team & data export · <span className="text-parchment">Admin</span> — leads, bookings, settings and content ·{" "}
            <span className="text-parchment">Editor</span> — content only
          </div>
        </Panel>
      ) : null}

      {canBackup ? (
        <Panel title="Backups">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-[13.5px] text-mist">Download a JSON snapshot of every content section and setting. Owners can also include leads, bookings and subscribers.</p>
            <div className="flex flex-wrap gap-2.5">
              <button type="button" className="btn btn-line btn-sm" onClick={() => void exportData("content")}>
                <Icon name="download" className="h-4 w-4" /> Content backup
              </button>
              {isOwner ? (
                <button type="button" className="btn btn-gold btn-sm" disabled={demo} onClick={() => void exportData("all")}>
                  <Icon name="download" className="h-4 w-4" /> Full backup
                </button>
              ) : null}
            </div>
          </div>
        </Panel>
      ) : null}

      {invite ? (
        <Modal
          title="Add a team member"
          onClose={() => setInvite(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setInvite(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-gold btn-sm"
                onClick={async () => {
                  const res = await admin.createUser(invite);
                  if (res.ok) {
                    void navigator.clipboard?.writeText(`Email: ${invite.email}\nTemporary password: ${invite.password}`);
                    toast("Member added — credentials copied to your clipboard.");
                    setInvite(null);
                    void load();
                  } else toast(res.error ?? "Couldn't add the member.", "error");
                }}
              >
                Create account
              </button>
            </>
          }
        >
          <div className="grid gap-4">
            <FieldShell label="Full name" required>
              <input className="field" value={invite.fullName} onChange={(e) => setInvite({ ...invite, fullName: e.target.value })} />
            </FieldShell>
            <FieldShell label="Email" required>
              <input type="email" className="field" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
            </FieldShell>
            <FieldShell label="Role">
              <select className="field" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as AdminRole })}>
                {ADMIN_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </FieldShell>
            <FieldShell label="Temporary password" hint="Share it securely; they can change it later">
              <div className="flex gap-2">
                <input className="field font-mono text-[13px]" value={invite.password} onChange={(e) => setInvite({ ...invite, password: e.target.value })} />
                <button type="button" className="btn btn-line btn-sm" onClick={() => setInvite({ ...invite, password: strongPassword() })}>
                  <Icon name="refresh" className="h-4 w-4" />
                </button>
              </div>
            </FieldShell>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export function ActivityLog() {
  const toast = useToast();
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void admin.audit(500).then((res) => {
      if (res.ok) setRows(res.data ?? []);
      else {
        setRows([]);
        toast(res.error ?? "Couldn't load the activity log.", "error");
      }
    });
  }, [toast]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((r) => !q || `${r.action} ${r.target} ${r.details} ${r.admin_email}`.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="System" title="Activity log" description="An audit trail of sign-ins and every change made in the console." />
      <SearchInput value={query} onChange={setQuery} placeholder="Filter by action, target or person…" className="sm:w-96" />
      <div className="lux-card overflow-x-auto">
        {rows === null ? (
          <LoadingBlock />
        ) : !visible.length ? (
          <EmptyState icon="history" title="No activity yet" />
        ) : (
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-gold-300/10">
                {["When", "Action", "Target", "By", "Details"].map((h) => (
                  <th key={h} className="label px-5 py-3.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-gold-300/[0.06] last:border-0">
                  <td className="px-5 py-3 text-[12.5px] whitespace-nowrap text-smoke" title={r.created_at}>
                    {prettyDate(r.created_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`font-mono text-[11.5px] ${r.action.includes("FAILED") || r.action.includes("DELETED") ? "text-ember" : "text-gold-200"}`}>{r.action}</span>
                  </td>
                  <td className="px-5 py-3 font-mono text-[12px] text-sand">{r.target}</td>
                  <td className="px-5 py-3 text-[12.5px] text-mist">{r.admin_email ?? "—"}</td>
                  <td className="max-w-[280px] truncate px-5 py-3 text-[12.5px] text-smoke">{r.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
