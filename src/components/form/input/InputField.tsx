import React, { FC } from "react";

interface InputProps {
  type?: "text" | "number" | "email" | "password" | "date" | "time" | string;
  id?: string;
  name?: string;
  placeholder?: string;
  defaultValue?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  min?: string;
  max?: string;
  step?: number;
  disabled?: boolean;
  success?: boolean;
  error?: boolean;
  hint?: string; // Optional hint text
}

const Input: FC<InputProps> = ({
  type = "text",
  id,
  name,
  placeholder,
  defaultValue,
  onChange,
  className = "",
  min,
  max,
  step,
  disabled = false,
  success = false,
  error = false,
  hint,
}) => {
  // Determine input styles based on state (disabled, success, error)
  let inputClasses = `h-11 w-full rounded-[var(--radius-s)] border appearance-none px-4 py-2.5 text-sm placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 ${className}`;

  // Add styles for the different states
  if (disabled) {
    inputClasses += ` text-ink-muted border-line bg-surface-sunken cursor-not-allowed`;
  } else if (error) {
    inputClasses += ` text-critical border-critical focus:outline-critical`;
  } else if (success) {
    inputClasses += ` text-positive border-positive focus:outline-positive`;
  } else {
    inputClasses += ` bg-surface-raised text-ink border-line-strong focus:outline-focus-ring`;
  }

  return (
    <div className="relative">
      <input
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={inputClasses}
      />

      {/* Optional Hint Text */}
      {hint && (
        <p className={`mt-1.5 text-xs ${error ? "text-critical" : success ? "text-positive" : "text-ink-muted"}`}>
          {hint}
        </p>
      )}
    </div>
  );
};

export default Input;
