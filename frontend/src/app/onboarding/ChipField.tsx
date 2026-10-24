"use client";

import { useState, type KeyboardEvent } from "react";
import { dedupe } from "./draft";

export interface ChipFieldProps {
  label: string;
  helper?: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}

export function ChipField({
  label,
  helper,
  values,
  onChange,
  placeholder,
}: ChipFieldProps) {
  const [input, setInput] = useState("");

  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) return;
    onChange(dedupe([...values, ...parts]));
    setInput("");
  };

  const remove = (value: string) => {
    onChange(values.filter((v) => v !== value));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(input);
    } else if (e.key === "Backspace" && input === "" && values.length) {
      e.preventDefault();
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-medium text-ink">{label}</p>
        {helper ? <span className="text-[12px] text-faint">{helper}</span> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            className="rounded-full bg-cream px-3 py-[7px] text-[13px]"
            onClick={() => remove(value)}
            aria-label={`Remove ${value}`}
          >
            {value} <span className="text-muted">×</span>
          </button>
        ))}
        <input
          aria-label={label || placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => input && add(input)}
          placeholder={values.length ? "+ Add" : placeholder}
          className="min-w-[120px] flex-1 rounded-full border border-dashed border-line bg-transparent px-3 py-[7px] text-[13px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
        />
      </div>
    </div>
  );
}
