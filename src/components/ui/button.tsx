import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm text-sm font-medium ring-offset-background transition-all duration-200 ease-out active:translate-y-px active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(15,23,42,0.10)] hover:bg-primary/90 hover:shadow-[0_8px_20px_rgba(15,23,42,0.10)]",
        destructive: "bg-destructive text-destructive-foreground shadow-[0_1px_2px_rgba(15,23,42,0.08)] hover:bg-destructive/90 hover:shadow-[0_8px_20px_rgba(220,38,38,0.16)]",
        outline: "border border-input/80 bg-background/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-primary/20 hover:bg-accent/70 hover:text-accent-foreground",
        secondary: "bg-secondary/80 text-secondary-foreground hover:bg-secondary",
        ghost: "hover:bg-accent/70 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5 py-2",
        sm: "h-8 rounded-sm px-3 text-[13px]",
        lg: "h-10 rounded-sm px-5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  }
);
Button.displayName = "Button";

export { buttonVariants };
