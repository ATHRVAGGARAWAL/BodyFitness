import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-[0.06em]",
  {
    variants: {
      variant: {
        neutral: "border-border bg-muted text-muted-foreground",
        brand: "border-transparent bg-brand-soft text-brand",
        success: "border-transparent bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-success",
        warning: "border-transparent bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-warning",
        destructive: "border-transparent bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)] text-destructive",
        outline: "border-border bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
