import Button from "@/components/ui/button/Button";

export function ClosingBand() {
  return (
    <section className="bg-ink">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-14 sm:flex-row sm:items-center sm:px-8 sm:py-16">
        <h2 className="sq-headline max-w-md text-ink-inverse">Tell us where it needs to go.</h2>
        <Button href="#quote" size="l">
          Get a quote →
        </Button>
      </div>
    </section>
  );
}
