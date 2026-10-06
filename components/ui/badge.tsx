import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border-2 border-outline px-3 py-0.5 text-sm font-bold", {
  variants: {
    tone: {
      neutral: "bg-accent-soft text-ink",
      success: "bg-success text-white",
      primary: "bg-primary text-primary-fg",
      warn: "bg-danger-bg text-white",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
