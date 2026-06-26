import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-[-0.01em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/35 focus-visible:ring-[3px] active:translate-y-px aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border border-primary/35 bg-[var(--interactive-primary)] text-primary-foreground shadow-[0_10px_28px_color-mix(in_srgb,var(--primary)_24%,transparent)] hover:bg-[var(--interactive-primary-hover)] hover:shadow-[0_12px_32px_color-mix(in_srgb,var(--primary)_32%,transparent)] active:bg-[var(--interactive-primary-active)]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-primary/70 bg-background/25 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-primary hover:bg-[var(--interactive-soft)] active:bg-[var(--interactive-soft-pressed)] dark:bg-background/25 dark:border-primary/70",
        secondary:
          "border border-white/5 bg-secondary text-secondary-foreground shadow-[0_10px_28px_rgba(0,0,0,0.18)] hover:bg-secondary/80",
        ghost:
          "text-muted-foreground hover:bg-[var(--interactive-muted-hover)] hover:text-foreground active:bg-[var(--interactive-soft)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2.5 has-[>svg]:px-3.5",
        sm: "h-9 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-11",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
