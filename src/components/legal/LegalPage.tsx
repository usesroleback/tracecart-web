import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { StoreShell } from "@/components/store/StoreShell";

type Section = { title: string; body: string[] };

/** Terms, privacy and contact: one layout, with the words in messages/{fr,en}/legal.json. */
export async function LegalPage({ page }: { page: "terms" | "privacy" | "contact" }) {
  // Who to reach is set on the server and read per request (docs/developers/environment.md).
  await connection();
  const email = process.env.CONTACT_EMAIL?.trim() || null;
  const address = process.env.LEGAL_ADDRESS?.trim() || null;

  const t = await getTranslations(`legal.${page}`);
  const shared = await getTranslations("legal.shared");
  const sections = t.raw("sections") as Section[];

  return (
    <StoreShell>
      <article className="max-w-3xl pb-12">
        <h1 className="rb-headline text-[28px] sm:text-[36px]">{t("title")}</h1>
        <p className="mb-8 mt-2 text-ink-muted">{t("lead")}</p>
        {sections.map((s) => (
          <section key={s.title} className="mb-6">
            <h2 className="text-lg font-semibold">{s.title}</h2>
            {s.body.map((p) => (
              <p key={p} className="mt-2 leading-relaxed text-ink-muted">
                {p}
              </p>
            ))}
          </section>
        ))}
        <section>
          <h2 className="text-lg font-semibold">{shared("reachUs")}</h2>
          <p className="mt-2 text-ink-muted">{shared("company")}</p>
          <dl className="mt-4 space-y-2 text-ink-muted">
            {email && (
              <div>
                <dt className="font-medium text-ink">{shared("email")}</dt>
                <dd>
                  <a className="underline" href={`mailto:${email}`}>
                    {email}
                  </a>
                </dd>
              </div>
            )}
            {address && (
              <div>
                <dt className="font-medium text-ink">{shared("address")}</dt>
                <dd className="whitespace-pre-line">{address}</dd>
              </div>
            )}
          </dl>
        </section>
      </article>
    </StoreShell>
  );
}
