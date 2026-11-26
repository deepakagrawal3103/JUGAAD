import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border",
  {
    variants: {
      variant: {
        default: "border-[#E4DFD7] bg-[#F3EFEA] text-[#161616]",
        success: "border-[#C4DACB] bg-[#EDF5F0] text-[#2F5D46]",
        warning: "border-[#E8D5B5] bg-[#FCF7EC] text-[#9A6B1E]",
        danger: "border-[#E6C5C5] bg-[#FDF1F1] text-[#9E2A2B]",
        coral: "border-[#F7C9C3] bg-[#FDECE9] text-[#D94E3D]",
        dark: "border-[#161616] bg-[#161616] text-white",
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
