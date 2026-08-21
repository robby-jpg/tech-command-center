import * as React from "react";
import { TONE_CLASSES, type Tone } from "@/domain";
import { cn } from "@/lib/utils";

/**
 * Understated by design. A badge helps someone scan a table; it should not be
 * the loudest thing on the screen. Tone comes from the domain layer so the same
 * status is the same colour everywhere it appears.
 */
export function Badge({
  tone = "neutral",
  variant = "soft",
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & {
  tone?: Tone;
  variant?: "soft" | "outline" | "solid" | "plain";
}) {
  const classes = TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-2xs leading-4 font-medium whitespace-nowrap",
        variant === "soft" && cn(classes.bg, classes.text),
        variant === "outline" && cn("border bg-surface", classes.border, classes.text),
        variant === "solid" && classes.solid,
        variant === "plain" && classes.text,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/** A small filled circle. Reads as a state light next to a label. */
export function Dot({
  tone = "neutral",
  className,
  pulse = false,
}: {
  tone?: Tone;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span className={cn("relative flex size-2 shrink-0", className)}>
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-60",
            TONE_CLASSES[tone].dot,
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex size-2 rounded-full",
          TONE_CLASSES[tone].dot,
        )}
      />
    </span>
  );
}
