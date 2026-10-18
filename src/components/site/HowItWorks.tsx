const STEPS = [
  { n: "01", title: "Source", body: "We find the supplier, check the goods, and pay them safely." },
  { n: "02", title: "Consolidate", body: "Your cargo joins others at a hub, so you only pay for the space you use." },
  { n: "03", title: "Move", body: "Sea, rail and road, planned as one route and tracked as one shipment." },
  { n: "04", title: "Clear", body: "Our brokers handle customs and border papers before the truck arrives." },
  { n: "05", title: "Deliver", body: "To the door, with a signed, photographed proof of delivery." },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
      <p className="sq-overline">How it works</p>
      <h2 className="sq-headline mt-2 max-w-xl">Five steps. You only see one: delivered.</h2>

      <div className="mt-10 grid border-t border-ink sm:grid-cols-5">
        {STEPS.map((step, i) => (
          <div
            key={step.n}
            className={`border-b border-line py-6 pr-6 sm:border-b-0 sm:py-8 ${i > 0 ? "sm:border-l sm:pl-6" : ""} ${
              step.n === "03" ? "relative before:absolute before:-top-px before:left-0 before:h-0.5 before:w-full before:bg-accent" : ""
            }`}
          >
            <p className="sq-mono-s text-ink-muted">{step.n}</p>
            <p className="sq-title mt-2 text-[18px]">{step.title}</p>
            <p className="mt-1.5 text-sm text-ink-muted">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
