import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Ink Navy carries the primary action. The brand reserves Coral for the single
 * CTA on a conversion surface, which this application is not — see the note in
 * globals.css.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-[background-color,border-color,color,box-shadow] duration-100 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-navy-600 text-white shadow-xs hover:bg-navy-700 active:bg-navy-800",
        secondary:
          "border border-line bg-surface text-fg shadow-xs hover:border-line-strong hover:bg-subtle",
        subtle: "bg-subtle text-fg hover:bg-sunken",
        ghost: "text-fg-muted hover:bg-subtle hover:text-fg",
        danger: "bg-critical text-white shadow-xs hover:brightness-95",
        link: "text-teal-700 underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-7 px-2 text-2xs [&_svg]:size-3.5",
        sm: "h-8 px-2.5 text-xs [&_svg]:size-3.5",
        md: "h-9 px-3.5 text-sm [&_svg]:size-4",
        lg: "h-10 px-4 text-base [&_svg]:size-4",
        iconXs: "size-7 [&_svg]:size-3.5",
        iconSm: "size-8 [&_svg]:size-4",
        icon: "size-9 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      // A button inside a form defaults to submit, which is rarely what is
      // meant and silently reloads the page.
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
