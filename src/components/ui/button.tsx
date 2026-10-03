import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-[opacity,transform,background-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-fg hover:opacity-92",
        secondary: "border border-border bg-surface text-ink hover:bg-bg",
        ghost: "text-ink hover:bg-bg",
        outline: "border border-border bg-transparent text-ink hover:bg-surface",
        inverse: "bg-sidebar-fg text-sidebar hover:opacity-92",
        danger: "bg-danger text-primary-fg hover:opacity-92",
      },
      size: {
        default: "h-11 rounded-lg px-4",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-xl px-5",
        icon: "h-11 w-11 rounded-lg",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { buttonVariants };
