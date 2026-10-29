"use client";

import { Children, InputHTMLAttributes, isValidElement, ReactNode, useId, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { COUNTRY_CODES, countryName } from "@/lib/country";

// The console's form pieces, so every form lines up the same way: a label
// above, the control full width (and allowed to shrink in a row), the unit
// inside the box (%, kg, XOF…), a hint below.

/** A text box's look, without a width. */
export const control =
  "h-10 rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring disabled:opacity-60";
/** A text box that fills its column and can shrink beside others. */
export const input = `${control} w-full min-w-0`;

/**
 * Whether a field's control is required: an input, select or textarea with
 * `required` (also inside a row of controls, or a range's `min`/`max`). The
 * label follows what the form actually enforces, so they can't disagree.
 */
function hasRequired(node: ReactNode, depth = 0): boolean {
  if (depth > 4) return false;
  return Children.toArray(node).some((child) => {
    if (!isValidElement(child)) return false;
    const props = child.props as { required?: boolean; min?: { required?: boolean }; max?: { required?: boolean }; children?: ReactNode };
    return props.required === true || props.min?.required === true || props.max?.required === true || hasRequired(props.children, depth + 1);
  });
}

/** A required field's mark, after its label (the control itself tells screen readers). */
export function RequiredMark() {
  return (
    <span aria-hidden className="ml-0.5 font-semibold text-critical">
      *
    </span>
  );
}

/** Above a form: what the mark means. */
export function RequiredNote({ className = "" }: { className?: string }) {
  const t = useTranslations("common.form");
  return (
    <p className={`text-xs text-ink-muted ${className}`}>
      <span aria-hidden className="font-semibold text-critical">
        *
      </span>{" "}
      {t("requiredNote")}
    </p>
  );
}

/**
 * A label above its control, with a hint below. Required fields are marked
 * by themselves (see hasRequired); pass `required` for a control that isn't
 * a direct input.
 */
export function Field({ label, hint, children, className = "", required }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string; required?: boolean }) {
  const mark = required ?? hasRequired(children);
  return (
    <label className={`block min-w-0 text-sm ${className}`}>
      <span className="rb-label mb-1 block text-ink">
        {label}
        {mark && <RequiredMark />}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

/** A number with its unit shown inside the box, on the right. */
export function UnitInput({ unit, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { unit: ReactNode }) {
  return (
    <span className={`relative flex min-w-0 items-center ${className}`}>
      <input type="number" min="0" step="any" {...props} className={`${input} pr-14 tabular-nums`} />
      <span className="pointer-events-none absolute right-3 text-xs font-semibold text-ink-muted">{unit}</span>
    </span>
  );
}

/** From–to, side by side (weight, quantity…). */
export function RangeInputs({ unit, min, max, labels }: { unit?: ReactNode; min: InputHTMLAttributes<HTMLInputElement>; max: InputHTMLAttributes<HTMLInputElement>; labels: { min: string; max: string } }) {
  const box = (p: InputHTMLAttributes<HTMLInputElement>, label: string) =>
    unit ? <UnitInput unit={unit} placeholder={label} aria-label={label} {...p} /> : <input type="number" min="0" step="any" className={input} placeholder={label} aria-label={label} {...p} />;
  return (
    <span className="grid grid-cols-2 gap-2">
      {box(min, labels.min)}
      {box(max, labels.max)}
    </span>
  );
}

const CURRENCIES = ["XOF", "XAF", "EUR", "USD", "GBP", "NGN", "GHS", "KES", "MAD", "AED", "CNY", "TRY", "INR"];

/** A currency code: three letters, upper case, with the usual ones suggested. */
export function CurrencyInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <>
      <input
        maxLength={3}
        autoComplete="off"
        list={id}
        placeholder="XOF"
        {...props}
        className={`${input} uppercase tabular-nums ${props.className ?? ""}`}
        onChange={(e) => {
          e.target.value = e.target.value.toUpperCase();
          props.onChange?.(e);
        }}
      />
      <datalist id={id}>
        {CURRENCIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </>
  );
}

/**
 * A country, typed or picked from the list (in the console's language). The
 * API matches countries however they're written (Niger, NE…), so a name is fine.
 */
export function CountryInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const locale = useLocale();
  const t = useTranslations("common.form");
  const names = useMemo(() => COUNTRY_CODES.map((c) => countryName(c, locale)).sort((a, b) => a.localeCompare(b, locale)), [locale]);
  // Every country's name in French and English, and the codes: what may be typed.
  const known = useMemo(() => {
    const all = new Set<string>();
    for (const c of COUNTRY_CODES) {
      all.add(c.toLowerCase());
      for (const l of ["fr", "en"]) all.add(countryName(c, l).toLowerCase());
    }
    return all;
  }, []);
  const check = (el: HTMLInputElement) => el.setCustomValidity(el.value.trim() && !known.has(el.value.trim().toLowerCase()) ? t("notACountry") : "");
  return (
    <>
      <input
        autoComplete="off"
        list={id}
        {...props}
        className={`${input} ${props.className ?? ""}`}
        onChange={(e) => {
          check(e.target);
          props.onChange?.(e);
        }}
        onBlur={(e) => {
          check(e.target);
          e.target.reportValidity();
          props.onBlur?.(e);
        }}
        // A value set before the user typed (editing a saved rule) is checked too.
        ref={(el) => {
          if (el) check(el);
        }}
      />
      <datalist id={id}>
        {names.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </>
  );
}

/** A group of fields under a small heading, on a responsive grid. */
export function FormSection({ title, children, columns = 3 }: { title: ReactNode; children: ReactNode; columns?: 2 | 3 | 4 }) {
  const grid = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];
  return (
    <div className="min-w-0 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <fieldset className="min-w-0">
        <legend className="rb-overline mb-3 text-ink-muted">{title}</legend>
        <div className={`grid gap-4 ${grid}`}>{children}</div>
      </fieldset>
    </div>
  );
}

/** Save, cancel and the error, under the form. */
export function FormActions({ children, error, saved = false }: { children: ReactNode; error?: string | null; saved?: boolean }) {
  const t = useTranslations("common.form");
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
      {children}
      {saved && !error && (
        <p role="status" className="text-sm text-positive">
          {t("saved")}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      )}
    </div>
  );
}
