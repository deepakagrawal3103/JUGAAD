import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161616] disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-[#161616] text-[#FAF8F5] hover:bg-[#2E2E2E]",
        accent: "bg-[#EB5E4C] text-white hover:bg-[#D94E3D]",
        outline: "border border-[#161616] bg-transparent text-[#161616] hover:bg-[#161616] hover:text-white",
        subtle: "border border-[#E4DFD7] bg-white text-[#161616] hover:bg-[#F3EFEA]",
        ghost: "text-[#161616] hover:bg-[#F3EFEA]",
        destructive: "bg-[#9E2A2B] text-white hover:bg-[#7F2021]",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-3.5 text-xs",
        lg: "h-12 px-7 text-sm",
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
