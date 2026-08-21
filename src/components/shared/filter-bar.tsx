"use client";

import * as React from "react";
import { Check, ListFilter, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/primitives";

export type FacetOption = { value: string; label: string; count?: number };

/** Search box with a clear affordance. Filters as you type. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fg-subtle" />
      <Input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer rounded-sm p-0.5 text-fg-subtle transition-colors hover:bg-subtle hover:text-fg"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

/**
 * A multi-select facet. The trigger states plainly when it is filtering, so a
 * screen that is hiding rows never looks like a screen with no rows.
 */
export function FacetFilter({
  label,
  options,
  selected,
  onChange,
  align = "start",
}: {
  label: string;
  options: FacetOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  align?: "start" | "end";
}) {
  const active = selected.length > 0;

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  const summary =
    selected.length === 0
      ? null
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? "1")
        : `${selected.length} selected`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={active ? "subtle" : "secondary"}
          size="sm"
          className={cn(active && "border border-navy-200 bg-navy-50 text-navy-700")}
        >
          {label}
          {summary && (
            <>
              <span className="text-fg-subtle">·</span>
              <span className="max-w-28 truncate font-medium">{summary}</span>
            </>
          )}
          <ListFilter className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="max-h-80 w-56 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          {label}
          {active && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="cursor-pointer text-[10px] font-medium text-teal-700 normal-case hover:underline"
            >
              Clear
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggle(option.value)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors",
                "hover:bg-subtle",
                checked ? "text-fg" : "text-fg-body",
              )}
            >
              <span
                className={cn(
                  "flex size-3.5 shrink-0 items-center justify-center rounded-xs border",
                  checked
                    ? "border-navy-600 bg-navy-600 text-white"
                    : "border-line-strong bg-surface",
                )}
              >
                {checked && <Check className="size-2.5" strokeWidth={3} />}
              </span>
              <span className="flex-1 truncate">{option.label}</span>
              {option.count != null && (
                <span className="tabular shrink-0 text-[10px] text-fg-subtle">
                  {option.count}
                </span>
              )}
            </button>
          );
        })}
        {options.length === 0 && (
          <p className="px-2 py-3 text-center text-2xs text-fg-subtle">
            Nothing to filter by.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Wraps a row of controls and shows a reset when anything is active. */
export function FilterBar({
  children,
  activeCount,
  onClear,
  right,
  className,
}: {
  children: React.ReactNode;
  activeCount: number;
  onClear: () => void;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-fg-muted">
          <X />
          Clear {activeCount} {activeCount === 1 ? "filter" : "filters"}
        </Button>
      )}
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  );
}
