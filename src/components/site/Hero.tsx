import { RouteDrawing } from "./RouteDrawing";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-2 lg:items-center lg:pb-24 lg:pt-28">
      <div>
        <p className="sq-overline">Sourcing and logistics for hard-to-reach places</p>
        <h1 className="sq-display-l mt-3">Get it there.</h1>
        <p className="mt-5 max-w-md text-base text-ink-muted sm:text-lg">
          We source, move and deliver goods to landlocked and difficult-to-reach markets. Tell us what needs to
          move. We will work out the route.
        </p>
      </div>
      <RouteDrawing originLabel="ORIGIN" destinationLabel="DESTINATION" className="w-full max-w-lg justify-self-end" />
    </section>
  );
}
