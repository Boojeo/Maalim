import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[var(--radius-card)] border-[3px] border-outline bg-surface p-5 shadow-hard", className)}
      {...props}
    />
  );
}
