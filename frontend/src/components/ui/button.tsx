import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2874F0] disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-xs",
  {
    variants: {
      variant: {
        default: "bg-[#2874F0] text-white hover:bg-[#1C5EC9]",
        accent: "bg-[#FB641B] text-white hover:bg-[#E05512]",
        outline: "border border-[#2874F0] bg-white text-[#2874F0] hover:bg-[#EBF2FE]",
        subtle: "border border-[#E0E0E0] bg-white text-[#212121] hover:bg-[#F1F3F6]",
        ghost: "text-[#212121] hover:bg-[#F1F3F6] shadow-none",
        destructive: "bg-[#D32F2F] text-white hover:bg-[#B71C1C]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3.5 text-xs",
        lg: "h-12 px-7 text-sm uppercase tracking-wide",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);
Button.displayName = "Button";
