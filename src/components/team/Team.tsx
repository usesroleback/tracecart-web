"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";

// Tracecart's people, its customers and its audit log (ADR-093). The API
// decides who may do what; this only offers what it says is possible.

const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

interface RoleOption {
  key: string;
  name: string;
  description: string;
  needsWarehouse: boolean;
}

interface Member {
  id: string;
  name: string;
  email: string;
  joined: boolean;
  isMe: boolean;
  roles: { key: string; name: string; scopeId: string | null; scope: string | null }[];
}

interface TeamData {
  items: Member[];
  roles: RoleOption[];
  warehouses: { id: string; code: string; city: string }[];
}

function RolePicker({ data, value, scope, onRole, onScope }: { data: TeamData; value: string; scope: string; onRole: (k: string) => void; onScope: (id: string) => void }) {
  const t = useTranslations("team");
  const role = data.roles.find((r) => r.key === value);
  return (
    <>
      <Field label={t("role")} required hint={role?.description}>
        <select className={input} value={value} onChange={(e) => onRole(e.target.value)}>
          <option value="">{t("chooseRole")}</option>
          {data.roles.map((r) => (
            <option key={r.key} value={r.key}>
              {r.name}
            </option>
          ))}
        </select>
      </Field>
      {role?.needsWarehouse ? (
        <Field label={t("warehouse")} required>
          <select className={input} value={scope} onChange={(e) => onScope(e.target.value)}>
            <option value="">{t("chooseWarehouse")}</option>
            {data.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code}, {w.city}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
    </>
  );
}

export function Team() {
  const t = useTranslations("team");
  const [data, setData] = useState<TeamData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [scopeId, setScopeId] = useState("");
  const [adding, setAdding] = useState<Record<string, { role: string; scope: string }>>({});

  const load = useCallback(async () => setData(await call<TeamData>("GET", "/team")), []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  async function act(fn: () => Promise<TeamData>) {
    setBusy(true);
    setError(null);
    try {
      setData(await fn());
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const needsWarehouse = (key: string) => !!data?.roles.find((r) => r.key === key)?.needsWarehouse;
  const complete = (key: string, scope: string) => !!key && (!needsWarehouse(key) || !!scope);

  async function invite() {
    const done = await act(() => call<TeamData>("POST", "/team", { email: email.trim(), name: name.trim(), roleKey, ...(scopeId ? { scopeId } : {}) }));
    if (done) {
      setEmail("");
      setName("");
      setRoleKey("");
      setScopeId("");
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="rb-headline mb-1 text-[28px]">{t("title")}</h1>
        <p className="text-sm text-ink-muted">{t("lead")}</p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      {!data && !error ? <p className="text-sm text-ink-muted">{t("loading")}</p> : null}

      {data ? (
        <form
          className={`${box} grid gap-3 md:grid-cols-2`}
          onSubmit={(e) => {
            e.preventDefault();
            void invite();
          }}
        >
          <h2 className="rb-title md:col-span-2">{t("add")}</h2>
          <Field label={t("name")} required>
            <input className={input} required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t("email")} required>
            <input className={input} type="email" required maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <RolePicker
            data={data}
            value={roleKey}
            scope={scopeId}
            onRole={(k) => {
              setRoleKey(k);
              setScopeId("");
            }}
            onScope={setScopeId}
          />
          <div className="md:col-span-2">
            <Button type="submit" variant="primary" loading={busy} disabled={!complete(roleKey, scopeId)}>
              {t("addCta")}
            </Button>
          </div>
        </form>
      ) : null}

      <ul className="flex flex-col gap-3">
        {data?.items.map((m) => {
          const pick = adding[m.id] ?? { role: "", scope: "" };
          return (
            <li key={m.id} className={box}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>
                  <span className="font-medium">{m.name}</span>
                  <span className="text-ink-muted"> · {m.email}</span>
                </p>
                <span className="flex gap-2">
                  {m.isMe ? <Badge variant="info">{t("you")}</Badge> : null}
                  <Badge variant={m.joined ? "positive" : "attn"}>{m.joined ? t("joined") : t("notYet")}</Badge>
                </span>
              </div>
              <ul className="mt-2 flex flex-wrap gap-2">
                {m.roles.length ? null : <li className="text-ink-muted">{t("noRole")}</li>}
                {m.roles.map((r) => (
                  <li key={`${r.key}:${r.scopeId}`} className="flex items-center gap-2 rounded-[var(--radius-s)] border border-line px-2 py-1">
                    {r.name}
                    {r.scope ? <span className="text-ink-muted">({r.scope})</span> : null}
                    {!m.isMe && data.roles.some((o) => o.key === r.key) ? (
                      <button type="button" className="underline" disabled={busy} aria-label={t("removeRole", { role: r.name, name: m.name })} onClick={() => window.confirm(t("confirmRemove", { role: r.name, name: m.name })) && void act(() => call<TeamData>("DELETE", `/team/${m.id}/roles/${r.key}${r.scopeId ? `?scopeId=${r.scopeId}` : ""}`))}>
                        {t("remove")}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {!m.isMe ? (
                <div className="mt-3 grid max-w-md gap-2">
                  <RolePicker data={data} value={pick.role} scope={pick.scope} onRole={(k) => setAdding({ ...adding, [m.id]: { role: k, scope: "" } })} onScope={(s) => setAdding({ ...adding, [m.id]: { ...pick, scope: s } })} />
                  {pick.role ? (
                    <Button
                      variant="secondary"
                      loading={busy}
                      disabled={!complete(pick.role, pick.scope)}
                      onClick={async () => {
                        if (await act(() => call<TeamData>("POST", `/team/${m.id}/roles`, { roleKey: pick.role, ...(pick.scope ? { scopeId: pick.scope } : {}) }))) setAdding({ ...adding, [m.id]: { role: "", scope: "" } });
                      }}
                    >
                      {t("giveRole")}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  orderCount: number;
}

interface CustomerDetail extends Omit<Customer, "orderCount"> {
  orders: { id: string; reference: string; status: string; totalMinor: number; currency: string; paymentMethod: string; createdAt: string }[];
}

export function Customers() {
  const t = useTranslations("team.customers");
  const format = useFormat();
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const [rows, setRows] = useState<Customer[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [open, setOpen] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const qs = applied ? `&q=${encodeURIComponent(applied)}` : "";

  useEffect(() => {
    call<{ items: Customer[]; nextCursor: string | null }>("GET", `/customers?limit=50${qs}`)
      .then((r) => {
        setRows(r.items);
        setNext(r.nextCursor);
      })
      .catch((e) => setError((e as Error).message));
  }, [qs]);

  async function more() {
    const r = await call<{ items: Customer[]; nextCursor: string | null }>("GET", `/customers?limit=50&cursor=${next}${qs}`);
    setRows([...(rows ?? []), ...r.items]);
    setNext(r.nextCursor);
  }

  return (
    <div className="max-w-4xl">
      <h1 className="rb-headline mb-1 text-[28px]">{t("title")}</h1>
      <p className="mb-4 text-sm text-ink-muted">{t("lead")}</p>
      <form
        className="mb-4 flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(q.trim());
        }}
      >
        <input className={input} aria-label={t("search")} placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" variant="secondary">
          {t("find")}
        </Button>
      </form>
      {error ? (
        <p role="alert" className="mb-3 text-sm text-critical">
          {error}
        </p>
      ) : null}
      {rows && !rows.length ? <p className="text-sm text-ink-muted">{t("empty")}</p> : null}
      <ul className="flex flex-col gap-2">
        {rows?.map((c) => (
          <li key={c.id} className={box}>
            <button
              type="button"
              className="flex w-full flex-wrap justify-between gap-2 text-left"
              aria-expanded={open?.id === c.id}
              onClick={() => {
                if (open?.id === c.id) setOpen(null);
                else call<CustomerDetail>("GET", `/customers/${c.id}`).then(setOpen).catch((e) => setError((e as Error).message));
              }}
            >
              <span>
                <span className="font-medium">{c.name}</span>
                <span className="text-ink-muted"> · {c.email}{c.phone ? ` · ${c.phone}` : ""}</span>
              </span>
              <span className="text-ink-muted">{t("orders", { count: c.orderCount })}</span>
            </button>
            {open?.id === c.id ? (
              <ul className="mt-3 divide-y divide-line">
                {open.orders.length ? null : <li className="text-ink-muted">{t("noOrders")}</li>}
                {open.orders.map((o) => (
                  <li key={o.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <Link href={`/store-orders/${o.id}`} className="rb-mono-s underline">
                      {o.reference}
                    </Link>
                    <span className="text-ink-muted">{format.shortDate(o.createdAt)}</span>
                    <span className="rb-numeral">
                      {format.number(toMajor(o.totalMinor, o.currency))} {o.currency}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      {next ? (
        <Button variant="secondary" className="mt-4" onClick={() => void more()}>
          {t("more")}
        </Button>
      ) : null}
    </div>
  );
}

interface AuditRow {
  id: string;
  action: string;
  actorType: string;
  actorId: string | null;
  entityType: string | null;
  entityId: string | null;
  reason: string | null;
  at: string;
}

export function AuditLog() {
  const t = useTranslations("team.audit");
  const format = useFormat();
  const [action, setAction] = useState("");
  const [applied, setApplied] = useState("");
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const qs = applied ? `&action=${encodeURIComponent(applied)}` : "";

  useEffect(() => {
    call<{ items: AuditRow[]; next: string | null }>("GET", `/audit-log?limit=100${qs}`)
      .then((r) => {
        setRows(r.items);
        setNext(r.next);
      })
      .catch((e) => setError((e as Error).message));
  }, [qs]);

  async function more() {
    const r = await call<{ items: AuditRow[]; next: string | null }>("GET", `/audit-log?limit=100&after=${next}${qs}`);
    setRows([...(rows ?? []), ...r.items]);
    setNext(r.next);
  }

  return (
    <div className="max-w-5xl">
      <h1 className="rb-headline mb-1 text-[28px]">{t("title")}</h1>
      <p className="mb-4 text-sm text-ink-muted">{t("lead")}</p>
      <form
        className="mb-4 flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(action.trim());
        }}
      >
        <input className={input} aria-label={t("filter")} placeholder={t("filter")} value={action} onChange={(e) => setAction(e.target.value)} />
        <Button type="submit" variant="secondary">
          {t("find")}
        </Button>
      </form>
      {error ? (
        <p role="alert" className="mb-3 text-sm text-critical">
          {error}
        </p>
      ) : null}
      {rows && !rows.length ? <p className="text-sm text-ink-muted">{t("empty")}</p> : null}
      {rows?.length ? (
        <div className={`${box} overflow-x-auto`}>
          <table className="w-full text-left">
            <thead className="text-ink-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">{t("when")}</th>
                <th className="py-2 pr-3 font-medium">{t("action")}</th>
                <th className="py-2 pr-3 font-medium">{t("about")}</th>
                <th className="py-2 font-medium">{t("who")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 pr-3 text-ink-muted">{format.dayTime(r.at)}</td>
                  <td className="rb-mono-s py-2 pr-3">
                    {r.action}
                    {r.reason ? <span className="block text-ink-muted">{r.reason}</span> : null}
                  </td>
                  <td className="rb-mono-s py-2 pr-3 text-ink-muted">{[r.entityType, r.entityId].filter(Boolean).join(" · ")}</td>
                  <td className="rb-mono-s py-2 text-ink-muted">{r.actorId ?? r.actorType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {next ? (
        <Button variant="secondary" className="mt-4" onClick={() => void more()}>
          {t("more")}
        </Button>
      ) : null}
    </div>
  );
}
