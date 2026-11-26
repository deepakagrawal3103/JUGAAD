import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-semibold border",
  {
    variants: {
      variant: {
        default: "border-[#E0E0E0] bg-[#F1F3F6] text-[#212121]",
        success: "border-[#388E3C] bg-[#388E3C] text-white",
        warning: "border-[#FFE0B2] bg-[#FFF3E0] text-[#E65100]",
        danger: "border-[#FFCDD2] bg-[#FFEBEE] text-[#C62828]",
        coral: "border-[#C6DAFC] bg-[#EBF2FE] text-[#2874F0]",
        dark: "border-[#172337] bg-[#172337] text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
